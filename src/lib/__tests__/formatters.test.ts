import { describe, it, expect } from 'vitest';
import { formatCurrency, getInitials } from '$lib/utils/formatters';

describe('formatCurrency', () => {
	it('formats cents to USD currency string', () => {
		expect(formatCurrency(10000)).toBe('$100.00');
	});

	it('formats zero cents', () => {
		expect(formatCurrency(0)).toBe('$0.00');
	});

	it('formats small amounts', () => {
		expect(formatCurrency(99)).toBe('$0.99');
	});

	it('formats large amounts', () => {
		expect(formatCurrency(1000000)).toBe('$10,000.00');
	});

	it('handles amounts with partial cents', () => {
		expect(formatCurrency(1555)).toBe('$15.55');
	});
});

describe('getInitials', () => {
	it('returns initials from a full name', () => {
		expect(getInitials('John Doe')).toBe('JD');
	});

	it('returns initials from a single name', () => {
		expect(getInitials('John')).toBe('J');
	});

	it('returns at most 2 characters', () => {
		expect(getInitials('John Michael Doe')).toBe('JM');
	});

	it('handles empty string', () => {
		expect(getInitials('')).toBe('');
	});

	it('uppercases initials', () => {
		expect(getInitials('john doe')).toBe('JD');
	});
});
