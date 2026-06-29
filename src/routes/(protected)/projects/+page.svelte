<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Pagination } from '$lib/components/ui/pagination';
	import {
		invoiceStatusLabels,
		invoiceStatusVariants,
		paymentStatusLabels,
		paymentStatusVariants,
		formatCurrency,
		formatDate,
		type InvoiceStatus,
		type PaymentStatus
	} from '$lib/utils';
	import type { PageData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';
	import { toastSuccess, toastError } from '$lib/stores/toast.svelte';
	import { ImportDialog, ExportDialog, DeleteConfirmDialog, ProjectFormDialog } from '$lib/components/client';
	import { Search, Plus, Upload, Download, Trash2, X } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	type SortField = 'title' | 'client' | 'total' | 'remaining' | 'date';

	type ProjectRow = {
		id: string;
		title: string;
		clientId: string;
		totalAmount: number;
		paidAmount: number;
		invoiceStatus: InvoiceStatus;
		paymentStatus: PaymentStatus;
		date: Date | null;
		clientName: string;
	};

	// svelte-ignore state_referenced_locally
	let search = $state(data.search);
	$effect(() => {
		search = data.search;
	});

	// svelte-ignore state_referenced_locally
	let sortField = $state<SortField>(data.filters.sort);
	// svelte-ignore state_referenced_locally
	let sortDir = $state<'asc' | 'desc'>(data.filters.dir);
	$effect(() => {
		sortField = data.filters.sort;
		sortDir = data.filters.dir;
	});

	let showCreateDialog = $state(false);
	let showImportDialog = $state(false);
	let showExportDialog = $state(false);

	let selectedIds = $state<Set<string>>(new Set());
	let showBulkDeleteDialog = $state(false);
	let bulkDeleteLoading = $state(false);

	// True when any filter/search narrows the result set — drives the "Clear"
	// affordance next to the filters.
	let hasFilters = $derived(
		!!data.search || !!data.filters.invoice || !!data.filters.payment
	);

	// Build a /projects URL from the current filter state with overrides for one
	// field at a time. Keeps every goto consistent and resets to page 1 on any
	// filter/sort change (same UX as the clients page).
	function buildUrl(
		overrides: Partial<{
			search: string;
			invoice: string;
			payment: string;
			sort: SortField;
			dir: 'asc' | 'desc';
			page: number;
		}> = {}
	): string {
		const f = data.filters;
		const next = {
			search: overrides.search ?? data.search,
			invoice: overrides.invoice ?? (f.invoice ?? ''),
			payment: overrides.payment ?? (f.payment ?? ''),
			sort: overrides.sort ?? f.sort,
			dir: overrides.dir ?? f.dir,
			page: overrides.page ?? data.page
		};
		const params = new URLSearchParams();
		if (next.search) params.set('search', next.search);
		if (next.invoice) params.set('invoice', next.invoice);
		if (next.payment) params.set('payment', next.payment);
		params.set('sort', next.sort);
		params.set('dir', next.dir);
		if (next.page !== 1) params.set('page', String(next.page));
		const qs = params.toString();
		return qs ? `/projects?${qs}` : '/projects';
	}

	function toggleSort(field: SortField) {
		let nextDir: 'asc' | 'desc';
		let nextField: SortField;
		if (sortField === field) {
			nextField = sortField;
			nextDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			nextField = field;
			nextDir = field === 'remaining' ? 'desc' : 'asc';
		}
		goto(buildUrl({ sort: nextField, dir: nextDir, page: 1 }));
	}

	function handleSearch(e: Event) {
		e.preventDefault();
		goto(buildUrl({ search, page: 1 }));
	}

	function setFilter(key: 'invoice' | 'payment', value: string) {
		goto(buildUrl({ [key]: value, page: 1 }));
	}

	function clearFilters() {
		goto('/projects');
	}

	function handlePageChange(page: number) {
		goto(buildUrl({ page }));
	}

	// Selection is scoped to the loaded page: navigating/filtering resets it so a
	// user can't accidentally delete rows they can no longer see.
	$effect(() => {
		void data.projects;
		selectedIds = new Set();
	});

	let allOnPageSelected = $derived(
		data.projects.length > 0 && data.projects.every((p) => selectedIds.has(p.id))
	);
	let someSelected = $derived(selectedIds.size > 0);

	function toggleRow(projectId: string) {
		selectedIds = new Set(selectedIds);
		if (selectedIds.has(projectId)) selectedIds.delete(projectId);
		else selectedIds.add(projectId);
	}

	function toggleAllOnPage() {
		const next = new Set(selectedIds);
		if (allOnPageSelected) {
			for (const p of data.projects) next.delete(p.id);
		} else {
			for (const p of data.projects) next.add(p.id);
		}
		selectedIds = next;
	}

	async function handleBulkDelete() {
		if (selectedIds.size === 0) return;
		bulkDeleteLoading = true;
		const ids = [...selectedIds];
		const res = await fetch('/api/projects/bulk-delete', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids })
		});
		bulkDeleteLoading = false;
		if (!res.ok) {
			const err = await res.json();
			toastError(typeof err.error === 'string' ? err.error : 'Failed to delete projects');
			showBulkDeleteDialog = false;
			return;
		}
		const { count } = await res.json();
		showBulkDeleteDialog = false;
		selectedIds = new Set();
		invalidateAll();
		toastSuccess(`Deleted ${count} project${count !== 1 ? 's' : ''}`);
	}

	function remaining(project: ProjectRow): number {
		return project.totalAmount - project.paidAmount;
	}

	function paidPct(project: ProjectRow): number {
		return project.totalAmount > 0
			? Math.min((project.paidAmount / project.totalAmount) * 100, 100)
			: 0;
	}
