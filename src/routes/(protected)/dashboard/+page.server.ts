import { getDashboardStats, getMonthlyRevenue } from '$lib/server/services/dashboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			totalRevenue: 0,
			outstandingRevenue: 0,
			projectCount: 0,
			clientCount: 0,
			monthlyRevenue: []
		};
	}

	const [stats, monthlyRevenue] = await Promise.all([
		getDashboardStats(locals.user.id),
		getMonthlyRevenue(locals.user.id)
	]);

	return { ...stats, monthlyRevenue };
};
