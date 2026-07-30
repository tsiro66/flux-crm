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
	import DeleteConfirmDialog from './DeleteConfirmDialog.svelte';
	import { invalidateAll } from '$app/navigation';
	import { toastError, toastSuccess } from '$lib/stores/toast.svelte';
	import { formatCurrency } from '$lib/utils';
	import { Plus, Repeat, Trash2 } from '@lucide/svelte';

	type RecurringItem = {
		id: string;
		projectId: string;
		projectTitle: string;
		amount: number;
		note: string;
		dayOfMonth: number;
		active: boolean;
		startMonth: string;
		lastGeneratedMonth: string | null;
	};

	let {
		clientId,
		projects,
		recurring
	}: {
		clientId: string;
		projects: { id: string; title: string }[];
		recurring: RecurringItem[];
	} = $props();

	let showAddDialog = $state(false);
	let form = $state({ projectId: '', amount: '', dayOfMonth: '1', note: '' });
	let formError = $state('');
	let formLoading = $state(false);
	let togglingId = $state<string | null>(null);
	let deletingItem = $state<RecurringItem | null>(null);
	let showDeleteDialog = $state(false);
	let deleteLoading = $state(false);

	function openAdd() {
		form = { projectId: projects[0]?.id ?? '', amount: '', dayOfMonth: '1', note: '' };
		formError = '';
		showAddDialog = true;
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		formError = '';
		formLoading = true;

		const res = await fetch('/api/recurring-payments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				clientId,
				projectId: form.projectId,
				amount: form.amount,
				dayOfMonth: form.dayOfMonth,
				note: form.note
			})
		});

		formLoading = false;

		if (!res.ok) {
			const err = await res.json();
			formError = typeof err.error === 'string' ? err.error : 'Validation error';
			return;
		}

		showAddDialog = false;
		toastSuccess('Recurring payment created');
		await invalidateAll();
	}

	async function toggleActive(item: RecurringItem) {
		togglingId = item.id;
		const res = await fetch(`/api/recurring-payments/${item.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ active: !item.active })
		});
		togglingId = null;

		if (!res.ok) {
			toastError('Failed to update recurring payment');
			return;
		}
		toastSuccess(item.active ? 'Recurring payment paused' : 'Recurring payment activated');
		await invalidateAll();
	}

	async function handleDelete() {
		if (!deletingItem) return;
		deleteLoading = true;
		const res = await fetch(`/api/recurring-payments/${deletingItem.id}`, { method: 'DELETE' });
		deleteLoading = false;

		if (!res.ok) {
			toastError('Failed to delete recurring payment');
			showDeleteDialog = false;
			deletingItem = null;
			return;
		}
		deletingItem = null;
		showDeleteDialog = false;
		toastSuccess('Recurring payment deleted');
		await invalidateAll();
	}
</script>

<div>
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
			Recurring ({recurring.length})
		</h3>
		{#if projects.length > 0}
			<Button size="sm" variant="outline" onclick={openAdd} class="gap-1.5">
				<Plus class="h-3.5 w-3.5" />
				Add
			</Button>
		{/if}
	</div>

	{#if recurring.length === 0}
		<p class="text-sm text-muted-foreground">
			{projects.length === 0
				? 'Create a project first to add recurring payments.'
				: 'No recurring payments.'}
		</p>
	{:else}
		<ul class="space-y-2">
			{#each recurring as item (item.id)}
				<li class="rounded-lg border px-3 py-2.5">
					<div class="flex items-center justify-between gap-2">
						<div class="flex min-w-0 items-center gap-2">
							<Repeat
								class="h-3.5 w-3.5 shrink-0 {item.active
									? 'text-success'
									: 'text-muted-foreground'}"
							/>
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">{item.projectTitle}</p>
								<p class="text-xs text-muted-foreground">
									{formatCurrency(item.amount)} · day {item.dayOfMonth}
									{item.note ? ` · ${item.note}` : ''}
								</p>
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-1.5">
							<button
								type="button"
								role="switch"
								aria-checked={item.active}
								aria-label={item.active ? 'Pause recurring payment' : 'Activate recurring payment'}
								title={item.active ? 'Active — click to pause' : 'Paused — click to activate'}
								disabled={togglingId === item.id}
								onclick={() => toggleActive(item)}
								class="relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 {item.active
									? 'bg-success'
									: 'bg-muted-foreground/30'}"
							>
								<span
									class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform {item.active
										? 'translate-x-4'
										: 'translate-x-0'}"
								></span>
							</button>
							<button
								type="button"
								aria-label="Delete recurring payment"
								onclick={() => {
									deletingItem = item;
									showDeleteDialog = true;
								}}
								class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<Dialog bind:open={showAddDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Add Recurring Payment</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleCreate} class="space-y-4">
			{#if formError}
				<p class="text-sm text-destructive">{formError}</p>
			{/if}
			<div class="space-y-2">
				<Label for="rec-project">Project *</Label>
				<select
					id="rec-project"
					bind:value={form.projectId}
					required
					class="flex h-10 w-full rounded-md border border-input bg-background py-2 pr-8 pl-3 text-sm"
				>
					{#each projects as project (project.id)}
						<option value={project.id}>{project.title}</option>
					{/each}
				</select>
				<p class="text-xs text-muted-foreground">
					Generated payments are booked against this project.
				</p>
			</div>
			<div class="space-y-2">
				<Label for="rec-amount">Monthly amount (€) *</Label>
				<Input
					id="rec-amount"
					type="number"
					min="0.01"
					step="0.01"
					bind:value={form.amount}
					placeholder="500.00"
					required
				/>
			</div>
			<div class="space-y-2">
				<Label for="rec-day">Day of month *</Label>
				<Input id="rec-day" type="number" min="1" max="31" bind:value={form.dayOfMonth} required />
				<p class="text-xs text-muted-foreground">
					Clamped to the last day of shorter months (e.g. 31 → 28 in February).
				</p>
			</div>
			<div class="space-y-2">
				<Label for="rec-note">Note</Label>
				<Input id="rec-note" bind:value={form.note} placeholder="Retainer, hosting, ..." />
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showAddDialog = false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={formLoading}>
					{formLoading ? 'Creating...' : 'Create'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<DeleteConfirmDialog
	bind:open={showDeleteDialog}
	title="Delete recurring payment?"
	description="Stops all future monthly payments. Payments already generated are kept."
	loading={deleteLoading}
	onConfirm={handleDelete}
/>
