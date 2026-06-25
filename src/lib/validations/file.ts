import { z } from 'zod/v4';

export const createFileSchema = z.object({
	clientId: z.string().uuid('Invalid client ID'),
	storagePath: z.string().min(1, 'Storage path is required'),
	filename: z.string().min(1, 'Filename is required'),
	fileType: z.string().min(1, 'File type is required')
});

export type CreateFileInput = z.infer<typeof createFileSchema>;
