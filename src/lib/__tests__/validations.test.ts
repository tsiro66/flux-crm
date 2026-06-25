import { describe, it, expect } from 'vitest';
import { createClientSchema, updateClientSchema } from '$lib/validations/client';
import { createProjectSchema } from '$lib/validations/project';
import { createPaymentSchema } from '$lib/validations/payment';
import { importClientRowSchema, importProjectRowSchema } from '$lib/validations/import';

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
				clientId: '550e8400-e29b-41d4-a716-446655440000',
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
				clientId: '550e8400-e29b-41d4-a716-446655440000',
				title: '',
				totalAmount: 0,
				invoiceStatus: 'for_invoice',
				paymentStatus: 'not_paid'
			});
			expect(result.success).toBe(false);
		});

		it('requires valid clientId UUID', () => {
			const result = createProjectSchema.safeParse({
				clientId: 'not-a-uuid',
				title: 'Project',
				invoiceStatus: 'for_invoice',
				paymentStatus: 'not_paid'
			});
			expect(result.success).toBe(false);
		});

		it('defaults totalAmount to 0', () => {
			const result = createProjectSchema.safeParse({
				clientId: '550e8400-e29b-41d4-a716-446655440000',
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
				clientId: '550e8400-e29b-41d4-a716-446655440000',
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
				clientId: '550e8400-e29b-41d4-a716-446655440000',
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
				projectId: '550e8400-e29b-41d4-a716-446655440000',
				amount: 150.5,
				date: '2024-01-15',
				note: 'Partial payment'
			});
			expect(result.success).toBe(true);
		});

		it('requires amount greater than 0', () => {
			const result = createPaymentSchema.safeParse({
				projectId: '550e8400-e29b-41d4-a716-446655440000',
				amount: 0,
				date: '2024-01-15'
			});
			expect(result.success).toBe(false);
		});

		it('requires valid projectId UUID', () => {
			const result = createPaymentSchema.safeParse({
				projectId: 'not-a-uuid',
				amount: 100,
				date: '2024-01-15'
			});
			expect(result.success).toBe(false);
		});

		it('defaults note to empty string', () => {
			const result = createPaymentSchema.safeParse({
				projectId: '550e8400-e29b-41d4-a716-446655440000',
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
				projectId: '550e8400-e29b-41d4-a716-446655440000',
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

describe('import validations', () => {
	describe('importClientRowSchema', () => {
		it('validates a valid client row', () => {
			const result = importClientRowSchema.safeParse({
				name: 'Acme Corp',
				email: 'acme@example.com',
				phone: '123-456',
				notes: 'note'
			});
			expect(result.success).toBe(true);
		});

		it('requires name', () => {
			const result = importClientRowSchema.safeParse({ name: '', email: 'a@b.com' });
			expect(result.success).toBe(false);
		});

		it('allows empty email', () => {
			const result = importClientRowSchema.safeParse({ name: 'Acme', email: '' });
			expect(result.success).toBe(true);
		});

		it('rejects invalid email', () => {
			const result = importClientRowSchema.safeParse({ name: 'Acme', email: 'nope' });
			expect(result.success).toBe(false);
		});

		it('defaults optional fields', () => {
			const result = importClientRowSchema.safeParse({ name: 'Acme' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe('');
				expect(result.data.phone).toBe('');
				expect(result.data.notes).toBe('');
			}
		});
	});

	describe('importProjectRowSchema', () => {
		it('validates a valid project row', () => {
			const result = importProjectRowSchema.safeParse({
				clientEmail: 'acme@example.com',
				title: 'Site',
				totalAmount: '5000',
				paidAmount: '2000',
				invoiceStatus: 'Invoiced',
				paymentStatus: 'partial_payment',
				date: '2024-01-15'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.invoiceStatus).toBe('invoiced');
				expect(result.data.paymentStatus).toBe('partial_payment');
				expect(result.data.totalAmount).toBe(5000);
				expect(result.data.paidAmount).toBe(2000);
			}
		});

		it('lowercases uppercase enum values', () => {
			const result = importProjectRowSchema.safeParse({
				clientName: 'Acme',
				title: 'Site',
				invoiceStatus: 'INVOICED',
				paymentStatus: 'PAID'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.invoiceStatus).toBe('invoiced');
				expect(result.data.paymentStatus).toBe('paid');
			}
		});

		it('accepts clientName when clientEmail is absent', () => {
			const result = importProjectRowSchema.safeParse({ clientName: 'Acme', title: 'Site' });
			expect(result.success).toBe(true);
		});

		it('requires either clientEmail or clientName', () => {
			const result = importProjectRowSchema.safeParse({ title: 'Site' });
			expect(result.success).toBe(false);
		});

		it('requires title', () => {
			const result = importProjectRowSchema.safeParse({ clientName: 'Acme', title: '' });
			expect(result.success).toBe(false);
		});

		it('rejects invalid enum value', () => {
			const result = importProjectRowSchema.safeParse({
				clientName: 'Acme',
				title: 'Site',
				invoiceStatus: 'unknown'
			});
			expect(result.success).toBe(false);
		});

		it('rejects negative amounts', () => {
			const result = importProjectRowSchema.safeParse({
				clientName: 'Acme',
				title: 'Site',
				totalAmount: -100
			});
			expect(result.success).toBe(false);
		});

		it('defaults amounts and statuses', () => {
			const result = importProjectRowSchema.safeParse({ clientName: 'Acme', title: 'Site' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.totalAmount).toBe(0);
				expect(result.data.paidAmount).toBe(0);
				expect(result.data.invoiceStatus).toBe('for_invoice');
				expect(result.data.paymentStatus).toBe('not_paid');
			}
		});
	});
});
