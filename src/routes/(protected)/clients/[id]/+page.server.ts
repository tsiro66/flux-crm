import { db } from '$lib/server/db';
import { clients, projects, files, payments } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
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
		.where(and(eq(files.clientId, params.id), eq(files.userId, locals.user.id)));

	let projectPayments: { projectId: string; payments: (typeof payments.$inferSelect)[] }[] = [];

	if (clientProjects.length > 0) {
		const projectIds = clientProjects.map((p) => p.id);
		const allPayments = await db
			.select()
			.from(payments)
			.where(and(inArray(payments.projectId, projectIds), eq(payments.userId, locals.user.id)))
			.orderBy(payments.createdAt);

		const paymentsByProject = new Map<string, (typeof payments.$inferSelect)[]>();
		for (const payment of allPayments) {
			const existing = paymentsByProject.get(payment.projectId) || [];
			existing.push(payment);
			paymentsByProject.set(payment.projectId, existing);
		}

		projectPayments = clientProjects.map((p) => ({
			projectId: p.id,
			payments: paymentsByProject.get(p.id) || []
		}));
	}

	return {
		client,
		projects: clientProjects,
		files: clientFiles,
		projectPayments
	};
};
