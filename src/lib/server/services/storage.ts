import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

const BUCKET_ID = 'client-files';

let _admin: SupabaseClient | null = null;
function supabaseAdmin(): SupabaseClient {
	if (!_admin) {
		_admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
	}
	return _admin;
}

let bucketEnsured: Promise<void> | null = null;

async function ensureBucket(supabase: SupabaseClient) {
	if (!bucketEnsured) {
		bucketEnsured = (async () => {
			const { data: buckets } = await supabase.storage.listBuckets();
			const exists = buckets?.some((b) => b.id === BUCKET_ID);
			if (!exists) {
				await supabase.storage.createBucket(BUCKET_ID, {
					public: false,
					fileSizeLimit: 52428800,
					allowedMimeTypes: [
						'image/png',
						'image/jpeg',
						'image/gif',
						'image/webp',
						'application/pdf'
					]
				});
			}
		})();
	}
	await bucketEnsured;
}

export function generateStoragePath(userId: string, clientId: string, filename: string) {
	return `${userId}/${clientId}/${Date.now()}-${filename}`;
}

export async function generateUploadUrl(userId: string, clientId: string, filename: string) {
	await ensureBucket(supabaseAdmin());

	const storagePath = generateStoragePath(userId, clientId, filename);

	const { data, error } = await supabaseAdmin().storage
		.from(BUCKET_ID)
		.createSignedUploadUrl(storagePath);

	if (error) {
		console.error('Storage upload URL error:', error);
		throw new Error(error.message);
	}

	return { signedUrl: data.signedUrl, storagePath, token: data.token };
}

export async function generateDownloadUrl(storagePath: string) {
	const { data, error } = await supabaseAdmin().storage
		.from(BUCKET_ID)
		.createSignedUrl(storagePath, 3600);

	if (error) {
		throw new Error(error.message);
	}

	return data.signedUrl;
}

export async function deleteStorageFile(storagePath: string) {
	await supabaseAdmin().storage.from(BUCKET_ID).remove([storagePath]);
}
