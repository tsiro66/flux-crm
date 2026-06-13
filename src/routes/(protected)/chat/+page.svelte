<script lang="ts">
	import { onMount } from 'svelte';
	import { createFlueClient } from '@flue/sdk';
	import { supabaseBrowserClient } from '$lib/supabase/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { PUBLIC_FLUE_URL } from '$env/static/public';
	import { Send, Loader2, Bot, User, Plus, MessageSquare, Trash2 } from '@lucide/svelte';

	type Message = { role: 'user' | 'assistant'; content: string };
	type Conversation = { id: string; title: string; createdAt: string; updatedAt: string };

	let { data }: { data: { userId: string } } = $props();

	let conversations: Conversation[] = $state([]);
	let activeConversationId: string | null = $state(null);
	let messages: Message[] = $state([]);
	let input = $state('');
	let loading = $state(false);
	let ready = $state(false);
	let error = $state('');
	let client: ReturnType<typeof createFlueClient> | null = $state(null);
	let accessToken = $state('');
	let messagesEl: HTMLDivElement | undefined = $state();

	onMount(async () => {
		try {
			const {
				data: { session }
			} = await supabaseBrowserClient.auth.getSession();
			if (!session) {
				error = 'Not authenticated';
				return;
			}

			accessToken = session.access_token;
			const flueUrl = PUBLIC_FLUE_URL || 'http://localhost:3583';

			client = createFlueClient({
				baseUrl: flueUrl,
				token: accessToken
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
				messages = saved.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
				await tick();
				scrollToBottom();
			}
		} catch {
			messages = [];
		}
	}

	async function selectConversation(id: string) {
		activeConversationId = id;
		await loadMessages();
	}

	async function newChat() {
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'New Chat' })
			});
			if (res.ok) {
				const conv: Conversation = await res.json();
				conversations = [conv, ...conversations];
				activeConversationId = conv.id;
				messages = [];
			}
		} catch {
			// ignore
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
			// ignore
		}
	}

	async function sendMessage() {
		if (!input.trim() || !client || loading) return;

		if (!activeConversationId) {
			await newChat();
			if (!activeConversationId) return;
		}

		const userId = data.userId;
		const userMessage = input.trim();
		messages = [...messages, { role: 'user', content: userMessage }];
		input = '';
		loading = true;

		fetch(`/api/chat/${activeConversationId}/messages`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role: 'user', content: userMessage })
		}).catch(() => {});

		if (messages.length === 1) {
			const title = userMessage.slice(0, 50);
			fetch(`/api/chat/${activeConversationId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title })
			})
				.then(async (res) => {
					if (res.ok) {
						const updated = await res.json();
						conversations = conversations.map((c) =>
							c.id === activeConversationId ? { ...c, title: updated.title } : c
						);
					}
				})
				.catch(() => {});
		}

		try {
			const response = await client.agents.invoke('crm-assistant', userId, {
				mode: 'sync',
				payload: { message: userMessage }
			});

			let text: string;
			if (typeof response.result === 'string') {
				text = response.result;
			} else if (
				response.result &&
				typeof response.result === 'object' &&
				'text' in (response.result as Record<string, unknown>)
			) {
				text = String((response.result as Record<string, unknown>).text);
			} else {
				text = JSON.stringify(response.result, null, 2);
			}

			text = text
				.replace(/<function\/?\w+>/g, '')
				.replace(/<\/function>/g, '')
				.trim();
			messages = [...messages, { role: 'assistant', content: text }];

			fetch(`/api/chat/${activeConversationId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'assistant', content: text })
			}).catch(() => {});
		} catch {
			messages = [
				...messages,
				{ role: 'assistant' as const, content: 'Sorry, something went wrong. Please try again.' }
			];
		} finally {
			loading = false;
			await tick();
			scrollToBottom();
		}
	}

	async function tick() {
		await new Promise((resolve) => setTimeout(resolve, 0));
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
</script>

<div class="flex h-full">
	<div class="flex w-64 shrink-0 flex-col border-r bg-background">
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

	<div class="flex flex-1 flex-col">
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
			<div class="border-b px-5 py-3">
				<h2 class="text-lg font-medium">
					{activeConversationId
						? conversations.find((c) => c.id === activeConversationId)?.title || 'Chat'
						: 'Select or start a chat'}
				</h2>
			</div>

			<div bind:this={messagesEl} class="flex-1 overflow-y-auto bg-muted/30 p-5">
				{#if !activeConversationId}
					<div class="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
						<MessageSquare class="h-10 w-10" />
						<p class="text-sm">Start a new chat or select an existing one</p>
						<Button variant="outline" size="sm" onclick={newChat}>
							<Plus class="mr-1 h-3.5 w-3.5" />
							New Chat
						</Button>
					</div>
				{:else if messages.length === 0}
					<div class="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
						<Bot class="h-8 w-8" />
						<p class="text-sm">Ask me about your clients and projects</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each messages as message, i (i)}
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
										: 'bg-primary text-primary-foreground'}"
								>
									{message.content}
								</div>
							</div>
						{/each}
						{#if loading}
							<div class="flex gap-3">
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted"
								>
									<Bot class="h-4 w-4" />
								</div>
								<div class="rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground">
									<span class="animate-pulse">Thinking...</span>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			{#if activeConversationId}
				<form
					class="border-t bg-background p-4"
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
						<Button type="submit" disabled={loading || !input.trim()}>
							{#if loading}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else}
								<Send class="h-4 w-4" />
							{/if}
						</Button>
					</div>
				</form>
			{/if}
		{/if}
	</div>
</div>
