import { z } from 'zod/v4';

const monthSchema = z
	.string()
	.regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM')
	.optional();

export const createRecurringPaymentSchema = z.object({
	clientId: z.string().uuid('Invalid client ID'),
	projectId: z.string().uuid('Invalid project ID'),
	amount: z.coerce.number().positive('Amount must be greater than 0'),
	dayOfMonth: z.coerce
		.number()
		.int('Day must be a whole number')
		.min(1, 'Day must be between 1 and 31')
		.max(31, 'Day must be between 1 and 31')
		.default(1),
	note: z.string().max(200, 'Note is too long').optional().default(''),
	// First month to generate a payment for; defaults to the current month.
	startMonth: monthSchema
});

export const updateRecurringPaymentSchema = z
	.object({
		amount: z.coerce.number().positive('Amount must be greater than 0').optional(),
		dayOfMonth: z.coerce
			.number()
			.int('Day must be a whole number')
			.min(1, 'Day must be between 1 and 31')
			.max(31, 'Day must be between 1 and 31')
			.optional(),
		note: z.string().max(200, 'Note is too long').optional(),
		active: z.boolean().optional()
	})
	.refine((data) => Object.values(data).some((v) => v !== undefined), {
		message: 'At least one field is required'
	});

export type CreateRecurringPaymentInput = z.infer<typeof createRecurringPaymentSchema>;
export type UpdateRecurringPaymentInput = z.infer<typeof updateRecurringPaymentSchema>;
