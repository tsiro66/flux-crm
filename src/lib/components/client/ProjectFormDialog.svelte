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
	import type { InvoiceStatus, PaymentStatus } from '$lib/utils';

	type Project = {
		id: string;
		title: string;
		totalAmount: number;
		invoiceStatus: InvoiceStatus;
		paymentStatus: PaymentStatus;
		date: Date | null;
	};

	type ClientOption = { id: string; name: string };

	let {
		open = $bindable(),
		clientId = '',
		clients = [],
		project
	}: {
		open: boolean;
		// Preset client (client detail page always passes this). When empty and
		// `clients` is provided (projects list page), the user picks one.
		clientId?: string;
		clients?: ClientOption[];
		project?: Project | null;
	} = $props();

	let form = $state({
		clientId: '',
		title: '',
		totalAmount: '0',
		invoiceStatus: 'for_invoice',
		paymentStatus: 'not_paid',
		date: ''
	});
	let loading = $state(false);
	let error = $state('');

	let isEditing = $derived(project !== null && project !== undefined);
	// Show the client picker only when creating AND a clients list was supplied
	// (i.e. there is more than one to choose from).
	let showClientPicker = $derived(!isEditing && clients.length > 0);

	$effect(() => {
		if (open) {
			if (project) {
				form = {
					clientId,
					title: project.title,
					totalAmount: String(project.totalAmount / 100),
					invoiceStatus: project.invoiceStatus,
					paymentStatus: project.paymentStatus,
					date: project.date ? new Date(project.date).toISOString().split('T')[0] : ''
				};
			} else {
				form = {
					clientId,
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

		// When a clients list is shown the chosen id wins; otherwise the preset
		// clientId prop is used (client detail page flow).
		const resolvedClientId = showClientPicker ? form.clientId : clientId;

		if (!isEditing && !resolvedClientId) {
			loading = false;
			error = 'Please select a client';
			return;
		}

		const url = isEditing ? `/api/projects/${project!.id}` : '/api/projects';
		const method = isEditing ? 'PUT' : 'POST';
		const body = isEditing ? form : { ...form, clientId: resolvedClientId };

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
			{#if showClientPicker}
				<div class="space-y-2">
					<Label for="project-client">Client *</Label>
					<select
						id="project-client"
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						bind:value={form.clientId}
					>
						<option value="" disabled>Select a client...</option>
						{#each clients as c (c.id)}
							<option value={c.id}>{c.name}</option>
						{/each}
					</select>
				</div>
			{/if}
			<div class="space-y-2">
				<Label for="project-title">Title *</Label>
				<Input id="project-title" bind:value={form.title} placeholder="Project title" required />
			</div>
			<div class="space-y-2">
				<Label for="project-amount">Total Amount (€)</Label>
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
