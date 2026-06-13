import { json } from '@sveltejs/kit';
import { getFileById, deleteFileRecord } from '$lib/server/services';
import { generateDownloadUrl, deleteStorageFile } from '$lib/server/services/storage';
import { unauthorized, notFound, handleApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const file = await getFileById(locals.user.id, params.id);
	if (!file) return notFound('File');

	try {
		const url = await generateDownloadUrl(file.storagePath);
		return json({ url, filename: file.filename, fileType: file.fileType });
	} catch (error) {
		return handleApiError(error);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return unauthorized();

	const file = await getFileById(locals.user.id, params.id);
	if (!file) return notFound('File');

	await deleteStorageFile(file.storagePath);
	await deleteFileRecord(file.id);

	return json({ success: true });
};
