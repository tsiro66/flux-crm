import { describe, it, expect } from 'vitest';
import { nextMonth, monthBefore, dateForMonth } from '$lib/utils/months';
import { createRecurringPaymentSchema, updateRecurringPaymentSchema } from '$lib/validations';

describe('nextMonth', () => {
	it('advances within a year', () => {
		expect(nextMonth('2026-01')).toBe('2026-02');
	});

	it('rolls over the year', () => {
		expect(nextMonth('2026-12')).toBe('2027-01');
	});
});

describe('monthBefore', () => {
	it('orders zero-padded months lexicographically', () => {
		expect(monthBefore('2026-01', '2026-02')).toBe(true);
		expect(monthBefore('2026-12', '2027-01')).toBe(true);
		expect(monthBefore('2027-01', '2026-12')).toBe(false);
		expect(monthBefore('2026-06', '2026-06')).toBe(false);
	});
});

describe('dateForMonth', () => {
	it('uses the requested day when the month has it', () => {
		const d = dateForMonth('2026-03', 15);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(2);
		expect(d.getDate()).toBe(15);
	});

	it('clamps day 31 to the last day of short months', () => {
		expect(dateForMonth('2026-02', 31).getDate()).toBe(28); // 2026 not a leap year
		expect(dateForMonth('2028-02', 31).getDate()).toBe(29); // 2028 leap year
		expect(dateForMonth('2026-04', 31).getDate()).toBe(30);
	});
});

describe('createRecurringPaymentSchema', () => {
	const valid = {
		clientId: crypto.randomUUID(),
		projectId: crypto.randomUUID(),
		amount: '500'
	};

	it('accepts a minimal valid payload with defaults', () => {
		const result = createRecurringPaymentSchema.safeParse(valid);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.dayOfMonth).toBe(1);
			expect(result.data.note).toBe('');
		}
	});

	it('accepts a valid startMonth', () => {
		expect(
			createRecurringPaymentSchema.safeParse({ ...valid, startMonth: '2026-01' }).success
		).toBe(true);
	});

	it('rejects malformed startMonth', () => {
		expect(
			createRecurringPaymentSchema.safeParse({ ...valid, startMonth: '2026-13' }).success
		).toBe(false);
		expect(
			createRecurringPaymentSchema.safeParse({ ...valid, startMonth: 'Jan 2026' }).success
		).toBe(false);
	});

	it('rejects dayOfMonth out of range', () => {
		expect(createRecurringPaymentSchema.safeParse({ ...valid, dayOfMonth: 0 }).success).toBe(false);
		expect(createRecurringPaymentSchema.safeParse({ ...valid, dayOfMonth: 32 }).success).toBe(
			false
		);
	});

	it('rejects non-positive amount', () => {
		expect(createRecurringPaymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
	});
});

describe('updateRecurringPaymentSchema', () => {
	it('accepts a toggle-only payload', () => {
		expect(updateRecurringPaymentSchema.safeParse({ active: false }).success).toBe(true);
	});

	it('rejects an empty payload', () => {
		expect(updateRecurringPaymentSchema.safeParse({}).success).toBe(false);
	});
});
