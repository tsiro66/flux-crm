<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

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

	const invoiceStatusVariants: Record<string, string> = {
		for_invoice: 'bg-blue-100 text-blue-800 border-blue-200',
		invoiced: 'bg-green-100 text-green-800 border-green-200',
		no_invoice: 'bg-gray-100 text-gray-800 border-gray-200'
	};

	const paymentStatusVariants: Record<string, string> = {
		not_paid: 'bg-red-100 text-red-800 border-red-200',
		partial_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
		paid: 'bg-green-100 text-green-800 border-green-200'
	};

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
	}

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

<div>
	<h1 class="mb-6 text-2xl font-bold">Finance</h1>

	<div class="mb-8">
		<h2 class="mb-4 text-lg font-semibold">Invoice Status</h2>
		<div class="grid grid-cols-3 gap-4">
			{#each invoiceColumns as column (column.key)}
				<div
					class="min-h-[200px] rounded-lg border bg-muted/50 p-4"
					ondragover={handleDragOver}
					ondrop={() => handleDropInvoice(column.key)}
					role="region"
					aria-label={column.label}
				>
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-sm font-medium">{column.label}</h3>
						<Badge variant="secondary" class="text-xs">
							{filterByInvoiceStatus(column.key).length}
						</Badge>
					</div>
					<div class="space-y-2">
						{#each filterByInvoiceStatus(column.key) as project (project.id)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								draggable="true"
								ondragstart={() => handleDragStart(project.id)}
								class="cursor-grab rounded-md border bg-background p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
							>
								<p class="text-sm font-medium">
									{data.clientMap[project.clientId] || 'Unknown'}
								</p>
								<p class="text-xs text-muted-foreground">{project.title}</p>
								<div class="mt-2 flex items-center justify-between">
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
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="mb-4 text-lg font-semibold">Payment Status</h2>
		<div class="grid grid-cols-3 gap-4">
			{#each paymentColumns as column (column.key)}
				<div
					class="min-h-[200px] rounded-lg border bg-muted/50 p-4"
					ondragover={handleDragOver}
					ondrop={() => handleDropPayment(column.key)}
					role="region"
					aria-label={column.label}
				>
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-sm font-medium">{column.label}</h3>
						<Badge variant="secondary" class="text-xs">
							{filterByPaymentStatus(column.key).length}
						</Badge>
					</div>
					<div class="space-y-2">
						{#each filterByPaymentStatus(column.key) as project (project.id)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								draggable="true"
								ondragstart={() => handleDragStart(project.id)}
								class="cursor-grab rounded-md border bg-background p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
							>
								<p class="text-sm font-medium">
									{data.clientMap[project.clientId] || 'Unknown'}
								</p>
								<p class="text-xs text-muted-foreground">{project.title}</p>
								<div class="mt-2 flex items-center justify-between">
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
								{#if project.paidAmount > 0}
									<div class="mt-1 text-xs text-muted-foreground">
										Paid: {formatCurrency(project.paidAmount)} / {formatCurrency(project.totalAmount)}
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