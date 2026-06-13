import { describe, it, expect } from 'vitest';
import { createClientSchema, updateClientSchema } from '$lib/validations/client';
import { createProjectSchema } from '$lib/validations/project';
import { createPaymentSchema } from '$lib/validations/payment';

describe('client validations', () => {
	describe('createClientSchema', () => {
		it('validates a valid client', () => {
			const result = createClientSchema.safeParse({
				name: 'Acme Corp',
				email: 'acme@example.com',
				phone: '123-456-7890',
				notes: 'A note'
			});
			expect(result.success).toBe(true);
		});

		it('requires name', () => {
			const result = createClientSchema.safeParse({
				name: '',
				email: 'acme@example.com'
			});
			expect(result.success).toBe(false);
		});

		it('allows empty email', () => {
			const result = createClientSchema.safeParse({
				name: 'Acme Corp',
				email: ''
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid email', () => {
			const result = createClientSchema.safeParse({
				name: 'Acme Corp',
				email: 'not-an-email'
			});
			expect(result.success).toBe(false);
		});

		it('defaults phone and notes to empty strings', () => {
			const result = createClientSchema.safeParse({
				name: 'Acme Corp',
				email: 'acme@example.com'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.phone).toBe('');
				expect(result.data.notes).toBe('');
			}
		});
	});

	describe('updateClientSchema', () => {
		it('validates a valid update', () => {
			const result = updateClientSchema.safeParse({
				name: 'Updated Corp',
				email: 'updated@example.com',
				phone: '987-654-3210',
				notes: 'Updated notes'
			});
			expect(result.success).toBe(true);
		});
	});
});

describe('project validations', () => {
	describe('createProjectSchema', () => {
		it('validates a valid project', () => {
			const result = createProjectSchema.safeParse({
				title: 'New Project',
				totalAmount: 5000,
				invoiceStatus: 'for_invoice',
				paymentStatus: 'not_paid',
				date: '2024-01-15'
			});
			expect(result.success).toBe(true);
		});

		it('requires title', () => {
			const result = createProjectSchema.safeParse({
				title: '',
				totalAmount: 0,
				invoiceStatus: 'for_invoice',
				paymentStatus: 'not_paid'
			});
			expect(result.success).toBe(false);
		});

		it('defaults totalAmount to 0', () => {
			const result = createProjectSchema.safeParse({
				title: 'Project',
				invoiceStatus: 'for_invoice',
				paymentStatus: 'not_paid'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.totalAmount).toBe(0);
			}
		});

		it('coerces totalAmount string to number', () => {
			const result = createProjectSchema.safeParse({
				title: 'Project',
				totalAmount: '5000',
				invoiceStatus: 'for_invoice',
				paymentStatus: 'not_paid'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.totalAmount).toBe(5000);
			}
		});

		it('rejects negative totalAmount', () => {
			const result = createProjectSchema.safeParse({
				title: 'Project',
				totalAmount: -100,
				invoiceStatus: 'for_invoice',
				paymentStatus: 'not_paid'
			});
			expect(result.success).toBe(false);
		});
	});
});

describe('payment validations', () => {
	describe('createPaymentSchema', () => {
		it('validates a valid payment', () => {
			const result = createPaymentSchema.safeParse({
				amount: 150.5,
				date: '2024-01-15',
				note: 'Partial payment'
			});
			expect(result.success).toBe(true);
		});

		it('requires amount greater than 0', () => {
			const result = createPaymentSchema.safeParse({
				amount: 0,
				date: '2024-01-15'
			});
			expect(result.success).toBe(false);
		});

		it('defaults note to empty string', () => {
			const result = createPaymentSchema.safeParse({
				amount: 100,
				date: '2024-01-15'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.note).toBe('');
			}
		});

		it('coerces amount string to number', () => {
			const result = createPaymentSchema.safeParse({
				amount: '250',
				date: '2024-01-15'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.amount).toBe(250);
			}
		});
	});
});
