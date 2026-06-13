import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
	createAgent,
	defineTool,
	Type,
	type AgentRouteHandler,
	type AgentWebSocketHandler
} from '@flue/runtime';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { clients, projects, payments } from '../../src/lib/server/db/schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: { clients, projects, payments } });

export const route: AgentRouteHandler = async (_c, next) => next();
export const websocket: AgentWebSocketHandler = async (_c, next) => next();

export default createAgent(({ id: userId }) => ({
	model: 'groq/llama-3.3-70b-versatile',
	instructions: `You are a friendly CRM assistant for Flux CRM. You help users manage their clients and projects.

You can:
- List and search clients (use search to find clients by name)
- Get client details including their projects
- Create new clients
- Update existing clients (name, email, phone, notes)
- List and search projects (use search to find projects by title)
- Get project details including payments
- Create new projects
- Update existing projects (title, amounts, statuses, date)

IMPORTANT: When a user refers to a client or project by name, always look up the entity first using list_clients or list_projects with a search filter, then use the returned ID to perform the action. Never ask the user for a UUID — find it yourself.

When the user sends a greeting (like "hi", "hello", "hey", "Γεια" etc.), respond naturally and briefly, then ask how you can help.

Always use the appropriate tool to fulfill requests. Respond concisely. When showing lists, use bullet points. When showing details, present them clearly.`,
	tools: [
		defineTool({
			name: 'list_clients',
			description:
				'List all clients for the current user. Optionally filter by name using the search parameter.',
			parameters: Type.Object({
				search: Type.Optional(Type.String({ description: 'Search filter for client name' }))
			}),
			execute: async ({ search }) => {
				if (search) {
					const result = await db
						.select({
							id: clients.id,
							name: clients.name,
							email: clients.email,
							phone: clients.phone,
							createdAt: clients.createdAt
						})
						.from(clients)
						.where(and(eq(clients.userId, userId!), ilike(clients.name, `%${search}%`)));
					return JSON.stringify(result);
				}

				const result = await db
					.select({
						id: clients.id,
						name: clients.name,
						email: clients.email,
						phone: clients.phone,
						createdAt: clients.createdAt
					})
					.from(clients)
					.where(eq(clients.userId, userId!));
				return JSON.stringify(result);
			}
		}),
		defineTool({
			name: 'get_client',
			description: 'Get details for a specific client by ID, including their associated projects.',
			parameters: Type.Object({
				clientId: Type.String({ description: 'The UUID of the client' })
			}),
			execute: async ({ clientId }) => {
				const [clientRecord] = await db
					.select()
					.from(clients)
					.where(and(eq(clients.id, clientId), eq(clients.userId, userId!)));

				if (!clientRecord) return JSON.stringify({ error: 'Client not found' });

				const clientProjects = await db
					.select({
						id: projects.id,
						title: projects.title,
						totalAmount: projects.totalAmount,
						paidAmount: projects.paidAmount,
						paymentStatus: projects.paymentStatus,
						invoiceStatus: projects.invoiceStatus,
						date: projects.date
					})
					.from(projects)
					.where(eq(projects.clientId, clientId));

				return JSON.stringify({ ...clientRecord, projects: clientProjects });
			}
		}),
		defineTool({
			name: 'list_projects',
			description:
				'List all projects for the current user. Optionally filter by title using the search parameter.',
			parameters: Type.Object({
				search: Type.Optional(Type.String({ description: 'Search filter for project title' }))
			}),
			execute: async ({ search }) => {
				if (search) {
					const result = await db
						.select({
							id: projects.id,
							title: projects.title,
							clientId: projects.clientId,
							totalAmount: projects.totalAmount,
							paidAmount: projects.paidAmount,
							paymentStatus: projects.paymentStatus,
							invoiceStatus: projects.invoiceStatus,
							date: projects.date,
							createdAt: projects.createdAt
						})
						.from(projects)
						.where(and(eq(projects.userId, userId!), ilike(projects.title, `%${search}%`)));
					return JSON.stringify(result);
				}

				const result = await db
					.select({
						id: projects.id,
						title: projects.title,
						clientId: projects.clientId,
						totalAmount: projects.totalAmount,
						paidAmount: projects.paidAmount,
						paymentStatus: projects.paymentStatus,
						invoiceStatus: projects.invoiceStatus,
						date: projects.date,
						createdAt: projects.createdAt
					})
					.from(projects)
					.where(eq(projects.userId, userId!));
				return JSON.stringify(result);
			}
		}),
		defineTool({
			name: 'get_project',
			description: 'Get details for a specific project by ID, including its payments.',
			parameters: Type.Object({
				projectId: Type.String({ description: 'The UUID of the project' })
			}),
			execute: async ({ projectId }) => {
				const [project] = await db
					.select()
					.from(projects)
					.where(and(eq(projects.id, projectId), eq(projects.userId, userId!)));

				if (!project) return JSON.stringify({ error: 'Project not found' });

				const projectPayments = await db
					.select()
					.from(payments)
					.where(eq(payments.projectId, projectId));

				return JSON.stringify({ ...project, payments: projectPayments });
			}
		}),
		defineTool({
			name: 'create_client',
			description: 'Create a new client for the current user.',
			parameters: Type.Object({
				name: Type.String({ description: 'Client name' }),
				email: Type.Optional(Type.String({ description: 'Client email address' })),
				phone: Type.Optional(Type.String({ description: 'Client phone number' })),
				notes: Type.Optional(Type.String({ description: 'Notes about the client' }))
			}),
			execute: async ({ name, email, phone, notes }) => {
				const [created] = await db
					.insert(clients)
					.values({
						name,
						email: email || null,
						phone: phone || null,
						notes: notes || null,
						userId: userId!
					})
					.returning();
				return JSON.stringify(created);
			}
		}),
		defineTool({
			name: 'update_client',
			description:
				'Update an existing client. Provide the client ID and any fields you want to change.',
			parameters: Type.Object({
				clientId: Type.String({ description: 'The UUID of the client to update' }),
				name: Type.Optional(Type.String({ description: 'Updated client name' })),
				email: Type.Optional(Type.String({ description: 'Updated client email address' })),
				phone: Type.Optional(Type.String({ description: 'Updated client phone number' })),
				notes: Type.Optional(Type.String({ description: 'Updated notes about the client' }))
			}),
			execute: async ({ clientId, name, email, phone, notes }) => {
				const setFields: Partial<typeof clients.$inferInsert> = {};
				if (name !== undefined) setFields.name = name;
				if (email !== undefined) setFields.email = email || null;
				if (phone !== undefined) setFields.phone = phone || null;
				if (notes !== undefined) setFields.notes = notes || null;
				setFields.updatedAt = sql`now()`;

				const [updated] = await db
					.update(clients)
					.set(setFields)
					.where(and(eq(clients.id, clientId), eq(clients.userId, userId!)))
					.returning();
				if (!updated) return JSON.stringify({ error: 'Client not found' });
				return JSON.stringify(updated);
			}
		}),
		defineTool({
			name: 'update_project',
			description:
				'Update an existing project. Provide the project ID and any fields you want to change.',
			parameters: Type.Object({
				projectId: Type.String({ description: 'The UUID of the project to update' }),
				title: Type.Optional(Type.String({ description: 'Updated project title' })),
				totalAmount: Type.Optional(Type.Number({ description: 'Updated total amount in cents' })),
				paidAmount: Type.Optional(Type.Number({ description: 'Updated paid amount in cents' })),
				invoiceStatus: Type.Optional(
					Type.String({ description: 'One of: for_invoice, invoiced, no_invoice' })
				),
				paymentStatus: Type.Optional(
					Type.String({ description: 'One of: not_paid, partial_payment, paid' })
				),
				date: Type.Optional(Type.String({ description: 'Updated project date in ISO format' }))
			}),
			execute: async ({
				projectId,
				title,
				totalAmount,
				paidAmount,
				invoiceStatus,
				paymentStatus,
				date
			}) => {
				const setFields: Partial<typeof projects.$inferInsert> = {};
				if (title !== undefined) setFields.title = title;
				if (totalAmount !== undefined) setFields.totalAmount = totalAmount;
				if (paidAmount !== undefined) setFields.paidAmount = paidAmount;
				if (invoiceStatus !== undefined) setFields.invoiceStatus = invoiceStatus;
				if (paymentStatus !== undefined) setFields.paymentStatus = paymentStatus;
				if (date !== undefined) setFields.date = new Date(date);
				setFields.updatedAt = sql`now()`;

				const [updated] = await db
					.update(projects)
					.set(setFields)
					.where(and(eq(projects.id, projectId), eq(projects.userId, userId!)))
					.returning();
				if (!updated) return JSON.stringify({ error: 'Project not found' });
				return JSON.stringify(updated);
			}
		}),
		defineTool({
			name: 'create_project',
			description: 'Create a new project for a specific client.',
			parameters: Type.Object({
				clientId: Type.String({ description: 'The UUID of the client this project belongs to' }),
				title: Type.String({ description: 'Project title' }),
				totalAmount: Type.Optional(Type.Number({ description: 'Total project amount in cents' })),
				date: Type.Optional(Type.String({ description: 'Project date in ISO format' }))
			}),
			execute: async ({ clientId, title, totalAmount, date }) => {
				const [created] = await db
					.insert(projects)
					.values({
						clientId,
						title,
						totalAmount: totalAmount ?? 0,
						date: date ? new Date(date) : new Date(),
						userId: userId!
					})
					.returning();
				return JSON.stringify(created);
			}
		})
	]
}));