</script>

<div class="p-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-2xl font-semibold tracking-tight">Projects</h1>
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
				Add Project
			</Button>
		</div>
	</div>

	{#if someSelected}
		<div class="mb-3 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
			<span class="text-sm font-medium">
				{selectedIds.size} project{selectedIds.size !== 1 ? 's' : ''} selected
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

	<!-- Filters row: status selects + clear -->
	<div class="mb-3 flex flex-wrap items-center gap-2">
		<select
			class="h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
			value={data.filters.invoice ?? ''}
			onchange={(e) => setFilter('invoice', (e.target as HTMLSelectElement).value)}
			aria-label="Filter by invoice status"
		>
			<option value="">All invoice statuses</option>
			<option value="for_invoice">For Invoice</option>
			<option value="invoiced">Invoiced</option>
			<option value="no_invoice">No Invoice</option>
		</select>

		<select
			class="h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
			value={data.filters.payment ?? ''}
			onchange={(e) => setFilter('payment', (e.target as HTMLSelectElement).value)}
			aria-label="Filter by payment status"
		>
			<option value="">All payment statuses</option>
			<option value="not_paid">Not Paid</option>
			<option value="partial_payment">Partial Payment</option>
			<option value="paid">Paid</option>
		</select>

		{#if hasFilters}
			<Button variant="ghost" size="sm" onclick={clearFilters} class="gap-1.5 text-muted-foreground">
				<X class="h-3.5 w-3.5" />
				Clear filters
			</Button>
		{/if}
	</div>

	<!-- Search row (separate from filters) -->
	<div class="relative mb-4">
		<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<form onsubmit={handleSearch}>
			<Input
				type="text"
				placeholder="Search by title or client..."
				value={search}
				oninput={(e) => (search = (e.target as HTMLInputElement).value)}
				class="pl-9"
			/>
		</form>
	</div>

	{#if data.projects.length === 0}
		<div class="py-16 text-center">
			<p class="text-sm text-muted-foreground">
				{hasFilters
					? 'No projects match your filters.'
					: 'No projects yet. Add your first project to get started.'}
			</p>
			{#if !hasFilters}
				<Button onclick={() => (showCreateDialog = true)} class="mt-4 gap-2">
					<Plus class="h-4 w-4" />
					Add Project
				</Button>
			{/if}
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border">
			<table class="w-full min-w-[64rem]">
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
							onclick={() => toggleSort('client')}
						>
							Client {sortField === 'client' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
						<th
							class="cursor-pointer px-4 py-2.5 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
							onclick={() => toggleSort('title')}
						>
							Title {sortField === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
						<th
							class="cursor-pointer px-4 py-2.5 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
							onclick={() => toggleSort('date')}
						>
							Date {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
						<th class="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
							Invoice
						</th>
						<th class="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
							Payment
						</th>
						<th
							class="cursor-pointer px-4 py-2.5 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
							onclick={() => toggleSort('total')}
						>
							Total {sortField === 'total' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
						<th
							class="cursor-pointer px-4 py-2.5 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
							onclick={() => toggleSort('remaining')}
						>
							Remaining {sortField === 'remaining' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
						</th>
					</tr>
				</thead>
				<tbody>
					{#each data.projects as project (project.id)}
						<tr
							class="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/50"
							onclick={() => goto(`/projects/${project.id}`)}
						>
							<td class="px-4 py-2" onclick={(e) => e.stopPropagation()}>
								<input
									type="checkbox"
									class="h-4 w-4 cursor-pointer rounded border-input accent-primary"
									checked={selectedIds.has(project.id)}
									onclick={() => toggleRow(project.id)}
									onkeydown={(e) =>
										e.key === ' ' && (e.preventDefault(), toggleRow(project.id))}
									aria-label="Select {project.title}"
								/>
							</td>
							<td class="px-4 py-2">
								<a
									href={`/clients/${project.clientId}`}
									class="font-medium hover:underline"
									onclick={(e) => e.stopPropagation()}
								>
									{project.clientName}
								</a>
							</td>
							<td class="px-4 py-2">
								<span class="font-medium">{project.title}</span>
							</td>
							<td class="px-4 py-2">
								{#if project.date}
									<span class="text-muted-foreground">{formatDate(project.date)}</span>
								{:else}
									<span class="text-muted-foreground/50">—</span>
								{/if}
							</td>
							<td class="px-4 py-2" onclick={(e) => e.stopPropagation()}>
								<button
									type="button"
									class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 {invoiceStatusVariants[project.invoiceStatus]}"
									onclick={() => setFilter('invoice', project.invoiceStatus)}
									title="Filter by this invoice status"
								>
									{invoiceStatusLabels[project.invoiceStatus]}
								</button>
							</td>
							<td class="px-4 py-2" onclick={(e) => e.stopPropagation()}>
								<button
									type="button"
									class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 {paymentStatusVariants[project.paymentStatus]}"
									onclick={() => setFilter('payment', project.paymentStatus)}
									title="Filter by this payment status"
								>
									{paymentStatusLabels[project.paymentStatus]}
								</button>
							</td>
							<td class="px-4 py-2 text-right font-medium">
								{formatCurrency(project.totalAmount)}
							</td>
							<td class="px-4 py-2 text-right">
								<div class="flex flex-col items-end gap-1">
									<span class="font-medium {remaining(project) > 0 ? 'text-destructive' : 'text-green-600'}">
										{formatCurrency(remaining(project))}
									</span>
									{#if project.totalAmount > 0}
										<div class="h-1 w-16 overflow-hidden rounded-full bg-muted">
											<div
												class="h-full rounded-full bg-green-600"
												style="width: {paidPct(project)}%"
											></div>
										</div>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<span class="text-xs text-muted-foreground">
				{data.total} project{data.total !== 1 ? 's' : ''} total
				· {formatCurrency(data.totalAmountSum)}
				· <span class="font-medium text-destructive">{formatCurrency(data.outstandingSum)} outstanding</span>
			</span>
			<Pagination page={data.page} totalPages={data.totalPages} onPageChange={handlePageChange} />
		</div>
	{/if}
</div>

<ProjectFormDialog bind:open={showCreateDialog} clients={data.clients} project={null} />

<ImportDialog bind:open={showImportDialog} initialMode="projects" />
<ExportDialog bind:open={showExportDialog} />

<DeleteConfirmDialog
	bind:open={showBulkDeleteDialog}
	title="Delete {selectedIds.size} project{selectedIds.size !== 1 ? 's' : ''}?"
	description="This will permanently delete the selected projects along with all their payments. This action cannot be undone."
	loading={bulkDeleteLoading}
	onConfirm={handleBulkDelete}
/>
