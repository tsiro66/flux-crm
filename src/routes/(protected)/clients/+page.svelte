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
	import { ImportDialog, ExportDialog, DeleteConfirmDialog } from '$lib/components/client';
	import { Search, Plus, FolderOpen, Upload, Download, Trash2, X } from '@lucide/svelte';
	import { ignoreDragClick } from '$lib/actions';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let search = $state(data.search);
	$effect(() => {
		search = data.search;
	});
	let showCreateDialog = $state(false);
	let showImportDialog = $state(false);
	let showExportDialog = $state(false);
	let selectedIds = $state<Set<string>>(new Set());
	let showBulkDeleteDialog = $state(false);
	let bulkDeleteLoading = $state(false);
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

	function clearSearch() {
		goto(`/clients?search=&page=1&sort=${data.sortField}&dir=${data.sortDir}`);
	}

	// Selection is scoped to the loaded page: navigating/searching resets it so a
	// user can't accidentally delete rows they can no longer see.
	$effect(() => {
		void data.clients;
		selectedIds = new Set();
	});

	let allOnPageSelected = $derived(
		data.clients.length > 0 && data.clients.every((c) => selectedIds.has(c.id))
	);
	let someSelected = $derived(selectedIds.size > 0);

	function toggleRow(clientId: string) {
		selectedIds = new Set(selectedIds);
		if (selectedIds.has(clientId)) selectedIds.delete(clientId);
		else selectedIds.add(clientId);
	}

	function toggleAllOnPage() {
		const next = new Set(selectedIds);
		if (allOnPageSelected) {
			for (const c of data.clients) next.delete(c.id);
		} else {
			for (const c of data.clients) next.add(c.id);
		}
		selectedIds = next;
	}

	async function handleBulkDelete() {
		if (selectedIds.size === 0) return;
		bulkDeleteLoading = true;
		const ids = [...selectedIds];
		const res = await fetch('/api/clients/bulk-delete', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids })
		});
		bulkDeleteLoading = false;
		if (!res.ok) {
			const err = await res.json();
			toastError(typeof err.error === 'string' ? err.error : 'Failed to delete clients');
			showBulkDeleteDialog = false;
			return;
		}
		const { count } = await res.json();
		showBulkDeleteDialog = false;
		selectedIds = new Set();
		invalidateAll();
		toastSuccess(`Deleted ${count} client${count !== 1 ? 's' : ''}`);
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

	{#if someSelected}
		<div class="mb-3 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
			<span class="text-sm font-medium">
				{selectedIds.size} client{selectedIds.size !== 1 ? 's' : ''} selected
			</span>
			<Button variant="outline" size="sm" onclick={() => (selectedIds = new Set())}>
				Clear
			</Button>
			<Button variant="destructive" size="sm" class="gap-1.5" onclick={() => (showBulkDeleteDialog = true)}>
				<Trash2 class="h-4 w-4" />
				Delete selected
			</Button>
		</div>
	{/if}

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
			{#if !data.search}
				<Button onclick={() => (showCreateDialog = true)} class="mt-4 gap-2">
					<Plus class="h-4 w-4" />
					Add Client
				</Button>
			{/if}
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border">
			<table class="w-full min-w-[48rem]">
				<thead class="sticky top-0 z-10">
					<tr class="border-b bg-muted/95 backdrop-blur">
						<th class="w-10 px-4 py-2.5">
							<input
								type="checkbox"
								class="h-4 w-4 cursor-pointer rounded border-input accent-primary"
								checked={allOnPageSelected}
								indeterminate={someSelected && !allOnPageSelected}
								onclick={toggleAllOnPage}
								onkeydown={(e) =>
									e.key === ' ' && (e.preventDefault(), toggleAllOnPage())}
								aria-label="Select all on page"
							/>
						</th>
						<th
							class="cursor-pointer px-4 py-2.5 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
							onclick={() => toggleSort('name')}
						>
							Name {sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
						<th
							class="cursor-pointer px-4 py-2.5 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
							onclick={() => toggleSort('email')}
						>
							Email {sortField === 'email' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
						<th
							class="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Phone
						</th>
						<th
							class="cursor-pointer px-4 py-2.5 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
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
							use:ignoreDragClick
							onclick={() => goto(`/clients/${client.id}`)}
						>
							<td class="px-4 py-2" onclick={(e) => e.stopPropagation()}>
								<input
									type="checkbox"
									class="h-4 w-4 cursor-pointer rounded border-input accent-primary"
									checked={selectedIds.has(client.id)}
									onclick={() => toggleRow(client.id)}
									onkeydown={(e) =>
										e.key === ' ' && (e.preventDefault(), toggleRow(client.id))}
									aria-label={`Select ${client.name}`}
								/>
							</td>
							<td class="px-4 py-2">
								<span class="font-medium hover:underline">{client.name}</span>
							</td>
							<td class="px-4 py-2">
								{#if client.email}
									<span class="text-muted-foreground">{client.email}</span>
								{:else}
									<span class="text-muted-foreground/50">—</span>
								{/if}
							</td>
							<td class="px-4 py-2">
								{#if client.phone}
									<span class="text-muted-foreground">{client.phone}</span>
								{:else}
									<span class="text-muted-foreground/50">—</span>
								{/if}
							</td>
							<td class="px-4 py-2.5 text-right">
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

<DeleteConfirmDialog
	bind:open={showBulkDeleteDialog}
	title="Delete {selectedIds.size} client{selectedIds.size !== 1 ? 's' : ''}?"
	description="This will permanently delete the selected clients along with all their projects, payments, and files. This action cannot be undone."
	loading={bulkDeleteLoading}
	onConfirm={handleBulkDelete}
/>
