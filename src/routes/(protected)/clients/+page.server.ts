import { db } from '$lib/server/db';
import { clients, projects, files } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user)
		return {
			clients: [],
			projectsByClient: {},
			filesByClient: {},
			total: 0,
			page: 1,
			totalPages: 1
		};

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 20;
	const offset = (page - 1) * limit;

	const userId = locals.user.id;

	const [countResult] = await db
		.select({ total: count() })
		.from(clients)
		.where(eq(clients.userId, userId));

	const total = Number(countResult.total);
	const totalPages = Math.max(1, Math.ceil(total / limit));

	const clientList = await db
		.select()
		.from(clients)
		.where(eq(clients.userId, userId))
		.orderBy(clients.createdAt)
		.limit(limit)
		.offset(offset);

	const clientIds = clientList.map((c) => c.id);

	let projectsByClient: Record<string, number> = {};
	let filesByClient: Record<string, number> = {};

	if (clientIds.length > 0) {
		const projectCounts = await db
			.select({ clientId: projects.clientId, count: projects.id })
			.from(projects)
			.where(eq(projects.userId, userId))
			.groupBy(projects.clientId, projects.id);

		const projectCountMap = new Map<string, number>();
		for (const p of projectCounts) {
			projectCountMap.set(p.clientId, (projectCountMap.get(p.clientId) || 0) + 1);
		}
		projectsByClient = Object.fromEntries(projectCountMap);

		const fileCounts = await db
			.select({ clientId: files.clientId, count: files.id })
			.from(files)
			.groupBy(files.clientId, files.id);

		const fileCountMap = new Map<string, number>();
		for (const f of fileCounts) {
			fileCountMap.set(f.clientId, (fileCountMap.get(f.clientId) || 0) + 1);
		}
		filesByClient = Object.fromEntries(fileCountMap);
	}

	return {
		clients: clientList,
		projectsByClient,
		filesByClient,
		total,
		page,
		totalPages
	};
};
