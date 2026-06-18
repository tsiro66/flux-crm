<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Pagination } from '$lib/components/ui/pagination';
	import {
		Dialog,
		DialogHeader,
		DialogTitle,
		DialogContent,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { toastSuccess, toastError } from '$lib/stores/toast.svelte';
	import { Search, Plus, FolderOpen } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let search = $state(data.search);
	let showCreateDialog = $state(false);
	let createForm = $state({ name: '', email: '', phone: '', notes: '' });
	let createError = $state('');
	let createLoading = $state(false);

	let sortField = $state<'name' | 'email' | 'projects'>('name');
	let sortDir = $state<'asc' | 'desc'>('asc');

	let filteredClients = $derived(() => {
		let list = [...data.clients];
		list.sort((a, b) => {
			let cmp = 0;
			if (sortField === 'name') cmp = a.name.localeCompare(b.name);
			else if (sortField === 'email') cmp = (a.email || '').localeCompare(b.email || '');
			else if (sortField === 'projects')
				cmp = (data.projectsByClient[a.id] || 0) - (data.projectsByClient[b.id] || 0);
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return list;
	});

	function toggleSort(field: 'name' | 'email' | 'projects') {
		if (sortField === field) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDir = 'asc';
		}
	}

	function handleSearch() {
		goto(`/clients?search=${encodeURIComponent(search)}&page=1`);
	}

	function handlePageChange(page: number) {
		goto(`/clients?search=${encodeURIComponent(data.search)}&page=${page}`);
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		createError = '';
		createLoading = true;

		const res = await fetch('/api/clients', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(createForm)
		});

		createLoading = false;

		if (!res.ok) {
			const err = await res.json();
			createError = typeof err.error === 'string' ? err.error : 'Validation error';
			toastError('Failed to create client');
			return;
		}

		showCreateDialog = false;
		createForm = { name: '', email: '', phone: '', notes: '' };
		invalidateAll();
		toastSuccess('Client created');
	}
</script>

<div class="p-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-2xl font-semibold tracking-tight">Clients</h1>
		<Button onclick={() => (showCreateDialog = true)} class="gap-2">
			<Plus class="h-4 w-4" />
			Add Client
		</Button>
	</div>

	<div class="relative mb-4">
		<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<form onsubmit={handleSearch}>
			<Input
				type="text"
				placeholder="Search by name or email..."
				value={search}
				oninput={(e) => (search = (e.target as HTMLInputElement).value)}
				class="pl-9"
			/>
		</form>
	</div>

	{#if filteredClients().length === 0}
		<div class="py-16 text-center">
			<p class="text-sm text-muted-foreground">
				{data.search
					? 'No clients match your search.'
					: 'No clients yet. Add your first client to get started.'}
			</p>
		</div>
	{:else}
		<div class="rounded-lg border">
			<table class="w-full">
				<thead>
					<tr class="border-b bg-muted/30">
						<th
							class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
							onclick={() => toggleSort('name')}
						>
							Name {sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
						<th
							class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
							onclick={() => toggleSort('email')}
						>
							Email {sortField === 'email' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Phone
						</th>
						<th
							class="cursor-pointer px-4 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
							onclick={() => toggleSort('projects')}
						>
							Projects {sortField === 'projects' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredClients() as client (client.id)}
						<tr
							class="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/50"
							onclick={() => (window.location.href = `/clients/${client.id}`)}
						>
							<td class="px-4 py-3">
								<span class="font-medium hover:underline">{client.name}</span>
							</td>
							<td class="px-4 py-3">
								{#if client.email}
									<span class="text-muted-foreground">{client.email}</span>
								{:else}
									<span class="text-muted-foreground/50">—</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								{#if client.phone}
									<span class="text-muted-foreground">{client.phone}</span>
								{:else}
									<span class="text-muted-foreground/50">—</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-right">
								<span
									class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
								>
									<FolderOpen class="h-3 w-3" />
									{data.projectsByClient[client.id] || 0}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="mt-3 flex items-center justify-between">
			<span class="text-xs text-muted-foreground">
				{data.total} client{data.total !== 1 ? 's' : ''} total
			</span>
			<Pagination page={data.page} totalPages={data.totalPages} onPageChange={handlePageChange} />
		</div>
	{/if}
</div>

<Dialog bind:open={showCreateDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Create Client</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleCreate} class="space-y-4">
			{#if createError}
				<p class="text-sm text-destructive">{createError}</p>
			{/if}
			<div class="space-y-2">
				<Label for="name">Name *</Label>
				<Input id="name" bind:value={createForm.name} placeholder="Client name" required />
			</div>
			<div class="space-y-2">
				<Label for="email">Email</Label>
				<Input
					id="email"
					type="email"
					bind:value={createForm.email}
					placeholder="client@example.com"
				/>
			</div>
			<div class="space-y-2">
				<Label for="phone">Phone</Label>
				<Input id="phone" bind:value={createForm.phone} placeholder="+1 234 567 890" />
			</div>
			<div class="space-y-2">
				<Label for="notes">Notes</Label>
				<Textarea id="notes" bind:value={createForm.notes} placeholder="Additional notes..." />
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showCreateDialog = false)}
					>Cancel</Button
				>
				<Button type="submit" disabled={createLoading}>
					{createLoading ? 'Creating...' : 'Create'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
