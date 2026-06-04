import { db } from '$lib/server/db';
import { projects, clients } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { totalRevenue: 0, outstandingRevenue: 0, projectCount: 0, clientCount: 0, monthlyRevenue: [] };

	const userId = locals.user.id;

	const [revenueResult] = await db
		.select({
			totalPaid: sql<number>`coalesce(sum(${projects.paidAmount}), 0)`,
			totalAmount: sql<number>`coalesce(sum(${projects.totalAmount}), 0)`
		})
		.from(projects)
		.where(eq(projects.userId, userId));

	const totalRevenue = Number(revenueResult.totalPaid) || 0;
	const totalAmount = Number(revenueResult.totalAmount) || 0;
	const outstandingRevenue = totalAmount - totalRevenue;

	const [projectCountResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(projects)
		.where(eq(projects.userId, userId));

	const [clientCountResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(clients)
		.where(eq(clients.userId, userId));

	const monthlyData = await db
		.select({
			month: sql<string>`to_char(${projects.date}, 'YYYY-MM')`,
			revenue: sql<number>`coalesce(sum(${projects.paidAmount}), 0)`
		})
		.from(projects)
		.where(eq(projects.userId, userId))
		.groupBy(sql`to_char(${projects.date}, 'YYYY-MM')`)
		.orderBy(sql`to_char(${projects.date}, 'YYYY-MM')`);

	return {
		totalRevenue,
		outstandingRevenue,
		projectCount: Number(projectCountResult.count) || 0,
		clientCount: Number(clientCountResult.count) || 0,
		monthlyRevenue: monthlyData
	};
};