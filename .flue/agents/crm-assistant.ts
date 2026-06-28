import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
	createAgent,
	defineTool,
	Type,
	type AgentRouteHandler,
	type AgentWebSocketHandler
} from '@flue/runtime';
import { eq, and, ilike } from 'drizzle-orm';
import { clients, projects, payments } from '../../src/lib/server/db/schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: { clients, projects, payments } });

export const route: AgentRouteHandler = async (_c, next) => next();
export const websocket: AgentWebSocketHandler = async (_c, next) => next();

// Escape SQL LIKE wildcards so user-provided search can't truncate/expand a
// pattern via `%` or `_`.
function escapeLike(str: string): string {
	return str.replace(/[%_\\]/g, '\\$&');
}

// Structured proposal returned by every mutating tool. These tools NEVER write
// to the database — they return an action descriptor that the chat UI renders
// as an approval card. The user confirms; the browser then calls the existing
// validated REST endpoints. This keeps a single write path (Zod + ownership
// checks) and guarantees no data changes happen without explicit consent.
export type Proposal =
	| {
			action: 'create_client';
			title: string;
			summary: string;
			fields: { name: string; email: string; phone: string; notes: string };
	  }
	| {
			action: 'update_client';
			title: string;
			summary: string;
			clientId: string;
			fields: Partial<{ name: string; email: string; phone: string; notes: string }>;
	  }
	| {
			action: 'delete_client';
			title: string;
			summary: string;
			clientId: string;
			fields: Record<string, never>;
	  }
	| {
			action: 'create_project';
			title: string;
			summary: string;
			fields: {
				clientId: string;
				title: string;
				totalAmount: number; // euros, not cents
				invoiceStatus?: string;
				paymentStatus?: string;
				date?: string;
			};
	  }
	| {
			action: 'update_project';
			title: string;
			summary: string;
			projectId: string;
			fields: Partial<{
				title: string;
				totalAmount: number; // euros, not cents
				invoiceStatus: string;
				paymentStatus: string;
				date: string;
			}>;
	  }
	| {
			action: 'create_payment';
			title: string;
			summary: string;
			fields: { projectId: string; amount: number; date: string; note?: string };
	  };

function proposal(p: Proposal): string {
	return JSON.stringify(p);
}

// Model is env-switchable so we can change it without code edits.
//   FLUE_MODEL=anthropic/claude-haiku-4-5  (default — strongest instruction
//                                            discipline for the confirm-before-
//                                            change UX and best tool-call accuracy)
//   FLUE_MODEL=google/gemini-2.5-flash      (cheaper fallback, still good Greek)
// Provider keys: ANTHROPIC_API_KEY / GEMINI_API_KEY supplied as Fly secrets.
const model = process.env.FLUE_MODEL ?? 'anthropic/claude-haiku-4-5';

