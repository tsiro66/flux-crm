<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		formatCurrency,
		paymentStatusLabels,
		invoiceStatusLabels,
		paymentStatusVariants,
		invoiceStatusVariants
	} from '$lib/utils';
	import { DollarSign } from '@lucide/svelte';

	type Project = {
		title: string;
		date: Date | null;
		totalAmount: number;
		paidAmount: number;
		invoiceStatus: string;
		paymentStatus: string;
	};

	let {
		project,
		onAddPayment,
		onEdit,
		onDelete
	}: {
		project: Project;
		onAddPayment: () => void;
		onEdit: () => void;
		onDelete: () => void;
	} = $props();
</script>

<div class="rounded-lg border px-5 py-4">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<h3 class="font-medium">{project.title}</h3>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{project.date ? new Date(project.date).toLocaleDateString() : 'No date'}
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
			<span class="mx-2 text-muted-foreground/40">|</span>
			<span class="text-muted-foreground">Remaining: </span>
			<span class="font-medium">{formatCurrency(project.totalAmount - project.paidAmount)}</span>
		</div>
		<div class="flex gap-1">
			<Button size="sm" variant="ghost" onclick={onAddPayment} class="h-7 gap-1 text-xs">
				<DollarSign class="h-3 w-3" />
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
</div>
