import type { invoiceStatusEnum, paymentStatusEnum } from '$lib/server/db/schema';

type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
	for_invoice: 'For Invoice',
	invoiced: 'Invoiced',
	no_invoice: 'No Invoice'
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
	not_paid: 'Not Paid',
	partial_payment: 'Partial',
	paid: 'Paid'
};

// Soft-badge variants: tinted background + colored text, driven by the theme
// tokens in routes/layout.css (no hardcoded palette colors, dark-mode ready).
export const invoiceStatusVariants: Record<InvoiceStatus, string> = {
	for_invoice: 'bg-info/10 text-info',
	invoiced: 'bg-success/10 text-success',
	no_invoice: 'bg-muted text-muted-foreground'
};

export const paymentStatusVariants: Record<PaymentStatus, string> = {
	not_paid: 'bg-destructive/10 text-destructive',
	partial_payment: 'bg-warning/10 text-warning',
	paid: 'bg-success/10 text-success'
};

export type { InvoiceStatus, PaymentStatus };
