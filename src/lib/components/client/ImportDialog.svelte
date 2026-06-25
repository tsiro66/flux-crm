<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogHeader,
		DialogTitle,
		DialogContent,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { invalidateAll } from '$app/navigation';
	import { toastSuccess, toastError } from '$lib/stores/toast.svelte';
	import { FileUp } from '@lucide/svelte';

	type Mode = 'clients' | 'projects';

	type ImportResult = {
		created: number;
		updated: number;
		skipped: number;
		errors: { row: number; message: string }[];
	};

	const templates: Record<Mode, string[]> = {
		clients: ['name', 'email', 'phone', 'notes'],
		projects: [
			'clientEmail',
			'clientName',
			'title',
			'totalAmount',
			'paidAmount',
			'invoiceStatus',
			'paymentStatus',
			'date'
		]
	};

	let { open = $bindable() }: { open: boolean } = $props();

	let mode = $state<Mode>('clients');
	let file = $state<File | null>(null);
	let loading = $state(false);
	let error = $state('');
	let result = $state<ImportResult | null>(null);

	$effect(() => {
		if (open) {
			mode = 'clients';
			file = null;
			loading = false;
			error = '';
			result = null;
		}
	});

	function handleFile(e: Event) {
		const input = e.target as HTMLInputElement;
		file = input.files?.[0] ?? null;
		error = '';
		result = null;
	}

	function downloadTemplate() {
		const csv = templates[mode].join(',') + '\n';
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${mode}-template.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!file) {
			error = 'Please choose a CSV file';
			return;
		}

		loading = true;
		error = '';
		result = null;

		const fd = new FormData();
		fd.append('file', file);

		const res = await fetch(`/api/${mode}/import`, { method: 'POST', body: fd });

		loading = false;

		if (!res.ok) {
			const err = await res.json();
			error = typeof err.error === 'string' ? err.error : 'Import failed';
			toastError('Import failed');
			return;
		}

		const data = await res.json();
		result = data;
		invalidateAll();
		const total = data.created + data.updated;
		toastSuccess(`Imported ${total} ${mode}${total !== 1 ? 's' : ''}`);
	}
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Import CSV</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleSubmit} class="space-y-4">
			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}

			<div class="space-y-2">
				<label for="import-mode" class="text-sm font-medium">Data type</label>
				<select
					id="import-mode"
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					bind:value={mode}
					onchange={() => {
						file = null;
						result = null;
						error = '';
					}}
				>
					<option value="clients">Clients</option>
					<option value="projects">Projects</option>
				</select>
				{#if mode === 'projects'}
					<p class="text-xs text-muted-foreground">
						Projects are matched to clients by email (or name). Import clients first.
					</p>
				{/if}
			</div>

			<div class="space-y-2">
				<label for="import-file" class="text-sm font-medium">CSV file</label>
				<div class="flex items-center gap-2">
					<input
						id="import-file"
						type="file"
						accept=".csv"
						onchange={handleFile}
						class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
					/>
				</div>
				{#if file}
					<p class="text-xs text-muted-foreground">{file.name}</p>
				{/if}
			</div>

			<button
				type="button"
				onclick={downloadTemplate}
				class="text-sm text-primary underline-offset-4 hover:underline"
			>
				Download {mode} template
			</button>

			{#if result}
				<div class="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
					<div class="flex gap-4">
						<span class="text-green-600">Created: {result.created}</span>
						<span class="text-blue-600">Updated: {result.updated}</span>
						<span class="text-amber-600">Skipped: {result.skipped}</span>
					</div>
					{#if result.errors.length > 0}
						<div class="max-h-40 overflow-y-auto text-xs">
							{#each result.errors as err, i (i)}
								<p class="text-destructive">
									{#if err.row}Row {err.row}:
									{/if}{err.message}
								</p>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Close</Button>
				<Button type="submit" disabled={loading || !file}>
					<FileUp class="h-4 w-4" />
					{loading ? 'Importing...' : 'Import'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
