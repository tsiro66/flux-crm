import { db } from '$lib/server/db';
import { projects, clients, payments } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function getDashboardStats(userId: string) {
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

	return {
		totalRevenue,
		outstandingRevenue,
		projectCount: Number(projectCountResult.count) || 0,
		clientCount: Number(clientCountResult.count) || 0
	};
}

export async function getMonthlyRevenue(userId: string) {
	const monthlyData = await db
		.select({
			month: sql<string>`to_char(${payments.date}, 'YYYY-MM')`,
			revenue: sql<number>`coalesce(sum(${payments.amount}), 0)`
		})
		.from(payments)
		.where(eq(payments.userId, userId))
		.groupBy(sql`to_char(${payments.date}, 'YYYY-MM')`)
		.orderBy(sql`to_char(${payments.date}, 'YYYY-MM')`);

	const revenueMap = new Map(monthlyData.map((m) => [m.month, Number(m.revenue)]));
	const allMonths = generateMonthRange(monthlyData);

	return allMonths.map((month) => ({
		month,
		revenue: revenueMap.get(month) || 0
	}));
}

function generateMonthRange(monthlyData: { month: string }[]): string[] {
	if (monthlyData.length === 0) {
		const now = new Date();
		return [formatMonth(now.getFullYear(), now.getMonth() + 1)];
	}

	const months = monthlyData.map((m) => m.month).sort();
	const [firstYear, firstMonth] = months[0].split('-').map(Number);
	const [lastYear, lastMonth] = months[months.length - 1].split('-').map(Number);

	const start = new Date(firstYear, firstMonth - 1, 1);
	const end = new Date(lastYear, lastMonth - 1, 1);

	const now = new Date();
	const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	if (end < currentMonth) {
		end.setTime(currentMonth.getTime());
	}

	const result: string[] = [];
	const current = new Date(start);
	while (current <= end) {
		result.push(formatMonth(current.getFullYear(), current.getMonth() + 1));
		current.setMonth(current.getMonth() + 1);
	}

	return result;
}

function formatMonth(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, '0')}`;
}
