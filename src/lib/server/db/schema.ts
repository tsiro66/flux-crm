import {
	pgTable,
	text,
	integer,
	timestamp,
	uuid,
	varchar,
	pgEnum,
	boolean,
	index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const invoiceStatusEnum = pgEnum('invoice_status', [
	'for_invoice',
	'invoiced',
	'no_invoice'
]);
export const paymentStatusEnum = pgEnum('payment_status', ['not_paid', 'partial_payment', 'paid']);

export const clients = pgTable(
	'clients',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: text('name').notNull(),
		email: text('email'),
		phone: text('phone'),
		notes: text('notes'),
		userId: uuid('user_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [index('clients_user_id_idx').on(t.userId)]
);

export const projects = pgTable(
	'projects',
	{
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
	},
	(t) => [
		index('projects_user_id_idx').on(t.userId),
		index('projects_client_id_idx').on(t.clientId)
	]
);

export const payments = pgTable(
	'payments',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		amount: integer('amount').notNull(),
		date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
		note: text('note'),
		userId: uuid('user_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('payments_user_id_idx').on(t.userId),
		index('payments_project_id_idx').on(t.projectId)
	]
);

export const files = pgTable(
	'files',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id, { onDelete: 'cascade' }),
		storagePath: text('storage_path').notNull(),
		filename: text('filename').notNull(),
		fileType: varchar('file_type', { length: 50 }).notNull(),
		uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
		userId: uuid('user_id').notNull()
	},
	(t) => [index('files_user_id_idx').on(t.userId), index('files_client_id_idx').on(t.clientId)]
);

// Recurring monthly charges. Tied to a project because every generated
// payment row requires a projectId. `startMonth`/`lastGeneratedMonth` are
// 'YYYY-MM' strings; generation is lazy (catch-up) — see services/recurring.ts.
export const recurringPayments = pgTable(
	'recurring_payments',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id, { onDelete: 'cascade' }),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').notNull(),
		amount: integer('amount').notNull(),
		note: text('note').notNull().default(''),
		dayOfMonth: integer('day_of_month').notNull().default(1),
		active: boolean('active').notNull().default(true),
		startMonth: text('start_month').notNull(),
		lastGeneratedMonth: text('last_generated_month'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('recurring_payments_user_id_idx').on(t.userId),
		index('recurring_payments_client_id_idx').on(t.clientId),
		index('recurring_payments_project_id_idx').on(t.projectId)
	]
);

export const chatConversations = pgTable(
	'chat_conversations',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').notNull(),
		title: text('title').notNull().default('New Chat'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [index('chat_conversations_user_id_idx').on(t.userId)]
);

export const chatMessages = pgTable(
	'chat_messages',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => chatConversations.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').notNull(),
		role: text('role').notNull(),
		content: text('content').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('chat_messages_user_id_idx').on(t.userId),
		index('chat_messages_conversation_created_idx').on(t.conversationId, t.createdAt)
	]
);

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

export const chatConversationsRelations = relations(chatConversations, ({ many }) => ({
	messages: many(chatMessages)
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
	conversation: one(chatConversations, {
		fields: [chatMessages.conversationId],
		references: [chatConversations.id]
	})
}));

export const recurringPaymentsRelations = relations(recurringPayments, ({ one }) => ({
	client: one(clients, {
		fields: [recurringPayments.clientId],
		references: [clients.id]
	}),
	project: one(projects, {
		fields: [recurringPayments.projectId],
		references: [projects.id]
	})
}));
