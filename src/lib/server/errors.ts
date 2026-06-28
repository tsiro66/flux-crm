import { json } from '@sveltejs/kit';
import type { ZodError } from 'zod/v4';

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export function handleZodError(error: ZodError) {
	return json({ error: error.issues.map((i) => i.message).join(', ') }, { status: 400 });
}

export function handleApiError(error: unknown) {
	if (error instanceof ApiError) {
		return json({ error: error.message }, { status: error.status });
	}
	console.error('Unexpected error:', error);
	return json({ error: 'Internal server error' }, { status: 500 });
}

export function unauthorized() {
	return json({ error: 'Unauthorized' }, { status: 401 });
}

export function notFound(resource = 'Resource') {
	return json({ error: `${resource} not found` }, { status: 404 });
}

export function badRequest(message: string) {
	return json({ error: message }, { status: 400 });
}

export function tooManyRequests(message = 'Too many requests') {
	return json({ error: message }, { status: 429 });
}
