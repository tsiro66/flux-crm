import type { LayoutServerLoad } from './$types';
import { generateDueRecurringPayments } from '$lib/server/services';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Lazy recurring-payment generation: no cron, so every protected page load
	// catches up any months due since the last visit. Cheap when nothing is due
	// (one indexed query). Failures must not break page loads.
	if (locals.user) {
		try {
			await generateDueRecurringPayments(locals.user.id);
		} catch (err) {
			console.error('Recurring payment generation failed:', err);
		}
	}

	return {
		user: locals.user
	};
};
