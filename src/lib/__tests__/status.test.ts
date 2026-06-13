import { describe, it, expect } from 'vitest';
import {
	invoiceStatusLabels,
	paymentStatusLabels,
	invoiceStatusVariants,
	paymentStatusVariants
} from '$lib/utils/status';

describe('invoiceStatusLabels', () => {
	it('has labels for all invoice statuses', () => {
		expect(invoiceStatusLabels.for_invoice).toBe('For Invoice');
		expect(invoiceStatusLabels.invoiced).toBe('Invoiced');
		expect(invoiceStatusLabels.no_invoice).toBe('No Invoice');
	});

	it('has exactly 3 statuses', () => {
		expect(Object.keys(invoiceStatusLabels)).toHaveLength(3);
	});
});

describe('paymentStatusLabels', () => {
	it('has labels for all payment statuses', () => {
		expect(paymentStatusLabels.not_paid).toBe('Not Paid');
		expect(paymentStatusLabels.partial_payment).toBe('Partial');
		expect(paymentStatusLabels.paid).toBe('Paid');
	});

	it('has exactly 3 statuses', () => {
		expect(Object.keys(paymentStatusLabels)).toHaveLength(3);
	});
});

describe('status variants', () => {
	it('has variants for all invoice statuses', () => {
		expect(invoiceStatusVariants.for_invoice).toBeDefined();
		expect(invoiceStatusVariants.invoiced).toBeDefined();
		expect(invoiceStatusVariants.no_invoice).toBeDefined();
	});

	it('has variants for all payment statuses', () => {
		expect(paymentStatusVariants.not_paid).toBeDefined();
		expect(paymentStatusVariants.partial_payment).toBeDefined();
		expect(paymentStatusVariants.paid).toBeDefined();
	});

	it('all variants are non-empty strings', () => {
		for (const variant of Object.values(invoiceStatusVariants)) {
			expect(typeof variant).toBe('string');
			expect(variant.length).toBeGreaterThan(0);
		}
		for (const variant of Object.values(paymentStatusVariants)) {
			expect(typeof variant).toBe('string');
			expect(variant.length).toBeGreaterThan(0);
		}
	});
});
