import { pgTable, text, integer, timestamp, uuid, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const invoiceStatusEnum = pgEnum('invoice_status', [
	'for_invoice',
	'invoiced',
	'no_invoice'
]);
export const paymentStatusEnum = pgEnum('payment_status', ['not_paid', 'partial_payment', 'paid']);

export const clients = pgTable('clients', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	email: text('email'),
	phone: text('phone'),
	notes: text('notes'),
	userId: uuid('user_id').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const projects = pgTable('projects', {
	id: uuid('id').defaultRandom().primaryKey(),
	clientId: uuid('client_id')
		.notNull()
		.references(() => clients.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	totalAmount: integer('total_amount').notNull().default(0),
	paidAmount: integer('paid_amount').notNull().default(0),
	invoiceStatus: invoiceStatusEnum('invoice_status').notNull().default('for_invoice'),
	paymentStatus: paymentStatusEnum('payment_status').notNull().default('not_paid'),
	date: timestamp('date', { withTimezone: true }).defaultNow(),
	userId: uuid('user_id').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const payments = pgTable('payments', {
	id: uuid('id').defaultRandom().primaryKey(),
	projectId: uuid('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	amount: integer('amount').notNull(),
	date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
	note: text('note'),
	userId: uuid('user_id').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const files = pgTable('files', {
	id: uuid('id').defaultRandom().primaryKey(),
	clientId: uuid('client_id')
		.notNull()
		.references(() => clients.id, { onDelete: 'cascade' }),
	storagePath: text('storage_path').notNull(),
	filename: text('filename').notNull(),
	fileType: varchar('file_type', { length: 50 }).notNull(),
	uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
	userId: uuid('user_id').notNull()
});

export const clientsRelations = relations(clients, ({ many }) => ({
	projects: many(projects),
	files: many(files)
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
	client: one(clients, {
		fields: [projects.clientId],
		references: [clients.id]
	}),
	payments: many(payments)
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
	project: one(projects, {
		fields: [payments.projectId],
		references: [projects.id]
	})
}));

export const filesRelations = relations(files, ({ one }) => ({
	client: one(clients, {
		fields: [files.clientId],
		references: [clients.id]
	})
}));
