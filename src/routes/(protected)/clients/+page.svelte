<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '$lib/components/ui/dialog';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let showCreateDialog = $state(false);
	let createForm = $state({ name: '', email: '', phone: '', notes: '' });
	let createError = $state('');
	let createLoading = $state(false);

	let filteredClients = $derived(
		data.clients.filter(
			(c) =>
				c.name.toLowerCase().includes(search.toLowerCase()) ||
				(c.email || '').toLowerCase().includes(search.toLowerCase())
		)
	);

	async function handleCreate(e: Event) {
		e.preventDefault();
		createError = '';
		createLoading = true;

		const res = await fetch('/api/clients', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(createForm)
		});

		createLoading = false;

		if (!res.ok) {
			const err = await res.json();
			createError = typeof err.error === 'string' ? err.error : 'Validation error';
			return;
		}

		showCreateDialog = false;
		createForm = { name: '', email: '', phone: '', notes: '' };
		invalidateAll();
	}
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Clients</h1>
		<Button onclick={() => (showCreateDialog = true)}>Add Client</Button>
	</div>

	<div class="mb-4">
		<Input
			type="text"
			placeholder="Search clients..."
			value={search}
			oninput={(e) => (search = (e.target as HTMLInputElement).value)}
		/>
	</div>

	{#if filteredClients.length === 0}
		<Card>
			<CardContent>
				<p class="py-8 text-center text-muted-foreground">
					{search ? 'No clients match your search.' : 'No clients yet. Create your first client!'}
				</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredClients as client (client.id)}
				<a href="/clients/{client.id}">
					<Card class="transition-colors hover:bg-accent">
						<CardHeader>
							<CardTitle class="text-lg">{client.name}</CardTitle>
							<CardDescription>
								{client.email || 'No email'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="text-sm text-muted-foreground">
								{#if client.phone}
									<p>{client.phone}</p>
								{/if}
								<p class="mt-1">
									{data.projectsByClient[client.id] || 0} projects
								</p>
							</div>
						</CardContent>
					</Card>
				</a>
			{/each}
		</div>
	{/if}
</div>

<Dialog bind:open={showCreateDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Create Client</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleCreate} class="space-y-4">
			{#if createError}
				<p class="text-sm text-destructive">{createError}</p>
			{/if}
			<div class="space-y-2">
				<Label for="name">Name *</Label>
				<Input id="name" bind:value={createForm.name} placeholder="Client name" required />
			</div>
			<div class="space-y-2">
				<Label for="email">Email</Label>
				<Input id="email" type="email" bind:value={createForm.email} placeholder="client@example.com" />
			</div>
			<div class="space-y-2">
				<Label for="phone">Phone</Label>
				<Input id="phone" bind:value={createForm.phone} placeholder="+1 234 567 890" />
			</div>
			<div class="space-y-2">
				<Label for="notes">Notes</Label>
				<Textarea id="notes" bind:value={createForm.notes} placeholder="Additional notes..." />
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showCreateDialog = false)}>Cancel</Button>
				<Button type="submit" disabled={createLoading}>
					{createLoading ? 'Creating...' : 'Create'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>