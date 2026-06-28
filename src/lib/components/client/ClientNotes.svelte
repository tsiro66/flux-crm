<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { invalidateAll } from '$app/navigation';
	import { toastError, toastSuccess } from '$lib/stores/toast.svelte';

	let {
		clientId,
		initialNotes
	}: {
		clientId: string;
		initialNotes: string;
	} = $props();

	// svelte-ignore state_referenced_locally
	let currentNotes = $state(initialNotes);
	let isSaving = $state(false);
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (!isSaving) {
			currentNotes = initialNotes;
		}
	});

	async function handleNotesChange() {
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			// Don't persist if nothing actually changed since the last save.
			if (currentNotes === initialNotes) return;
			isSaving = true;
			try {
				const res = await fetch(`/api/clients/${clientId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ notes: currentNotes })
				});
				if (!res.ok) {
					toastError('Failed to save notes');
					return;
				}
				toastSuccess('Notes saved');
				await invalidateAll();
			} finally {
				isSaving = false;
			}
		}, 1000);
	}
</script>

<div>
	<h3 class="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
		Notes {isSaving ? '(saving...)' : ''}
	</h3>
	<Textarea
		placeholder="Auto-saving notes..."
		bind:value={currentNotes}
		oninput={handleNotesChange}
		rows={6}
		class="resize-none"
	/>
</div>