export default createAgent(({ id: userId }) => ({
	model,
	instructions: `Είσαι ο βοηθός του Flux CRM. Μιλάς Ελληνικά από προεπιλογή (εκτός αν ο χρήστης ζητήσει άλλη γλώσσα). Βοηθάς τους χρήστες να διαχειριστούν τους πελάτες και τα έργα τους.

Αυτό μπορείς να κάνεις:
- Λίστα και αναζήτηση πελατών με την list_clients (με search κατά όνομα).
- Λεπτομέρειες πελάτη (και τα έργα του) με την get_client.
- Λίστα και αναζήτηση έργων με την list_projects (με search κατά τίτλο).
- Λεπτομέρειες έργου (και τις πληρωμές του) με την get_project.

Για ΟΠΟΙΑΔΗΠΟΤΕ αλλαγή δεδομένων (δημιουργία/ενημέρωση/διαγραφή πελάτη, δημιουργία/ενημέρωση έργου, καταχώρηση πληρωμής) ΠΡΕΠΕΙ να χρησιμοποιήσεις το αντίστοιχο tool propose_*. Αυτά τα tools ΔΕΝ εκτελούν την αλλαγή — επιστρέφουν μια πρόταση που ο χρήστης βλέπει και πρέπει να επιβεβαιώσει ρητά.

ΠΟΤΕ μη λες ότι μια αλλαγή έγινε αν δεν έχεις επιβεβαίωση από το σύστημα. Μετά από κάθε propose_*, πες στον χρήστη: «Έχω ετοιμάσει την αλλαγή. Επιβεβαίωσε για να εφαρμοστεί.» και περίμενε.

Ποσά: δίνε τα ποσά σε ευρώ (όχι σεντς). Π.χ. 1500 σημαίνει 1500€.
Καταστάσεις τιμολογίου: for_invoice, invoiced, no_invoice.
Καταστάσεις πληρωμής: not_paid, partial_payment, paid.

Όταν ο χρήστης αναφέρεται σε πελάτη ή έργο με το όνομα, ψάξε το πρώτα με list_clients / list_projects (με search) και χρησιμοποίησε το ID που θα επιστραφεί. Ποτέ μην ζητάς UUID από τον χρήστη.

Σε χαιρετισμό (Γεια, Καλημέρα, hi), απάντησε σύντομα και φιλικά και ρώτησε πώς μπορείς να βοηθήσεις.

Απάντα συνοπτικά. Σε λίστες χρησιμοποίησε κουκκίδες. Σε λεπτομέρειες παρουσίασε ξεκάθαρα.`,
	tools: [
		// ──────────────────────────── Read tools ────────────────────────────
		defineTool({
			name: 'list_clients',
			description:
				'List all clients for the current user. Optionally filter by name using the search parameter.',
			parameters: Type.Object({
				search: Type.Optional(Type.String({ description: 'Search filter for client name' }))
			}),
			execute: async ({ search }) => {
				if (search) {
					const pattern = `%${escapeLike(search)}%`;
					const result = await db
						.select({
							id: clients.id,
							name: clients.name,
							email: clients.email,
							phone: clients.phone,
							createdAt: clients.createdAt
						})
						.from(clients)
						.where(and(eq(clients.userId, userId!), ilike(clients.name, pattern)));
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
					.where(and(eq(projects.clientId, clientId), eq(projects.userId, userId!)));

				// Amounts in DB are in cents; surface them as euros for the model.
				return JSON.stringify({
					...clientRecord,
					projects: clientProjects.map((p) => ({
						...p,
						totalAmountEuros: p.totalAmount / 100,
						paidAmountEuros: p.paidAmount / 100
					}))
				});
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
				const baseSelect = {
					id: projects.id,
					title: projects.title,
					clientId: projects.clientId,
					totalAmount: projects.totalAmount,
					paidAmount: projects.paidAmount,
					paymentStatus: projects.paymentStatus,
					invoiceStatus: projects.invoiceStatus,
					date: projects.date,
					createdAt: projects.createdAt
				};
				if (search) {
					const pattern = `%${escapeLike(search)}%`;
					const result = await db
						.select(baseSelect)
						.from(projects)
						.where(and(eq(projects.userId, userId!), ilike(projects.title, pattern)));
					return JSON.stringify(result);
				}
				const result = await db
					.select(baseSelect)
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
					.where(and(eq(payments.projectId, projectId), eq(payments.userId, userId!)));

				return JSON.stringify({
					...project,
					totalAmountEuros: project.totalAmount / 100,
					paidAmountEuros: project.paidAmount / 100,
					payments: projectPayments.map((p) => ({ ...p, amountEuros: p.amount / 100 }))
				});
			}
		}),

		// ──────────────────────────── Proposal tools ────────────────────────
		defineTool({
			name: 'propose_create_client',
			description:
				'Propose creating a new client. Does NOT make any change — returns a proposal the user must confirm. Use this whenever the user wants to add a new client.',
			parameters: Type.Object({
				name: Type.String({ description: 'Client name' }),
				email: Type.Optional(Type.String({ description: 'Client email address (may be empty)' })),
				phone: Type.Optional(Type.String({ description: 'Client phone number (may be empty)' })),
				notes: Type.Optional(Type.String({ description: 'Notes about the client (may be empty)' }))
			}),
			execute: async ({ name, email, phone, notes }) =>
				proposal({
					action: 'create_client',
					title: 'Νέος πελάτης',
					summary: `Δημιουργία πελάτη «${name}».`,
					fields: {
						name,
						email: email ?? '',
						phone: phone ?? '',
						notes: notes ?? ''
					}
				})
		}),
		defineTool({
			name: 'propose_update_client',
			description:
				'Propose updating an existing client. Does NOT make any change — returns a proposal the user must confirm. Only include the fields the user wants changed.',
			parameters: Type.Object({
				clientId: Type.String({ description: 'The UUID of the client to update' }),
				name: Type.Optional(Type.String({ description: 'Updated client name' })),
				email: Type.Optional(Type.String({ description: 'Updated client email address' })),
				phone: Type.Optional(Type.String({ description: 'Updated client phone number' })),
				notes: Type.Optional(Type.String({ description: 'Updated notes about the client' }))
			}),
			execute: async ({ clientId, name, email, phone, notes }) => {
				const fields: Partial<{ name: string; email: string; phone: string; notes: string }> = {};
				if (name !== undefined) fields.name = name;
				if (email !== undefined) fields.email = email;
				if (phone !== undefined) fields.phone = phone;
				if (notes !== undefined) fields.notes = notes;
				return proposal({
					action: 'update_client',
					title: 'Ενημέρωση πελάτη',
					summary: `Ενημέρωση στοιχείων πελάτη ${clientId}.`,
					clientId,
					fields
				});
			}
		}),
		defineTool({
			name: 'propose_delete_client',
			description:
				'Propose deleting a client (also deletes their projects and files). Does NOT make any change — returns a proposal the user must confirm.',
			parameters: Type.Object({
				clientId: Type.String({ description: 'The UUID of the client to delete' })
			}),
			execute: async ({ clientId }) =>
				proposal({
					action: 'delete_client',
					title: 'Διαγραφή πελάτη',
					summary: `Διαγραφή πελάτη ${clientId} και όλων των έργων/αρχείων του.`,
					clientId,
					fields: {}
				})
		}),
		defineTool({
			name: 'propose_create_project',
			description:
				'Propose creating a new project for a client. Does NOT make any change — returns a proposal the user must confirm. totalAmount is in EUROS (not cents).',
			parameters: Type.Object({
				clientId: Type.String({ description: 'The UUID of the client this project belongs to' }),
				title: Type.String({ description: 'Project title' }),
				totalAmount: Type.Optional(
					Type.Number({ description: 'Total project amount in EUROS, e.g. 1500 for 1500€' })
				),
				invoiceStatus: Type.Optional(
					Type.String({ description: 'One of: for_invoice, invoiced, no_invoice' })
				),
				paymentStatus: Type.Optional(
					Type.String({ description: 'One of: not_paid, partial_payment, paid' })
				),
				date: Type.Optional(Type.String({ description: 'Project date in ISO format (YYYY-MM-DD)' }))
			}),
			execute: async ({ clientId, title, totalAmount, invoiceStatus, paymentStatus, date }) =>
				proposal({
					action: 'create_project',
					title: 'Νέο έργο',
					summary: `Δημιουργία έργου «${title}» (${totalAmount ?? 0}€).`,
					fields: {
						clientId,
						title,
						totalAmount: totalAmount ?? 0,
						invoiceStatus,
						paymentStatus,
						date
					}
				})
		}),
		defineTool({
			name: 'propose_update_project',
			description:
				'Propose updating an existing project. Does NOT make any change — returns a proposal the user must confirm. Only include the fields the user wants changed. totalAmount is in EUROS (not cents). Do NOT set paidAmount here — use propose_record_payment to record a payment.',
			parameters: Type.Object({
				projectId: Type.String({ description: 'The UUID of the project to update' }),
				title: Type.Optional(Type.String({ description: 'Updated project title' })),
				totalAmount: Type.Optional(
					Type.Number({ description: 'Updated total amount in EUROS, e.g. 1500 for 1500€' })
				),
				invoiceStatus: Type.Optional(
					Type.String({ description: 'One of: for_invoice, invoiced, no_invoice' })
				),
				paymentStatus: Type.Optional(
					Type.String({ description: 'One of: not_paid, partial_payment, paid' })
				),
				date: Type.Optional(Type.String({ description: 'Updated project date in YYYY-MM-DD' }))
			}),
			execute: async ({ projectId, title, totalAmount, invoiceStatus, paymentStatus, date }) => {
				const fields: Partial<{
					title: string;
					totalAmount: number;
					invoiceStatus: string;
					paymentStatus: string;
					date: string;
				}> = {};
				if (title !== undefined) fields.title = title;
				if (totalAmount !== undefined) fields.totalAmount = totalAmount;
				if (invoiceStatus !== undefined) fields.invoiceStatus = invoiceStatus;
				if (paymentStatus !== undefined) fields.paymentStatus = paymentStatus;
				if (date !== undefined) fields.date = date;
				return proposal({
					action: 'update_project',
					title: 'Ενημέρωση έργου',
					summary: `Ενημέρωση έργου ${projectId}.`,
					projectId,
					fields
				});
			}
		}),
		defineTool({
			name: 'propose_record_payment',
			description:
				'Propose recording a new payment against a project. Does NOT make any change — returns a proposal the user must confirm. amount is in EUROS (not cents). To change the paid total of a project, record payments here rather than editing the project directly.',
			parameters: Type.Object({
				projectId: Type.String({ description: 'The UUID of the project the payment applies to' }),
				amount: Type.Number({ description: 'Payment amount in EUROS, e.g. 500 for 500€' }),
				date: Type.String({ description: 'Payment date in YYYY-MM-DD' }),
				note: Type.Optional(Type.String({ description: 'Optional note for the payment' }))
			}),
			execute: async ({ projectId, amount, date, note }) =>
				proposal({
					action: 'create_payment',
					title: 'Καταχώρηση πληρωμής',
					summary: `Καταχώρηση πληρωμής ${amount}€ στο έργο ${projectId}.`,
					fields: { projectId, amount, date, note }
				})
		})
	]
}));
