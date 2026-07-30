// 'YYYY-MM' month helpers used by recurring-payment generation.
// Zero-padded YYYY-MM strings compare lexicographically, which is why plain
// string comparison works for ordering.

export function currentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function nextMonth(month: string): string {
	const [y, m] = month.split('-').map(Number);
	// m is 1-based; Date's month arg is 0-based, so passing m gives "next month".
	const d = new Date(y, m, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthBefore(a: string, b: string): boolean {
	return a < b;
}

// Clamp e.g. day 31 to the last day of shorter months.
export function dateForMonth(month: string, dayOfMonth: number): Date {
	const [y, m] = month.split('-').map(Number);
	const lastDay = new Date(y, m, 0).getDate();
	return new Date(y, m - 1, Math.min(dayOfMonth, lastDay));
}
