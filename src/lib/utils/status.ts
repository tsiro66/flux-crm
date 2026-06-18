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

export const invoiceStatusVariants: Record<InvoiceStatus, string> = {
	for_invoice: 'bg-blue-600 text-white',
	invoiced: 'bg-green-600 text-white',
	no_invoice: 'bg-gray-500 text-white'
};

export const paymentStatusVariants: Record<PaymentStatus, string> = {
	not_paid: 'bg-red-600 text-white',
	partial_payment: 'bg-amber-500 text-white',
	paid: 'bg-green-600 text-white'
};

export type { InvoiceStatus, PaymentStatus };
