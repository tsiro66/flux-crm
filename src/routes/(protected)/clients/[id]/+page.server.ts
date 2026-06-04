import { db } from '$lib/server/db';
import { clients, projects, files } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const [client] = await db
		.select()
		.from(clients)
		.where(and(eq(clients.id, params.id), eq(clients.userId, locals.user.id)));

	if (!client) throw error(404, 'Client not found');

	const clientProjects = await db
		.select()
		.from(projects)
		.where(and(eq(projects.clientId, params.id), eq(projects.userId, locals.user.id)))
		.orderBy(projects.createdAt);

	const clientFiles = await db
		.select()
		.from(files)
		.where(eq(files.clientId, params.id));

	return {
		client,
		projects: clientProjects,
		files: clientFiles
	};
};