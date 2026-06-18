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
	import { toDollars } from '$lib/utils';
	import type { Payment } from '$lib/server/db/types';

	let {
		open = $bindable(),
		projectId,
		payment = null
	}: {
		open: boolean;
		projectId: string;
		payment?: Payment | null;
	} = $props();

	const isEditing = $derived(payment !== null);

	let form = $state({ amount: '', date: '', note: '' });
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		if (open) {
			if (payment) {
				form = {
					amount: String(toDollars(payment.amount)),
					date: new Date(payment.date).toISOString().split('T')[0],
					note: payment.note || ''
				};
			} else {
				form = {
					amount: '',
					date: new Date().toISOString().split('T')[0],
					note: ''
				};
			}
			error = '';
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		const url = isEditing ? `/api/payments/${payment!.id}` : '/api/payments';
		const method = isEditing ? 'PUT' : 'POST';

		const body: Record<string, unknown> = { ...form };
		if (!isEditing) body.projectId = projectId;

		const res = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		loading = false;

		if (!res.ok) {
			const err = await res.json();
			error =
				typeof err.error === 'string'
					? err.error
					: `Failed to ${isEditing ? 'update' : 'add'} payment`;
			toastError(`Failed to ${isEditing ? 'update' : 'add'} payment`);
			return;
		}

		open = false;
		invalidateAll();
		toastSuccess(`Payment ${isEditing ? 'updated' : 'added'}`);
	}
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{isEditing ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
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
					{loading ? (isEditing ? 'Saving...' : 'Adding...') : isEditing ? 'Save' : 'Add Payment'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
