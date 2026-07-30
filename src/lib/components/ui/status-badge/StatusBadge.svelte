<script lang="ts">
	import { cn } from '$lib/utils';
	import {
		invoiceStatusLabels,
		invoiceStatusVariants,
		paymentStatusLabels,
		paymentStatusVariants,
		type InvoiceStatus,
		type PaymentStatus
	} from '$lib/utils';

	type Props = {
		kind: 'invoice' | 'payment';
		status: InvoiceStatus | PaymentStatus;
		/** When provided, renders as a <button> (used for click-to-filter). */
		onclick?: () => void;
		title?: string;
		class?: string;
	};

	let { kind, status, onclick, title, class: className }: Props = $props();

	const label = $derived(
		kind === 'invoice'
			? invoiceStatusLabels[status as InvoiceStatus]
			: paymentStatusLabels[status as PaymentStatus]
	);
	const variant = $derived(
		kind === 'invoice'
			? invoiceStatusVariants[status as InvoiceStatus]
			: paymentStatusVariants[status as PaymentStatus]
	);

	const baseClasses = $derived(
		cn(
			'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
			variant,
			onclick && 'cursor-pointer transition-opacity hover:opacity-80',
			className
		)
	);
</script>

{#if onclick}
	<button type="button" class={baseClasses} {onclick} {title}>
		{label}
	</button>
{:else}
	<span class={baseClasses}>
		{label}
	</span>
{/if}
