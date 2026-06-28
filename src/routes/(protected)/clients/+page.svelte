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
	import { ImportDialog, ExportDialog } from '$lib/components/client';
	import { Search, Plus, FolderOpen, Upload, Download } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let search = $state(data.search);
	$effect(() => {
		search = data.search;
	});
	let showCreateDialog = $state(false);
	let showImportDialog = $state(false);
	let showExportDialog = $state(false);
	let createForm = $state({ name: '', email: '', phone: '', notes: '' });
	let createError = $state('');
	let createLoading = $state(false);

	// svelte-ignore state_referenced_locally
	let sortField = $state<'name' | 'email' | 'projects'>(data.sortField);
	// svelte-ignore state_referenced_locally
	let sortDir = $state<'asc' | 'desc'>(data.sortDir);
	$effect(() => {
		sortField = data.sortField;
		sortDir = data.sortDir;
	});

	// Server-side sort covers the full result set (see +page.server.ts). Sort
	// is reflected in the URL so it survives pagination/back-and-forward.
	function toggleSort(field: 'name' | 'email' | 'projects') {
		let nextDir: 'asc' | 'desc';
		let nextField: 'name' | 'email' | 'projects';
		if (sortField === field) {
			nextField = sortField;
			nextDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			nextField = field;
			nextDir = 'asc';
		}
		goto(
			`/clients?search=${encodeURIComponent(data.search)}&page=1&sort=${nextField}&dir=${nextDir}`
		);
	}

	function handleSearch(e: Event) {
		e.preventDefault();
		goto(`/clients?search=${encodeURIComponent(search)}&page=1&sort=${data.sortField}&dir=${data.sortDir}`);
	}

	function handlePageChange(page: number) {
		goto(
			`/clients?search=${encodeURIComponent(data.search)}&page=${page}&sort=${data.sortField}&dir=${data.sortDir}`
		);
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
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={() => (showImportDialog = true)} class="gap-2">
				<Upload class="h-4 w-4" />
				Import
			</Button>
			<Button variant="outline" onclick={() => (showExportDialog = true)} class="gap-2">
				<Download class="h-4 w-4" />
				Export
			</Button>
			<Button onclick={() => (showCreateDialog = true)} class="gap-2">
				<Plus class="h-4 w-4" />
				Add Client
			</Button>
		</div>
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

	{#if data.clients.length === 0}
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
					{#each data.clients as client (client.id)}
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

<ImportDialog bind:open={showImportDialog} />
<ExportDialog bind:open={showExportDialog} />
