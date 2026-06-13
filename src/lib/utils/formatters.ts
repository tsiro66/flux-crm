export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
		amount / 100
	);
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
