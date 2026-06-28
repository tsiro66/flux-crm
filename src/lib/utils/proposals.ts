// Proposal contract shared between the chat agent and the approval UI.
//
// The Flue agent's mutating tools (propose_*) do NOT write to the database.
// They return one of these descriptors as JSON in the tool_call event. The
// chat UI renders it as an approval card; on user confirm we call the existing
// validated REST endpoints. This keeps a single write path (Zod + ownership)
// and guarantees no data changes without explicit consent.

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
				totalAmount: number; // euros
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
				totalAmount: number; // euros
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

const PROPOSAL_ACTIONS = new Set<Proposal['action']>([
	'create_client',
	'update_client',
	'delete_client',
	'create_project',
	'update_project',
	'create_payment'
]);

// Best-effort parse of a tool result into a Proposal. Returns null if the
// payload isn't a recognised action (e.g. a read tool result).
export function parseProposal(raw: unknown): Proposal | null {
	if (typeof raw !== 'string') return null;
	let obj: unknown;
	try {
		obj = JSON.parse(raw);
	} catch {
		return null;
	}
	if (typeof obj !== 'object' || obj === null) return null;
	const o = obj as { action?: unknown };
	if (typeof o.action !== 'string' || !PROPOSAL_ACTIONS.has(o.action as Proposal['action'])) {
		return null;
	}
	return obj as Proposal;
}

export const PROPOSAL_TOOL_PREFIX = 'propose_';
export function isProposalToolName(name: string): boolean {
	return name.startsWith(PROPOSAL_TOOL_PREFIX);
}

// Execute a confirmed proposal against the REST API. Returns the fetch Response
// so the caller can branch on res.ok. Throws on network error.
export async function executeProposal(p: Proposal): Promise<Response> {
	switch (p.action) {
		case 'create_client':
			return fetch('/api/clients', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(p.fields)
			});
		case 'update_client':
			return fetch(`/api/clients/${p.clientId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(p.fields)
			});
		case 'delete_client':
			return fetch(`/api/clients/${p.clientId}`, { method: 'DELETE' });
		case 'create_project':
			return fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(p.fields)
			});
		case 'update_project':
			return fetch(`/api/projects/${p.projectId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(p.fields)
			});
		case 'create_payment':
			return fetch('/api/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(p.fields)
			});
	}
}

// Human-readable Greek label for a proposal's fields, shown on the approval card.
export function describeProposal(p: Proposal): string {
	switch (p.action) {
		case 'create_client': {
			const f = p.fields;
			const parts = [`Όνομα: ${f.name}`];
			if (f.email) parts.push(`Email: ${f.email}`);
			if (f.phone) parts.push(`Τηλέφωνο: ${f.phone}`);
			if (f.notes) parts.push(`Σημειώσεις: ${f.notes}`);
			return parts.join('\n');
		}
		case 'update_client': {
			const f = p.fields;
			const parts: string[] = [];
			if (f.name !== undefined) parts.push(`Όνομα: ${f.name}`);
			if (f.email !== undefined) parts.push(`Email: ${f.email}`);
			if (f.phone !== undefined) parts.push(`Τηλέφωνο: ${f.phone}`);
			if (f.notes !== undefined) parts.push(`Σημειώσεις: ${f.notes}`);
			return parts.join('\n') || 'Καμία αλλαγή';
		}
		case 'delete_client':
			return 'Ο πελάτης και όλα τα έργα/αρχεία του θα διαγραφούν.';
		case 'create_project': {
			const f = p.fields;
			const parts = [`Τίτλος: ${f.title}`, `Ποσό: ${f.totalAmount}€`];
			if (f.date) parts.push(`Ημερομηνία: ${f.date}`);
			if (f.invoiceStatus) parts.push(`Τιμολόγηση: ${labelInvoice(f.invoiceStatus)}`);
			return parts.join('\n');
		}
		case 'update_project': {
			const f = p.fields;
			const parts: string[] = [];
			if (f.title !== undefined) parts.push(`Τίτλος: ${f.title}`);
			if (f.totalAmount !== undefined) parts.push(`Ποσό: ${f.totalAmount}€`);
			if (f.date !== undefined) parts.push(`Ημερομηνία: ${f.date}`);
			if (f.invoiceStatus !== undefined) parts.push(`Τιμολόγηση: ${labelInvoice(f.invoiceStatus)}`);
			if (f.paymentStatus !== undefined) parts.push(`Πληρωμή: ${labelPayment(f.paymentStatus)}`);
			return parts.join('\n') || 'Καμία αλλαγή';
		}
		case 'create_payment': {
			const f = p.fields;
			const parts = [`Ποσό: ${f.amount}€`, `Ημερομηνία: ${f.date}`];
			if (f.note) parts.push(`Σημείωση: ${f.note}`);
			return parts.join('\n');
		}
	}
}

function labelInvoice(s: string): string {
	switch (s) {
		case 'for_invoice':
			return 'Προς τιμολόγηση';
		case 'invoiced':
			return 'Τιμολογημένο';
		case 'no_invoice':
			return 'Χωρίς τιμολόγιο';
		default:
			return s;
	}
}
function labelPayment(s: string): string {
	switch (s) {
		case 'not_paid':
			return 'Απλήρωτο';
		case 'partial_payment':
			return 'Μερική πληρωμή';
		case 'paid':
			return 'Πληρωμένο';
		default:
			return s;
	}
}
