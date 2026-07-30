import {
	getDashboardStats,
	getMonthlyRevenue,
	getDashboardLists
} from '$lib/server/services/dashboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			totalRevenue: 0,
			outstandingRevenue: 0,
			projectCount: 0,
			clientCount: 0,
			monthlyRevenue: [],
			needsAttention: [],
			recentPayments: []
		};
	}

	const [stats, monthlyRevenue, lists] = await Promise.all([
		getDashboardStats(locals.user.id),
		getMonthlyRevenue(locals.user.id),
		getDashboardLists(locals.user.id)
	]);

	return { ...stats, monthlyRevenue, ...lists };
};
