<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Dialog,
		DialogHeader,
		DialogTitle,
		DialogContent,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { invalidateAll } from '$app/navigation';
	import { toastSuccess, toastError } from '$lib/stores/toast.svelte';

	type Client = {
		id: string;
		name: string;
		email: string | null;
		phone: string | null;
		notes: string | null;
	};

	let { open = $bindable(), client }: { open: boolean; client: Client } = $props();

	let form = $state({ name: '', email: '', phone: '', notes: '' });
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		if (open) {
			form = {
				name: client.name,
				email: client.email || '',
				phone: client.phone || '',
				notes: client.notes || ''
			};
			error = '';
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		const res = await fetch(`/api/clients/${client.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form)
		});

		loading = false;

		if (!res.ok) {
			const err = await res.json();
			error = typeof err.error === 'string' ? err.error : 'Validation error';
			toastError('Failed to update client');
			return;
		}

		open = false;
		invalidateAll();
		toastSuccess('Client updated');
	}
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Edit Client</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleSubmit} class="space-y-4">
			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
			<div class="space-y-2">
				<Label for="edit-name">Name *</Label>
				<Input id="edit-name" bind:value={form.name} required />
			</div>
			<div class="space-y-2">
				<Label for="edit-email">Email</Label>
				<Input id="edit-email" type="email" bind:value={form.email} />
			</div>
			<div class="space-y-2">
				<Label for="edit-phone">Phone</Label>
				<Input id="edit-phone" bind:value={form.phone} />
			</div>
			<div class="space-y-2">
				<Label for="edit-notes">Notes</Label>
				<Textarea id="edit-notes" bind:value={form.notes} />
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={loading}>
					{loading ? 'Saving...' : 'Save'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
