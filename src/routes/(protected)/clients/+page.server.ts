import { db } from '$lib/server/db';
import { clients, projects, files } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { clients: [], projectsByClient: {}, filesByClient: {} };

	const clientList = await db
		.select()
		.from(clients)
		.where(eq(clients.userId, locals.user.id))
		.orderBy(clients.createdAt);

	const clientIds = clientList.map((c) => c.id);

	let projectsByClient: Record<string, number> = {};
	let filesByClient: Record<string, number> = {};

	if (clientIds.length > 0) {
		const projectCounts = await db
			.select({ clientId: projects.clientId, count: projects.id })
			.from(projects)
			.where(eq(projects.userId, locals.user.id))
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
		filesByClient
	};
};