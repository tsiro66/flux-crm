import { db } from '$lib/server/db';
import { clients, projects, files } from '$lib/server/db/schema';
import { likePattern } from '$lib/server/db/like';
import { eq, count, ilike, and, or, asc, desc, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const SORT_FIELDS = ['name', 'email', 'projects'] as const;
type SortField = (typeof SORT_FIELDS)[number];

function parseSortField(v: string | null): SortField {
	return (SORT_FIELDS as readonly string[]).includes(v ?? '') ? (v as SortField) : 'name';
}

function parseSortDir(v: string | null): 'asc' | 'desc' {
	return v === 'desc' ? 'desc' : 'asc';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const empty = {
		clients: [] as typeof clients.$inferSelect[],
		projectsByClient: {} as Record<string, number>,
		filesByClient: {} as Record<string, number>,
		total: 0,
		page: 1,
		totalPages: 1,
		search: '',
		sortField: 'name' as SortField,
		sortDir: 'asc' as 'asc' | 'desc'
	};

	if (!locals.user) return empty;

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 20;
	const offset = (page - 1) * limit;
	const search = url.searchParams.get('search') || '';
	const sortField = parseSortField(url.searchParams.get('sort'));
	const sortDir = parseSortDir(url.searchParams.get('dir'));

	const userId = locals.user.id;

	const whereCondition = search
		? and(
				eq(clients.userId, userId),
				or(ilike(clients.name, likePattern(search)), ilike(clients.email, likePattern(search)))
			)
		: eq(clients.userId, userId);

	const [countResult] = await db.select({ total: count() }).from(clients).where(whereCondition);

	const total = Number(countResult.total);
	const totalPages = Math.max(1, Math.ceil(total / limit));

	// Sort by project count via a correlated scalar subquery. Null emails are
	// treated as '' (coalesce), matching the previous client-side behaviour for
	// sorted display.
	const projectCountExpr = sql<number>`(
		select count(*)::int
		from ${projects}
		where ${projects.clientId} = ${clients.id}
			and ${projects.userId} = ${userId}
	)`;
	const sortExpr =
		sortField === 'name'
			? clients.name
			: sortField === 'email'
				? sql<string>`coalesce(${clients.email}, '')`
				: projectCountExpr;

	const clientList = await db
		.select()
		.from(clients)
		.where(whereCondition)
		.orderBy(sortDir === 'asc' ? asc(sortExpr) : desc(sortExpr))
		.limit(limit)
		.offset(offset);

	const clientIds = clientList.map((c) => c.id);

	let projectsByClient: Record<string, number> = {};
	let filesByClient: Record<string, number> = {};

	if (clientIds.length > 0) {
		const projectCounts = await db
			.select({ clientId: projects.clientId, count: count() })
			.from(projects)
			.where(eq(projects.userId, userId))
			.groupBy(projects.clientId);

		projectsByClient = Object.fromEntries(projectCounts.map((p) => [p.clientId, Number(p.count)]));

		const fileCounts = await db
			.select({ clientId: files.clientId, count: count() })
			.from(files)
			.where(eq(files.userId, userId))
			.groupBy(files.clientId);

		filesByClient = Object.fromEntries(fileCounts.map((f) => [f.clientId, Number(f.count)]));
	}

	return {
		clients: clientList,
		projectsByClient,
		filesByClient,
		total,
		page,
		totalPages,
		search,
		sortField,
		sortDir
	};
};