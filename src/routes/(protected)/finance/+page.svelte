<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { formatCurrency, invoiceStatusVariants, paymentStatusVariants } from '$lib/utils';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { GripVertical } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	type Project = (typeof data.projects)[number];

	let draggedProjectId = $state<string | null>(null);

	const invoiceColumns = [
		{ key: 'for_invoice', label: 'For Invoice' },
		{ key: 'invoiced', label: 'Invoiced' },
		{ key: 'no_invoice', label: 'No Invoice' }
	] as const;

	const paymentColumns = [
		{ key: 'not_paid', label: 'Not Paid' },
		{ key: 'partial_payment', label: 'Partial Payment' },
		{ key: 'paid', label: 'Paid' }
	] as const;

	function filterByInvoiceStatus(status: string): Project[] {
		return data.projects.filter((p) => p.invoiceStatus === status);
	}

	function filterByPaymentStatus(status: string): Project[] {
		return data.projects.filter((p) => p.paymentStatus === status);
	}

	function handleDragStart(projectId: string) {
		draggedProjectId = projectId;
	}

	async function handleDropInvoice(status: string) {
		if (!draggedProjectId) return;

		await fetch(`/api/projects/${draggedProjectId}/status`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ invoiceStatus: status })
		});

		draggedProjectId = null;
		invalidateAll();
	}

	async function handleDropPayment(status: string) {
		if (!draggedProjectId) return;

		await fetch(`/api/projects/${draggedProjectId}/status`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ paymentStatus: status })
		});

		draggedProjectId = null;
		invalidateAll();
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}
</script>

<div class="p-8">
	<h1 class="mb-8 text-2xl font-semibold tracking-tight">Finance</h1>

	<div class="mb-10">
		<h2 class="mb-4 text-xs font-medium tracking-wider text-muted-foreground uppercase">
			Invoice Status
		</h2>
		<div class="grid grid-cols-3 gap-4">
			{#each invoiceColumns as column (column.key)}
				<div
					class="min-h-[200px] rounded-lg border bg-muted/30 p-4 transition-colors"
					ondragover={handleDragOver}
					ondrop={() => handleDropInvoice(column.key)}
					role="region"
					aria-label={column.label}
				>
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-sm font-medium">{column.label}</h3>
						<span
							class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground"
						>
							{filterByInvoiceStatus(column.key).length}
						</span>
					</div>
					<div class="space-y-1.5">
						{#each filterByInvoiceStatus(column.key) as project (project.id)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								draggable="true"
								ondragstart={() => handleDragStart(project.id)}
								class="cursor-grab rounded-md border bg-background px-3 py-2.5 shadow-sm transition-all hover:shadow-md active:cursor-grabbing"
							>
								<div class="flex items-center gap-2">
									<GripVertical class="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">
											{data.clientMap[project.clientId] || 'Unknown'}
										</p>
										<p class="truncate text-xs text-muted-foreground">{project.title}</p>
									</div>
								</div>
								<div class="mt-1.5 flex items-center justify-between pl-5.5">
									<span class="text-sm font-medium">{formatCurrency(project.totalAmount)}</span>
									<Badge class={paymentStatusVariants[project.paymentStatus]}>
										{#if project.paymentStatus === 'not_paid'}
											Not Paid
										{:else if project.paymentStatus === 'partial_payment'}
											Partial
										{:else}
											Paid
										{/if}
									</Badge>
								</div>
								{#if project.totalAmount > 0}
									<div class="mt-1.5 pl-5.5">
										<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
											<div
												class="h-full rounded-full bg-green-600 transition-all"
												style="width: {Math.min(
													(project.paidAmount / project.totalAmount) * 100,
													100
												)}%"
											></div>
										</div>
										<div class="mt-0.5 text-xs text-muted-foreground">
											{formatCurrency(project.paidAmount)} / {formatCurrency(project.totalAmount)}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="mb-4 text-xs font-medium tracking-wider text-muted-foreground uppercase">
			Payment Status
		</h2>
		<div class="grid grid-cols-3 gap-4">
			{#each paymentColumns as column (column.key)}
				<div
					class="min-h-[200px] rounded-lg border bg-muted/30 p-4 transition-colors"
					ondragover={handleDragOver}
					ondrop={() => handleDropPayment(column.key)}
					role="region"
					aria-label={column.label}
				>
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-sm font-medium">{column.label}</h3>
						<span
							class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground"
						>
							{filterByPaymentStatus(column.key).length}
						</span>
					</div>
					<div class="space-y-1.5">
						{#each filterByPaymentStatus(column.key) as project (project.id)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								draggable="true"
								ondragstart={() => handleDragStart(project.id)}
								class="cursor-grab rounded-md border bg-background px-3 py-2.5 shadow-sm transition-all hover:shadow-md active:cursor-grabbing"
							>
								<div class="flex items-center gap-2">
									<GripVertical class="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">
											{data.clientMap[project.clientId] || 'Unknown'}
										</p>
										<p class="truncate text-xs text-muted-foreground">{project.title}</p>
									</div>
								</div>
								<div class="mt-1.5 flex items-center justify-between pl-5.5">
									<span class="text-sm font-medium">{formatCurrency(project.totalAmount)}</span>
									<Badge class={invoiceStatusVariants[project.invoiceStatus]}>
										{#if project.invoiceStatus === 'for_invoice'}
											For Invoice
										{:else if project.invoiceStatus === 'invoiced'}
											Invoiced
										{:else}
											No Invoice
										{/if}
									</Badge>
								</div>
								{#if project.totalAmount > 0}
									<div class="mt-1.5 pl-5.5">
										<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
											<div
												class="h-full rounded-full bg-green-600 transition-all"
												style="width: {Math.min(
													(project.paidAmount / project.totalAmount) * 100,
													100
												)}%"
											></div>
										</div>
										<div class="mt-0.5 text-xs text-muted-foreground">
											{formatCurrency(project.paidAmount)} / {formatCurrency(project.totalAmount)}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
