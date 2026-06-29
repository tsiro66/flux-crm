<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		formatCurrency,
		formatDate,
		invoiceStatusLabels,
		invoiceStatusVariants,
		paymentStatusLabels,
		paymentStatusVariants
	} from '$lib/utils';
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { toastSuccess, toastError } from '$lib/stores/toast.svelte';
	import { DeleteConfirmDialog, ProjectFormDialog, PaymentDialog } from '$lib/components/client';
	import { ArrowLeft, Pencil, Trash2, Euro, Plus } from '@lucide/svelte';
	import type { Payment } from '$lib/server/db/types';

	let { data }: { data: PageData } = $props();

	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let deleteLoading = $state(false);

	let showPaymentDialog = $state(false);
	let editingPayment = $state<Payment | null>(null);

	let deletingPaymentId = $state<string | null>(null);
	let paymentDeleteLoading = $state(false);

	let remaining = $derived(data.project.totalAmount - data.project.paidAmount);
	let paidPct = $derived(
		data.project.totalAmount > 0
			? Math.min((data.project.paidAmount / data.project.totalAmount) * 100, 100)
			: 0
	);

	async function handleDeleteProject() {
		deleteLoading = true;
		const res = await fetch(`/api/projects/${data.project.id}`, { method: 'DELETE' });
		deleteLoading = false;
		if (res.ok) {
			toastSuccess('Project deleted');
			goto('/projects');
		} else {
			toastError('Failed to delete project');
		}
		showDeleteDialog = false;
	}

	function openAddPayment() {
		editingPayment = null;
		showPaymentDialog = true;
	}

	function openEditPayment(payment: Payment) {
		editingPayment = payment;
		showPaymentDialog = true;
	}

	async function handleDeletePayment() {
		if (!deletingPaymentId) return;
		paymentDeleteLoading = true;
		const res = await fetch(`/api/payments/${deletingPaymentId}`, { method: 'DELETE' });
		paymentDeleteLoading = false;
		deletingPaymentId = null;
		if (res.ok) {
			toastSuccess('Payment deleted');
			invalidateAll();
		} else {
			toastError('Failed to delete payment');
		}
	}
</script>

