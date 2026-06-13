<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Dialog,
		DialogHeader,
		DialogTitle,
		DialogContent,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { invalidateAll } from '$app/navigation';
	import { toastSuccess, toastError } from '$lib/stores/toast.svelte';

	let { open = $bindable(), projectId }: { open: boolean; projectId: string } = $props();

	let form = $state({ amount: '', date: '', note: '' });
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		if (open) {
			form = {
				amount: '',
				date: new Date().toISOString().split('T')[0],
				note: ''
			};
			error = '';
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		const res = await fetch('/api/payments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...form,
				projectId
			})
		});

		loading = false;

		if (!res.ok) {
			const err = await res.json();
			error = typeof err.error === 'string' ? err.error : 'Failed to add payment';
			toastError('Failed to add payment');
			return;
		}

		open = false;
		invalidateAll();
		toastSuccess('Payment added');
	}
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Add Payment</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleSubmit} class="space-y-4">
			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
			<div class="space-y-2">
				<Label for="payment-amount">Amount ($) *</Label>
				<Input
					id="payment-amount"
					type="number"
					step="0.01"
					min="0.01"
					bind:value={form.amount}
					placeholder="0.00"
					required
				/>
			</div>
			<div class="space-y-2">
				<Label for="payment-date">Date *</Label>
				<Input id="payment-date" type="date" bind:value={form.date} required />
			</div>
			<div class="space-y-2">
				<Label for="payment-note">Note</Label>
				<Input id="payment-note" bind:value={form.note} placeholder="Optional note" />
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={loading}>
					{loading ? 'Adding...' : 'Add Payment'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
