<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { createFlueClient } from '@flue/sdk';
	import { supabaseBrowserClient } from '$lib/supabase/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import AppNav from '$lib/components/AppNav.svelte';
	import { toastError } from '$lib/stores/toast.svelte';
	import { stripTags, renderMarkdown } from '$lib/utils/chat';
	import { PUBLIC_FLUE_URL } from '$env/static/public';
	import type { User as SupabaseUser } from '@supabase/supabase-js';
	import {
		Send,
		Loader2,
		Bot,
		User,
		Plus,
		MessageSquare,
		Trash2,
		Menu,
		Square,
		RotateCcw
	} from '@lucide/svelte';

	type Message = { role: 'user' | 'assistant'; content: string; error?: boolean };
	type Conversation = { id: string; title: string; createdAt: string; updatedAt: string };

	let { data }: { data: { userId: string | null; user: SupabaseUser | null } } = $props();

	let conversations: Conversation[] = $state([]);
	let activeConversationId: string | null = $state(null);
	let messages: Message[] = $state([]);
	let input = $state('');
	let loading = $state(false);
	let ready = $state(false);
	let error = $state('');
	let client: ReturnType<typeof createFlueClient> | null = $state(null);
	let messagesEl: HTMLDivElement | undefined = $state();
	let toolStatus = $state<string | null>(null);
	let abortController: AbortController | null = $state(null);
	let sidebarOpen = $state(false);

	onMount(async () => {
		try {
			const {
				data: { session }
			} = await supabaseBrowserClient.auth.getSession();
			if (!session) {
				error = 'Not authenticated';
				return;
			}

			const flueUrl = PUBLIC_FLUE_URL || 'http://localhost:3583';
			client = createFlueClient({
				baseUrl: flueUrl,
				token: session.access_token
			});
			ready = true;

			await loadConversations();
		} catch {
			error = 'Failed to initialize assistant. Make sure the Flue server is running.';
		}
	});

	async function loadConversations() {
		try {
			const res = await fetch('/api/chat');
			if (res.ok) {
				conversations = await res.json();
			}
		} catch {
			// ignore
		}
	}

	async function loadMessages() {
		if (!activeConversationId) {
			messages = [];
			return;
		}
		try {
			const res = await fetch(`/api/chat/${activeConversationId}`);
			if (res.ok) {
				const saved: { role: string; content: string }[] = await res.json();
				messages = saved.map((m) => ({
					role: m.role as 'user' | 'assistant',
					content: m.content
				}));
				await tick();
				scrollToBottom();
			}
		} catch {
			messages = [];
		}
	}

	async function selectConversation(id: string) {
		activeConversationId = id;
		sidebarOpen = false;
		await loadMessages();
	}

	async function createConversation(): Promise<Conversation | null> {
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'New Chat' })
			});
			if (res.ok) {
				const conv: Conversation = await res.json();
				conversations = [conv, ...conversations];
				return conv;
			}
		} catch {
			toastError('Could not create conversation');
		}
		return null;
	}

	async function newChat() {
		const conv = await createConversation();
		if (conv) {
			activeConversationId = conv.id;
			messages = [];
			sidebarOpen = false;
		}
	}

	async function deleteConversation(id: string, e?: MouseEvent) {
		e?.stopPropagation();
		try {
			await fetch(`/api/chat/${id}`, { method: 'DELETE' });
			conversations = conversations.filter((c) => c.id !== id);
			if (activeConversationId === id) {
				activeConversationId = null;
				messages = [];
			}
		} catch {
			toastError('Could not delete conversation');
		}
	}

	async function persistMessage(conversationId: string, role: string, content: string) {
		const res = await fetch(`/api/chat/${conversationId}/messages`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role, content })
		});
		if (!res.ok) throw new Error('Failed to save message');
	}

	async function updateTitle(conversationId: string, title: string) {
		const res = await fetch(`/api/chat/${conversationId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title })
		});
		if (!res.ok) throw new Error('Failed to update title');
		return (await res.json()).title as string;
	}

	function moveToTop(conversationId: string) {
		const active = conversations.find((c) => c.id === conversationId);
		if (active) {
			conversations = [active, ...conversations.filter((c) => c.id !== conversationId)];
		}
	}

	async function sendMessage() {
		if (!input.trim() || !client || loading || !data.userId) return;

		let conversationId = activeConversationId;

		if (!conversationId) {
			const conv = await createConversation();
			if (!conv) return;
			conversationId = conv.id;
			activeConversationId = conv.id;
		}

		const userMessage = input.trim();
		input = '';
		messages = [...messages, { role: 'user', content: userMessage }];
		moveToTop(conversationId!);

		try {
			await persistMessage(conversationId!, 'user', userMessage);
		} catch {
			toastError('Message could not be saved');
		}

		if (messages.filter((m) => m.role === 'user').length === 1) {
			try {
				const title = await updateTitle(conversationId!, userMessage.slice(0, 50));
				conversations = conversations.map((c) => (c.id === conversationId ? { ...c, title } : c));
			} catch {
				// non-critical
			}
		}

		await runStream(userMessage, conversationId!);
	}

	async function runStream(userMessage: string, conversationId: string) {
		if (!client || !data.userId) return;

		abortController = new AbortController();
		loading = true;
		toolStatus = null;

		messages = [...messages, { role: 'assistant', content: '' }];

		let text = '';

		try {
			const stream = client.agents.invoke('crm-assistant', data.userId, {
				mode: 'stream',
				signal: abortController.signal,
				payload: { message: userMessage }
			});

			for await (const event of stream) {
				if (event.type === 'text_delta') {
					text += event.text;
					messages[messages.length - 1].content = stripTags(text);
				} else if (event.type === 'tool_start') {
					toolStatus = `Using ${event.toolName.replace(/_/g, ' ')}…`;
				} else if (event.type === 'tool_call') {
					toolStatus = null;
				}
			}

			if (text) {
				try {
					await persistMessage(conversationId, 'assistant', stripTags(text));
				} catch {
					toastError('Assistant reply could not be saved');
				}
			}
		} catch {
			if (abortController?.signal.aborted) {
				if (text) {
					try {
						await persistMessage(conversationId, 'assistant', stripTags(text));
					} catch {
						// best-effort
					}
				}
			} else {
				messages[messages.length - 1] = {
					role: 'assistant',
					content: 'Sorry, something went wrong. Please try again.',
					error: true
				};
			}
		} finally {
			loading = false;
			toolStatus = null;
			abortController = null;
			await tick();
			scrollToBottom();
		}
	}

	async function regenerate() {
		if (loading || !activeConversationId) return;

		let lastUserIdx = -1;
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role === 'user') {
				lastUserIdx = i;
				break;
			}
		}
		if (lastUserIdx === -1) return;

		const lastUserMessage = messages[lastUserIdx].content;
		messages = messages.slice(0, lastUserIdx + 1);
		await runStream(lastUserMessage, activeConversationId);
	}

	function stopStreaming() {
		abortController?.abort();
	}

	function scrollToBottom() {
		if (messagesEl) {
			messagesEl.scrollTop = messagesEl.scrollHeight;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	let activeTitle = $derived(
		activeConversationId
			? conversations.find((c) => c.id === activeConversationId)?.title || 'Chat'
			: 'New conversation'
	);
</script>

<div class="flex h-full">
	{#if sidebarOpen}
		<div
			class="fixed inset-0 z-30 bg-black/50 md:hidden"
			onclick={() => (sidebarOpen = false)}
			onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
			role="button"
			tabindex="-1"
		></div>
	{/if}

	<div
		class="fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r bg-background transition-transform md:relative md:translate-x-0 {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
	>
		<AppNav user={data.user} compact>
			<div class="flex h-full flex-col">
				<div class="border-b p-3">
					<Button variant="outline" size="sm" class="w-full" onclick={newChat}>
						<Plus class="mr-1 h-3.5 w-3.5" />
						New Chat
					</Button>
				</div>
				<div class="flex-1 overflow-y-auto p-2">
					{#each conversations as conv (conv.id)}
						<div
							class="group mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted {activeConversationId ===
							conv.id
								? 'bg-muted font-medium'
								: 'text-muted-foreground'}"
							role="button"
							tabindex="0"
							onclick={() => selectConversation(conv.id)}
							onkeydown={(e) => e.key === 'Enter' && selectConversation(conv.id)}
						>
							<span class="truncate">{conv.title}</span>
							<button
								class="ml-1 shrink-0 opacity-0 group-hover:opacity-100"
								onclick={(e) => deleteConversation(conv.id, e)}
								aria-label="Delete conversation"
							>
								<Trash2 class="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
							</button>
						</div>
					{:else}
						<div class="px-2.5 py-4 text-center text-xs text-muted-foreground">
							No conversations yet
						</div>
					{/each}
				</div>
			</div>
		</AppNav>
	</div>

	<div class="flex flex-1 flex-col overflow-hidden">
		{#if error}
			<div class="flex flex-1 items-center justify-center">
				<div
					class="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{error}
				</div>
			</div>
		{:else if !ready}
			<div class="flex flex-1 items-center justify-center">
				<div class="flex items-center gap-2 text-muted-foreground">
					<Loader2 class="h-4 w-4 animate-spin" />
					Initializing...
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-3 border-b px-5 py-3">
				<button
					class="text-muted-foreground hover:text-foreground md:hidden"
					onclick={() => (sidebarOpen = true)}
					aria-label="Open sidebar"
				>
					<Menu class="h-5 w-5" />
				</button>
				<h2 class="truncate text-lg font-medium">{activeTitle}</h2>
			</div>

			<div bind:this={messagesEl} class="flex-1 overflow-y-auto bg-muted/30 p-5">
				{#if !activeConversationId && messages.length === 0}
					<div class="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
						<MessageSquare class="h-10 w-10" />
						<p class="text-sm">Ask me about your clients and projects</p>
					</div>
				{:else if messages.length === 0}
					<div class="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
						<Bot class="h-8 w-8" />
						<p class="text-sm">Ask me about your clients and projects</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each messages as message, i (i)}
							{#if message.role === 'assistant' && message.content === '' && loading && i === messages.length - 1}
								<div class="flex gap-3">
									<div
										class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted"
									>
										<Bot class="h-4 w-4" />
									</div>
									<div
										class="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground"
									>
										{#if toolStatus}
											<Loader2 class="h-3 w-3 animate-spin" />
											<span>{toolStatus}</span>
										{:else}
											<span class="animate-pulse">Thinking...</span>
										{/if}
									</div>
								</div>
							{:else}
								<div class="flex gap-3 {message.role === 'user' ? 'flex-row-reverse' : ''}">
									<div
										class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full {message.role ===
										'user'
											? 'bg-primary text-primary-foreground'
											: 'bg-muted'}"
									>
										{#if message.role === 'user'}
											<User class="h-4 w-4" />
										{:else}
											<Bot class="h-4 w-4" />
										{/if}
									</div>
									<div
										class="max-w-[80%] rounded-lg px-3 py-2 text-sm {message.role === 'assistant'
											? 'bg-background'
											: 'bg-primary text-primary-foreground'} {message.error
											? 'border border-destructive/50 bg-destructive/10 text-destructive'
											: ''}"
									>
										{#if message.role === 'assistant' && !message.error}
											<div class="prose prose-sm max-w-none">
												<!-- eslint-disable-next-line svelte/no-at-html-tags -->
												{@html renderMarkdown(message.content)}
											</div>
										{:else}
											{message.content}
										{/if}
										{#if message.error}
											<button
												class="ml-2 inline-flex items-center gap-1 text-xs font-medium underline"
												onclick={regenerate}
											>
												<RotateCcw class="h-3 w-3" />
												Retry
											</button>
										{/if}
									</div>
								</div>
								{#if message.role === 'assistant' && !message.error && message.content !== '' && i === messages.length - 1 && !loading}
									<div class="flex gap-3 pl-11">
										<button
											class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
											onclick={regenerate}
										>
											<RotateCcw class="h-3 w-3" />
											Regenerate
										</button>
									</div>
								{/if}
							{/if}
						{/each}
					</div>
				{/if}
			</div>

			<div class="border-t bg-background p-4">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						sendMessage();
					}}
				>
					<div class="flex gap-2">
						<Input
							bind:value={input}
							placeholder="Ask about your clients and projects..."
							disabled={loading}
							onkeydown={handleKeydown}
							class="flex-1"
						/>
						{#if loading}
							<Button type="button" variant="destructive" onclick={stopStreaming}>
								<Square class="h-4 w-4" />
							</Button>
						{:else}
							<Button type="submit" disabled={!input.trim()}>
								<Send class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>
