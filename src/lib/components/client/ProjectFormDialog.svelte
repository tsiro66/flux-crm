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

	type Project = {
		id: string;
		title: string;
		totalAmount: number;
		invoiceStatus: string;
		paymentStatus: string;
		date: Date | null;
	};

	let {
		open = $bindable(),
		clientId,
		project
	}: {
		open: boolean;
		clientId: string;
		project?: Project | null;
	} = $props();

	let form = $state({
		title: '',
		totalAmount: '0',
		invoiceStatus: 'for_invoice',
		paymentStatus: 'not_paid',
		date: ''
	});
	let loading = $state(false);
	let error = $state('');

	let isEditing = $derived(project !== null && project !== undefined);

	$effect(() => {
		if (open) {
			if (project) {
				form = {
					title: project.title,
					totalAmount: String(project.totalAmount / 100),
					invoiceStatus: project.invoiceStatus,
					paymentStatus: project.paymentStatus,
					date: project.date ? new Date(project.date).toISOString().split('T')[0] : ''
				};
			} else {
				form = {
					title: '',
					totalAmount: '0',
					invoiceStatus: 'for_invoice',
					paymentStatus: 'not_paid',
					date: new Date().toISOString().split('T')[0]
				};
			}
			error = '';
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		const url = isEditing ? `/api/projects/${project!.id}` : '/api/projects';
		const method = isEditing ? 'PUT' : 'POST';
		const body = isEditing ? form : { ...form, clientId };

		const res = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		loading = false;

		if (!res.ok) {
			const err = await res.json();
			error = typeof err.error === 'string' ? err.error : 'Validation error';
			toastError(isEditing ? 'Failed to update project' : 'Failed to create project');
			return;
		}

		open = false;
		invalidateAll();
		toastSuccess(isEditing ? 'Project updated' : 'Project created');
	}
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{isEditing ? 'Edit Project' : 'Create Project'}</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleSubmit} class="space-y-4">
			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
			<div class="space-y-2">
				<Label for="project-title">Title *</Label>
				<Input id="project-title" bind:value={form.title} placeholder="Project title" required />
			</div>
			<div class="space-y-2">
				<Label for="project-amount">Total Amount ($)</Label>
				<Input
					id="project-amount"
					type="number"
					step="0.01"
					min="0"
					bind:value={form.totalAmount}
					placeholder="0.00"
				/>
			</div>
			<div class="space-y-2">
				<Label for="project-date">Date</Label>
				<Input id="project-date" type="date" bind:value={form.date} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="project-invoice">Invoice Status</Label>
					<select
						id="project-invoice"
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						bind:value={form.invoiceStatus}
					>
						<option value="for_invoice">For Invoice</option>
						<option value="invoiced">Invoiced</option>
						<option value="no_invoice">No Invoice</option>
					</select>
				</div>
				<div class="space-y-2">
					<Label for="project-payment">Payment Status</Label>
					<select
						id="project-payment"
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						bind:value={form.paymentStatus}
					>
						<option value="not_paid">Not Paid</option>
						<option value="partial_payment">Partial Payment</option>
						<option value="paid">Paid</option>
					</select>
				</div>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={loading}>
					{loading ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save' : 'Create'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
