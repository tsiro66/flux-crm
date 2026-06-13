import { db } from '$lib/server/db';
import { projects, clients } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { projects: [], clientMap: {} };

	const projectList = await db
		.select({
			id: projects.id,
			title: projects.title,
			clientId: projects.clientId,
			totalAmount: projects.totalAmount,
			paidAmount: projects.paidAmount,
			invoiceStatus: projects.invoiceStatus,
			paymentStatus: projects.paymentStatus,
			date: projects.date,
			createdAt: projects.createdAt
		})
		.from(projects)
		.where(eq(projects.userId, locals.user.id))
		.orderBy(projects.createdAt);

	const clientList = await db
		.select({ id: clients.id, name: clients.name })
		.from(clients)
		.where(eq(clients.userId, locals.user.id));

	const clientMap = Object.fromEntries(clientList.map((c) => [c.id, c.name]));

	return {
		projects: projectList,
		clientMap
	};
};
