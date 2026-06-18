<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { invalidateAll } from '$app/navigation';

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
			isSaving = true;
			await fetch(`/api/clients/${clientId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notes: currentNotes })
			});
			await invalidateAll();
			isSaving = false;
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
