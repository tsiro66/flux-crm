<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogHeader,
		DialogTitle,
		DialogContent,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { invalidateAll } from '$app/navigation';
	import { toastSuccess, toastError } from '$lib/stores/toast.svelte';
	import { Upload, FileText } from '@lucide/svelte';

	let { clientId, files }: { clientId: string; files: Array<{ id: string; filename: string }> } =
		$props();

	let showUploadDialog = $state(false);
	let uploadLoading = $state(false);
	let uploadProgress = $state(0);
	let uploadError = $state('');

	let deleteFileDialog = $state(false);
	let deleteFileId = $state('');
	let deleteFileLoading = $state(false);

	async function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploadLoading = true;
		uploadProgress = 0;
		uploadError = '';

		try {
			const res = await fetch('/api/files/upload-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: file.name,
					contentType: file.type,
					clientId
				})
			});

			if (!res.ok) {
				uploadError = 'Failed to get upload URL';
				uploadLoading = false;
				toastError('Failed to get upload URL');
				return;
			}

			const { signedUrl, storagePath } = await res.json();

			const uploadOk = await new Promise<boolean>((resolve) => {
				const xhr = new XMLHttpRequest();
				xhr.open('PUT', signedUrl);
				xhr.setRequestHeader('Content-Type', file.type);

				xhr.upload.onprogress = (event) => {
					if (event.lengthComputable) {
						uploadProgress = Math.round((event.loaded / event.total) * 100);
					}
				};

				xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
				xhr.onerror = () => resolve(false);
				xhr.send(file);
			});

			if (!uploadOk) {
				uploadError = 'Failed to upload file';
				uploadLoading = false;
				toastError('Failed to upload file');
				return;
			}

			const fileRes = await fetch('/api/files', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clientId,
					storagePath,
					filename: file.name,
					fileType: file.type
				})
			});

			if (!fileRes.ok) {
				uploadError = 'Failed to save file record';
				uploadLoading = false;
				toastError('Failed to save file record');
				return;
			}

			showUploadDialog = false;
			toastSuccess('File uploaded');
			invalidateAll();
		} catch {
			uploadError = 'Upload failed';
			toastError('Upload failed');
		}

		uploadLoading = false;
	}

	async function handleDownloadFile(fileId: string) {
		const res = await fetch(`/api/files/${fileId}`);
		if (!res.ok) return;
		const { url } = await res.json();
		window.open(url, '_blank');
	}

	async function handleDeleteFile() {
		deleteFileLoading = true;
		const res = await fetch(`/api/files/${deleteFileId}`, { method: 'DELETE' });
		deleteFileLoading = false;
		deleteFileDialog = false;
		if (res.ok) {
			toastSuccess('File deleted');
			invalidateAll();
		} else {
			toastError('Failed to delete file');
		}
	}
</script>

<div>
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Files</h3>
		<Button
			size="sm"
			variant="outline"
			onclick={() => (showUploadDialog = true)}
			class="h-7 gap-1.5 text-xs"
		>
			<Upload class="h-3 w-3" />
			Upload
		</Button>
	</div>
	{#if files.length === 0}
		<p class="text-sm text-muted-foreground">No files uploaded yet.</p>
	{:else}
		<div class="space-y-1.5">
			{#each files as file (file.id)}
				<div
					class="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
					role="button"
					tabindex="0"
					onclick={() => handleDownloadFile(file.id)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleDownloadFile(file.id);
						}
					}}
				>
					<div class="flex min-w-0 items-center gap-2">
						<FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
						<span class="truncate font-medium">{file.filename}</span>
					</div>
					<button
						class="text-xs text-muted-foreground transition-colors hover:text-destructive"
						onclick={(e: MouseEvent) => {
							e.stopPropagation();
							deleteFileId = file.id;
							deleteFileDialog = true;
						}}
					>
						Remove
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Dialog bind:open={showUploadDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Upload File</DialogTitle>
		</DialogHeader>
		{#if uploadError}
			<p class="text-sm text-destructive">{uploadError}</p>
		{/if}
		<div class="space-y-4">
			<Input
				type="file"
				accept="image/*,.pdf"
				onchange={handleFileUpload}
				disabled={uploadLoading}
			/>
			{#if uploadLoading}
				<div class="space-y-1">
					<div class="h-2 overflow-hidden rounded-full bg-muted">
						<div
							class="h-full rounded-full bg-primary transition-all duration-300"
							style="width: {uploadProgress}%"
						></div>
					</div>
					<p class="text-xs text-muted-foreground">{uploadProgress}% uploaded</p>
				</div>
			{/if}
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => (showUploadDialog = false)}>Close</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<Dialog bind:open={deleteFileDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Delete File</DialogTitle>
		</DialogHeader>
		<p class="text-sm text-muted-foreground">
			Are you sure you want to delete this file? This action cannot be undone.
		</p>
		<DialogFooter>
			<Button variant="outline" onclick={() => (deleteFileDialog = false)}>Cancel</Button>
			<Button variant="destructive" disabled={deleteFileLoading} onclick={handleDeleteFile}>
				{deleteFileLoading ? 'Deleting...' : 'Delete'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
