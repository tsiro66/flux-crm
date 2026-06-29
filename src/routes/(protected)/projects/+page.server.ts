import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { listProjects, type ProjectSortField } from '$lib/server/services/project';
import type { PageServerLoad } from './$types';

const SORT_FIELDS = ['title', 'client', 'total', 'remaining', 'date'] as const;
const INVOICE_VALUES = ['for_invoice', 'invoiced', 'no_invoice'] as const;
const PAYMENT_VALUES = ['not_paid', 'partial_payment', 'paid'] as const;

function parseSortField(v: string | null): ProjectSortField {
	return (SORT_FIELDS as readonly string[]).includes(v ?? '') ? (v as ProjectSortField) : 'remaining';
}

function parseSortDir(v: string | null): 'asc' | 'desc' {
	return v === 'asc' ? 'asc' : 'desc';
}

function parseEnum(v: string | null, allowed: readonly string[]): string | null {
	return v && allowed.includes(v) ? v : null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const empty = {
		projects: [] as Awaited<ReturnType<typeof listProjects>>['projects'],
		clients: [] as { id: string; name: string }[],
		total: 0,
		page: 1,
		totalPages: 1,
		search: '',
		filters: {
			invoice: null as string | null,
			payment: null as string | null,
			sort: 'remaining' as ProjectSortField,
			dir: 'desc' as 'asc' | 'desc'
		}
	};

	if (!locals.user) return empty;

	const userId = locals.user.id;

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 20;
	const search = url.searchParams.get('search') || '';
	const invoice = parseEnum(url.searchParams.get('invoice'), INVOICE_VALUES);
	const payment = parseEnum(url.searchParams.get('payment'), PAYMENT_VALUES);
	const sort = parseSortField(url.searchParams.get('sort'));
	// Default sort is "owes more" (remaining desc); only flip to asc on explicit
	// dir=asc so the default is stable even when the param is absent.
	const dir = sort === 'remaining' && !url.searchParams.has('dir')
		? 'desc'
		: parseSortDir(url.searchParams.get('dir'));

	const { projects, total } = await listProjects(userId, {
		invoice,
		payment,
		search,
		sort,
		dir,
		page,
		limit
	});

	const clientList = await db
		.select({ id: clients.id, name: clients.name })
		.from(clients)
		.where(eq(clients.userId, userId))
		.orderBy(clients.name);

	const totalPages = Math.max(1, Math.ceil(total / limit));

	return {
		projects,
		clients: clientList,
		total,
		page,
		totalPages,
		search,
		filters: { invoice, payment, sort, dir }
	};
};
