export const invoiceStatusLabels: Record<string, string> = {
	for_invoice: 'For Invoice',
	invoiced: 'Invoiced',
	no_invoice: 'No Invoice'
};

export const paymentStatusLabels: Record<string, string> = {
	not_paid: 'Not Paid',
	partial_payment: 'Partial',
	paid: 'Paid'
};

export const invoiceStatusVariants: Record<string, string> = {
	for_invoice: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/10',
	invoiced: 'bg-green-50 text-green-700 border-green-200 ring-green-600/10',
	no_invoice: 'bg-gray-50 text-gray-700 border-gray-200 ring-gray-600/10'
};

export const paymentStatusVariants: Record<string, string> = {
	not_paid: 'bg-red-50 text-red-700 border-red-200 ring-red-600/10',
	partial_payment: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/10',
	paid: 'bg-green-50 text-green-700 border-green-200 ring-green-600/10'
};