<div class="p-8">
	<a
		href="/projects"
		class="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
	>
		<ArrowLeft class="h-3.5 w-3.5" />
		Back to Projects
	</a>

	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h1 class="text-xl font-semibold tracking-tight">{data.project.title}</h1>
			<div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
				<a
					href={`/clients/${data.project.clientId}`}
					class="font-medium text-foreground hover:underline"
				>
					{data.project.clientName}
				</a>
				{#if data.project.date}
					<span>· {formatDate(data.project.date)}</span>
				{/if}
			</div>
			<div class="mt-3 flex flex-wrap gap-1.5">
				<span
					class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {invoiceStatusVariants[data.project.invoiceStatus]}"
				>
					{invoiceStatusLabels[data.project.invoiceStatus]}
				</span>
				<span
					class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {paymentStatusVariants[data.project.paymentStatus]}"
				>
					{paymentStatusLabels[data.project.paymentStatus]}
				</span>
			</div>
		</div>
		<div class="flex shrink-0 gap-2">
			<Button variant="outline" size="sm" onclick={openAddPayment} class="gap-1.5">
				<Euro class="h-3.5 w-3.5" />
				Add Payment
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={() => (showDeleteDialog = true)}
				class="gap-1.5 text-destructive hover:text-destructive"
			>
				<Trash2 class="h-3.5 w-3.5" />
				Delete
			</Button>
			<Button size="sm" onclick={() => (showEditDialog = true)} class="gap-1.5">
				<Pencil class="h-3.5 w-3.5" />
				Edit
			</Button>
		</div>
	</div>

	<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="rounded-lg border p-4">
			<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Total</p>
			<p class="mt-1 text-xl font-semibold">{formatCurrency(data.project.totalAmount)}</p>
		</div>
		<div class="rounded-lg border p-4">
			<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Paid</p>
			<p class="mt-1 text-xl font-semibold text-green-600">{formatCurrency(data.project.paidAmount)}</p>
		</div>
		<div class="rounded-lg border p-4">
			<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Remaining</p>
			<p class="mt-1 text-xl font-semibold {remaining > 0 ? 'text-destructive' : 'text-green-600'}">
				{formatCurrency(remaining)}
			</p>
		</div>
	</div>

	{#if data.project.totalAmount > 0}
		<div class="mb-8">
			<div class="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
				<span>{formatCurrency(data.project.paidAmount)} paid</span>
				<span>{Math.round(paidPct)}%</span>
				<span>{formatCurrency(remaining)} remaining</span>
			</div>
			<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div
					class="h-full rounded-full bg-green-600 transition-all"
					style="width: {paidPct}%"
				></div>
			</div>
		</div>
	{/if}

	<div>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
				Payments ({data.payments.length})
			</h2>
			<Button size="sm" variant="outline" onclick={openAddPayment} class="gap-1.5">
				<Plus class="h-3.5 w-3.5" />
				Add Payment
			</Button>
		</div>

		{#if data.payments.length === 0}
			<div class="rounded-lg border py-12 text-center">
				<p class="text-sm text-muted-foreground">No payments recorded yet.</p>
				<Button size="sm" variant="outline" onclick={openAddPayment} class="mt-3 gap-1.5">
					<Plus class="h-3.5 w-3.5" />
					Add first payment
				</Button>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg border">
				<table class="w-full">
					<thead>
						<tr class="border-b bg-muted/30">
							<th class="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
								Date
							</th>
							<th class="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase">
								Amount
							</th>
							<th class="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
								Note
							</th>
							<th class="w-20 px-4 py-2.5"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.payments as payment (payment.id)}
							<tr class="border-b transition-colors last:border-b-0 hover:bg-muted/50">
								<td class="px-4 py-2.5 text-sm text-muted-foreground">
									{formatDate(payment.date)}
								</td>
								<td class="px-4 py-2.5 text-right text-sm font-medium text-green-600">
									{formatCurrency(payment.amount)}
								</td>
								<td class="px-4 py-2.5 text-sm text-muted-foreground">
									{payment.note || '—'}
								</td>
								<td class="px-4 py-2.5">
									{#if deletingPaymentId === payment.id}
										<div class="flex items-center justify-end gap-1.5">
											<Button
												size="sm"
												variant="ghost"
												class="h-7 text-xs"
												onclick={() => (deletingPaymentId = null)}
												disabled={paymentDeleteLoading}
											>
												Cancel
											</Button>
											<Button
												size="sm"
												variant="destructive"
												class="h-7 gap-1 text-xs"
												onclick={handleDeletePayment}
												disabled={paymentDeleteLoading}
											>
												{paymentDeleteLoading ? 'Deleting...' : 'Confirm'}
											</Button>
										</div>
									{:else}
										<div class="flex items-center justify-end gap-1">
											<Button
												size="sm"
												variant="ghost"
												class="h-7 w-7 p-0"
												onclick={() => openEditPayment(payment)}
												aria-label="Edit payment"
											>
												<Pencil class="h-3 w-3" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												class="h-7 w-7 p-0 text-destructive hover:text-destructive"
												onclick={() => (deletingPaymentId = payment.id)}
												aria-label="Delete payment"
											>
												<Trash2 class="h-3 w-3" />
											</Button>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<ProjectFormDialog
	bind:open={showEditDialog}
	clientId={data.project.clientId}
	clients={data.clients}
	project={data.project}
/>

<PaymentDialog
	bind:open={showPaymentDialog}
	projectId={data.project.id}
	payment={editingPayment}
/>

<DeleteConfirmDialog
	bind:open={showDeleteDialog}
	title="Delete Project"
	description="Are you sure you want to delete this project? This will also remove all associated payments. This action cannot be undone."
	loading={deleteLoading}
	onConfirm={handleDeleteProject}
/>
