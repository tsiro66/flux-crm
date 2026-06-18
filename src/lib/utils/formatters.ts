export function formatCurrency(
	amount: number,
	{ decimals = true }: { decimals?: boolean } = {}
): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: decimals ? 2 : 0,
		maximumFractionDigits: decimals ? 2 : 0
	}).format(amount / 100);
}

export function getInitials(name: string): string {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

export function toCents(dollars: number | string): number {
	return Math.round(parseFloat(String(dollars)) * 100);
}

export function toDollars(cents: number): number {
	return cents / 100;
}

export function formatDate(date: Date | string, locale?: string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString(locale ?? 'en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: '2-digit'
	});
}
