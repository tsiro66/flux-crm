<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		formatCurrency,
		paymentStatusLabels,
		invoiceStatusLabels,
		paymentStatusVariants,
		invoiceStatusVariants,
		type InvoiceStatus,
		type PaymentStatus
	} from '$lib/utils';
	import { formatDate } from '$lib/utils';
	import { Euro, Pencil, Trash2 } from '@lucide/svelte';
	import type { Payment } from '$lib/server/db/types';

	type Project = {
		title: string;
		date: Date | null;
		totalAmount: number;
		paidAmount: number;
		invoiceStatus: InvoiceStatus;
		paymentStatus: PaymentStatus;
	};

	let {
		project,
		payments = [],
		onAddPayment,
		onEditPayment,
		onDeletePayment,
		onEdit,
		onDelete
	}: {
		project: Project;
		payments?: Payment[];
		onAddPayment: () => void;
		onEditPayment: (payment: Payment) => void;
		onDeletePayment: (paymentId: string) => void;
		onEdit: () => void;
		onDelete: () => void;
	} = $props();
</script>

<div class="rounded-lg border px-5 py-4">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<h3 class="font-medium">{project.title}</h3>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{project.date ? formatDate(project.date) : 'No date'}
			</p>
		</div>
		<div class="flex shrink-0 items-center gap-1.5">
			<Badge class={invoiceStatusVariants[project.invoiceStatus]}>
				{invoiceStatusLabels[project.invoiceStatus]}
			</Badge>
			<Badge class={paymentStatusVariants[project.paymentStatus]}>
				{paymentStatusLabels[project.paymentStatus]}
			</Badge>
		</div>
	</div>
	<div class="mt-3 flex items-center justify-between">
		<div class="text-sm">
			<span class="text-muted-foreground">Total: </span>
			<span class="font-medium">{formatCurrency(project.totalAmount)}</span>
			<span class="mx-2 text-muted-foreground/40">|</span>
			<span class="text-muted-foreground">Paid: </span>
			<span class="font-medium text-green-600">{formatCurrency(project.paidAmount)}</span>
		</div>
		<div class="flex gap-1">
			<Button size="sm" variant="ghost" onclick={onAddPayment} class="h-7 gap-1 text-xs">
				<Euro class="h-3 w-3" />
				Payment
			</Button>
			<Button size="sm" variant="ghost" onclick={onEdit} class="h-7 text-xs">Edit</Button>
			<Button
				size="sm"
				variant="ghost"
				class="h-7 text-xs text-destructive hover:text-destructive"
				onclick={onDelete}
			>
				Delete
			</Button>
		</div>
	</div>
	{#if project.totalAmount > 0}
		<div class="mt-2">
			<div class="flex items-center justify-between text-xs text-muted-foreground">
				<span>{formatCurrency(project.paidAmount)} paid</span>
				<span>{formatCurrency(project.totalAmount - project.paidAmount)} remaining</span>
			</div>
			<div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					class="h-full rounded-full bg-green-600 transition-all"
					style="width: {Math.min((project.paidAmount / project.totalAmount) * 100, 100)}%"
				></div>
			</div>
		</div>
	{/if}
	{#if payments.length > 0}
		<div class="mt-3 space-y-1.5 border-t pt-3">
			{#each payments as payment (payment.id)}
				<div
					class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
				>
					<div class="flex items-center gap-3">
						<span class="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
						<span class="text-muted-foreground">{formatDate(payment.date)}</span>
						{#if payment.note}
							<span class="text-xs text-muted-foreground">{payment.note}</span>
						{/if}
					</div>
					<div class="flex gap-1">
						<Button
							size="sm"
							variant="ghost"
							class="h-6 w-6 p-0"
							onclick={() => onEditPayment(payment)}
						>
							<Pencil class="h-3 w-3" />
						</Button>
						<Button
							size="sm"
							variant="ghost"
							class="h-6 w-6 p-0 text-destructive hover:text-destructive"
							onclick={() => onDeletePayment(payment.id)}
						>
							<Trash2 class="h-3 w-3" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
