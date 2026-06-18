import { db } from '$lib/server/db';
import { clients, projects, files } from '$lib/server/db/schema';
import { eq, count, ilike, and, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		return {
			clients: [],
			projectsByClient: {},
			filesByClient: {},
			total: 0,
			page: 1,
			totalPages: 1,
			search: ''
		};
	}

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 20;
	const offset = (page - 1) * limit;
	const search = url.searchParams.get('search') || '';

	const userId = locals.user.id;

	const whereCondition = search
		? and(
				eq(clients.userId, userId),
				or(ilike(clients.name, `%${search}%`), ilike(clients.email, `%${search}%`))
			)
		: eq(clients.userId, userId);

	const [countResult] = await db.select({ total: count() }).from(clients).where(whereCondition);

	const total = Number(countResult.total);
	const totalPages = Math.max(1, Math.ceil(total / limit));

	const clientList = await db
		.select()
		.from(clients)
		.where(whereCondition)
		.orderBy(clients.createdAt)
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
		search
	};
};
