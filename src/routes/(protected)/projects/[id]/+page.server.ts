import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getProjectWithClient, listPaymentsForProject } from '$lib/server/services/project';
import { listAllClients } from '$lib/server/services/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const userId = locals.user.id;

	const project = await getProjectWithClient(userId, params.id);
	if (!project) throw error(404, 'Project not found');

	const payments = await listPaymentsForProject(userId, params.id);
	const clientsList = await listAllClients(userId);

	return { project, payments, clients: clientsList };
};
