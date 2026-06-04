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
	import { Badge } from '$lib/components/ui/badge';
	import {
		Dialog,
		DialogHeader,
		DialogTitle,
		DialogContent,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let editing = $state(false);
	let editForm = $state({ name: '', email: '', phone: '', notes: '' });
	let editLoading = $state(false);
	let editError = $state('');
	let deleteConfirmDialog = $state(false);
	let deleteLoading = $state(false);

	let showProjectDialog = $state(false);
	let projectForm = $state({
		title: '',
		totalAmount: '0',
		invoiceStatus: 'for_invoice' as string,
		paymentStatus: 'not_paid' as string,
		date: ''
	});
	let projectLoading = $state(false);
	let projectError = $state('');

	let showPaymentDialog = $state(false);
	let paymentProjectId = $state('');
	let paymentForm = $state({ amount: '', date: '', note: '' });
	let paymentLoading = $state(false);
	let paymentError = $state('');

	let showEditProjectDialog = $state(false);
	let editProjectId = $state('');
	let editProjectForm = $state({
		title: '',
		totalAmount: '',
		invoiceStatus: '' as string,
		paymentStatus: '' as string,
		date: ''
	});
	let editProjectLoading = $state(false);
	let editProjectError = $state('');

	let showUploadDialog = $state(false);
	let uploadLoading = $state(false);
	let uploadError = $state('');

	function startEdit() {
		editForm = {
			name: data.client.name,
			email: data.client.email || '',
			phone: data.client.phone || '',
			notes: data.client.notes || ''
		};
		editing = true;
	}

	async function handleEdit(e: Event) {
		e.preventDefault();
		editError = '';
		editLoading = true;

		const res = await fetch(`/api/clients/${data.client.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(editForm)
		});

		editLoading = false;

		if (!res.ok) {
			const err = await res.json();
			editError = typeof err.error === 'string' ? err.error : 'Validation error';
			return;
		}

		editing = false;
		invalidateAll();
	}

	async function handleDelete() {
		deleteLoading = true;
		const res = await fetch(`/api/clients/${data.client.id}`, { method: 'DELETE' });
		if (res.ok) {
			goto('/clients');
		}
		deleteLoading = false;
		deleteConfirmDialog = false;
	}

	let saveNotesTimeout: ReturnType<typeof setTimeout> | null = null;
	let currentNotes = $state(data.client.notes || '');

	function handleNotesChange() {
		if (saveNotesTimeout) clearTimeout(saveNotesTimeout);
		saveNotesTimeout = setTimeout(async () => {
			await fetch(`/api/clients/${data.client.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: data.client.name,
					email: data.client.email || '',
					phone: data.client.phone || '',
					notes: currentNotes
				})
			});
			invalidateAll();
		}, 1000);
	}

	function startCreateProject() {
		projectForm = {
			title: '',
			totalAmount: '0',
			invoiceStatus: 'for_invoice',
			paymentStatus: 'not_paid',
			date: new Date().toISOString().split('T')[0]
		};
		showProjectDialog = true;
	}

	async function handleCreateProject(e: Event) {
		e.preventDefault();
		projectError = '';
		projectLoading = true;

		const res = await fetch('/api/projects', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...projectForm,
				clientId: data.client.id
			})
		});

		projectLoading = false;

		if (!res.ok) {
			const err = await res.json();
			projectError = typeof err.error === 'string' ? err.error : 'Validation error';
			return;
		}

		showProjectDialog = false;
		invalidateAll();
	}

	function startEditProject(id: string, project: (typeof data.projects)[0]) {
		editProjectId = id;
		editProjectForm = {
			title: project.title,
			totalAmount: String(project.totalAmount),
			invoiceStatus: project.invoiceStatus,
			paymentStatus: project.paymentStatus,
			date: project.date ? new Date(project.date).toISOString().split('T')[0] : ''
		};
		showEditProjectDialog = true;
	}

	async function handleEditProject(e: Event) {
		e.preventDefault();
		editProjectError = '';
		editProjectLoading = true;

		const res = await fetch(`/api/projects/${editProjectId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(editProjectForm)
		});

		editProjectLoading = false;

		if (!res.ok) {
			const err = await res.json();
			editProjectError = typeof err.error === 'string' ? err.error : 'Validation error';
			return;
		}

		showEditProjectDialog = false;
		invalidateAll();
	}

	async function handleDeleteProject(id: string) {
		if (!confirm('Delete this project?')) return;
		await fetch(`/api/projects/${id}`, { method: 'DELETE' });
		invalidateAll();
	}

	function startAddPayment(projectId: string) {
		paymentProjectId = projectId;
		paymentForm = {
			amount: '',
			date: new Date().toISOString().split('T')[0],
			note: ''
		};
		showPaymentDialog = true;
	}

	async function handleAddPayment(e: Event) {
		e.preventDefault();
		paymentError = '';
		paymentLoading = true;

		const res = await fetch('/api/payments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...paymentForm,
				projectId: paymentProjectId
			})
		});

		paymentLoading = false;

		if (!res.ok) {
			const err = await res.json();
			paymentError = typeof err.error === 'string' ? err.error : 'Failed to add payment';
			return;
		}

		showPaymentDialog = false;
		invalidateAll();
	}

	async function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploadLoading = true;
		uploadError = '';

		try {
			const res = await fetch('/api/files/upload-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: file.name,
					contentType: file.type,
					clientId: data.client.id
				})
			});

			if (!res.ok) {
				uploadError = 'Failed to get upload URL';
				uploadLoading = false;
				return;
			}

			const { signedUrl, storagePath } = await res.json();

			const uploadRes = await fetch(signedUrl, {
				method: 'PUT',
				headers: { 'Content-Type': file.type },
				body: file
			});

			if (!uploadRes.ok) {
				uploadError = 'Failed to upload file';
				uploadLoading = false;
				return;
			}

			await fetch('/api/files', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clientId: data.client.id,
					storagePath,
					filename: file.name,
					fileType: file.type
				})
			});

			showUploadDialog = false;
			invalidateAll();
		} catch {
			uploadError = 'Upload failed';
		}

		uploadLoading = false;
	}

	async function handleDeleteFile(fileId: string) {
		if (!confirm('Delete this file?')) return;
		await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
		invalidateAll();
	}

	const invoiceStatusLabels: Record<string, string> = {
		for_invoice: 'For Invoice',
		invoiced: 'Invoiced',
		no_invoice: 'No Invoice'
	};

	const paymentStatusLabels: Record<string, string> = {
		not_paid: 'Not Paid',
		partial_payment: 'Partial',
		paid: 'Paid'
	};

	const invoiceStatusVariants: Record<string, string> = {
		for_invoice: 'bg-blue-100 text-blue-800 border-blue-200',
		invoiced: 'bg-green-100 text-green-800 border-green-200',
		no_invoice: 'bg-gray-100 text-gray-800 border-gray-200'
	};

	const paymentStatusVariants: Record<string, string> = {
		not_paid: 'bg-red-100 text-red-800 border-red-200',
		partial_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
		paid: 'bg-green-100 text-green-800 border-green-200'
	};

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
	}
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<a href="/clients" class="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Clients</a>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={() => (deleteConfirmDialog = true)} class="text-destructive">Delete Client</Button>
			<Button onclick={startEdit}>Edit Client</Button>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-1">
			<Card>
				<CardHeader>
					<CardTitle>Client Info</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						<div>
							<p class="text-sm text-muted-foreground">Name</p>
							<p class="font-medium">{data.client.name}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Email</p>
							<p class="font-medium">{data.client.email || '—'}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Phone</p>
							<p class="font-medium">{data.client.phone || '—'}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Notes</CardTitle>
				</CardHeader>
				<CardContent>
					<Textarea
						placeholder="Auto-saving notes..."
						bind:value={currentNotes}
						oninput={handleNotesChange}
						rows={6}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex-row items-center justify-between">
					<CardTitle>Files</CardTitle>
					<Button size="sm" onclick={() => (showUploadDialog = true)}>Upload</Button>
				</CardHeader>
				<CardContent>
					{#if data.files.length === 0}
						<p class="text-sm text-muted-foreground">No files uploaded yet.</p>
					{:else}
						<div class="space-y-2">
							{#each data.files as file (file.id)}
								<div class="flex items-center justify-between rounded-md border p-2">
									<div>
										<p class="text-sm font-medium">{file.filename}</p>
										<p class="text-xs text-muted-foreground">
											{new Date(file.uploadedAt).toLocaleDateString()}
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										class="text-destructive"
										onclick={() => handleDeleteFile(file.id)}
									>
										Delete
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>

		<div class="lg:col-span-2">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold">Projects</h2>
				<Button size="sm" onclick={startCreateProject}>Add Project</Button>
			</div>

			{#if data.projects.length === 0}
				<Card>
					<CardContent>
						<p class="py-8 text-center text-muted-foreground">No projects yet. Create your first project!</p>
					</CardContent>
				</Card>
			{:else}
				<div class="space-y-4">
					{#each data.projects as project (project.id)}
						<Card>
							<CardHeader class="flex-row items-start justify-between">
								<div>
									<CardTitle class="text-lg">{project.title}</CardTitle>
									<CardDescription>
										{project.date ? new Date(project.date).toLocaleDateString() : 'No date'}
									</CardDescription>
								</div>
								<div class="flex gap-1">
									<Badge class={invoiceStatusVariants[project.invoiceStatus]}>
										{invoiceStatusLabels[project.invoiceStatus]}
									</Badge>
									<Badge class={paymentStatusVariants[project.paymentStatus]}>
										{paymentStatusLabels[project.paymentStatus]}
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<div class="flex items-center justify-between">
									<div class="text-sm">
										<span class="text-muted-foreground">Total: </span>
										<span class="font-medium">{formatCurrency(project.totalAmount)}</span>
										<span class="mx-2 text-muted-foreground">|</span>
										<span class="text-muted-foreground">Paid: </span>
										<span class="font-medium text-green-600">{formatCurrency(project.paidAmount)}</span>
										<span class="mx-2 text-muted-foreground">|</span>
										<span class="text-muted-foreground">Remaining: </span>
										<span class="font-medium">{formatCurrency(project.totalAmount - project.paidAmount)}</span>
									</div>
									<div class="flex gap-2">
										<Button size="sm" variant="outline" onclick={() => startAddPayment(project.id)}>
											Add Payment
										</Button>
										<Button
											size="sm"
											variant="outline"
											onclick={() => startEditProject(project.id, project)}
										>
											Edit
										</Button>
										<Button
											size="sm"
											variant="ghost"
											class="text-destructive"
											onclick={() => handleDeleteProject(project.id)}
										>
											Delete
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<Dialog bind:open={editing}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Edit Client</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleEdit} class="space-y-4">
			{#if editError}
				<p class="text-sm text-destructive">{editError}</p>
			{/if}
			<div class="space-y-2">
				<Label for="edit-name">Name *</Label>
				<Input id="edit-name" bind:value={editForm.name} required />
			</div>
			<div class="space-y-2">
				<Label for="edit-email">Email</Label>
				<Input id="edit-email" type="email" bind:value={editForm.email} />
			</div>
			<div class="space-y-2">
				<Label for="edit-phone">Phone</Label>
				<Input id="edit-phone" bind:value={editForm.phone} />
			</div>
			<div class="space-y-2">
				<Label for="edit-notes">Notes</Label>
				<Textarea id="edit-notes" bind:value={editForm.notes} />
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (editing = false)}>Cancel</Button>
				<Button type="submit" disabled={editLoading}>
					{editLoading ? 'Saving...' : 'Save'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog bind:open={deleteConfirmDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Delete Client</DialogTitle>
		</DialogHeader>
		<p class="text-sm text-muted-foreground">
			Are you sure you want to delete this client? This will also delete all their projects and files. This action cannot be undone.
		</p>
		<DialogFooter>
			<Button variant="outline" onclick={() => (deleteConfirmDialog = false)}>Cancel</Button>
			<Button variant="destructive" disabled={deleteLoading} onclick={handleDelete}>
				{deleteLoading ? 'Deleting...' : 'Delete'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<Dialog bind:open={showProjectDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Create Project</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleCreateProject} class="space-y-4">
			{#if projectError}
				<p class="text-sm text-destructive">{projectError}</p>
			{/if}
			<div class="space-y-2">
				<Label for="project-title">Title *</Label>
				<Input id="project-title" bind:value={projectForm.title} placeholder="Project title" required />
			</div>
			<div class="space-y-2">
				<Label for="project-amount">Total Amount ($)</Label>
				<Input
					id="project-amount"
					type="number"
					step="0.01"
					min="0"
					bind:value={projectForm.totalAmount}
					placeholder="0.00"
				/>
			</div>
			<div class="space-y-2">
				<Label for="project-date">Date</Label>
				<Input id="project-date" type="date" bind:value={projectForm.date} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="project-invoice">Invoice Status</Label>
					<select
						id="project-invoice"
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						bind:value={projectForm.invoiceStatus}
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
						bind:value={projectForm.paymentStatus}
					>
						<option value="not_paid">Not Paid</option>
						<option value="partial_payment">Partial Payment</option>
						<option value="paid">Paid</option>
					</select>
				</div>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showProjectDialog = false)}>Cancel</Button>
				<Button type="submit" disabled={projectLoading}>
					{projectLoading ? 'Creating...' : 'Create'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog bind:open={showEditProjectDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Edit Project</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleEditProject} class="space-y-4">
			{#if editProjectError}
				<p class="text-sm text-destructive">{editProjectError}</p>
			{/if}
			<div class="space-y-2">
				<Label for="edit-project-title">Title *</Label>
				<Input id="edit-project-title" bind:value={editProjectForm.title} required />
			</div>
			<div class="space-y-2">
				<Label for="edit-project-amount">Total Amount ($)</Label>
				<Input
					id="edit-project-amount"
					type="number"
					step="0.01"
					min="0"
					bind:value={editProjectForm.totalAmount}
				/>
			</div>
			<div class="space-y-2">
				<Label for="edit-project-date">Date</Label>
				<Input id="edit-project-date" type="date" bind:value={editProjectForm.date} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="edit-project-invoice">Invoice Status</Label>
					<select
						id="edit-project-invoice"
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						bind:value={editProjectForm.invoiceStatus}
					>
						<option value="for_invoice">For Invoice</option>
						<option value="invoiced">Invoiced</option>
						<option value="no_invoice">No Invoice</option>
					</select>
				</div>
				<div class="space-y-2">
					<Label for="edit-project-payment">Payment Status</Label>
					<select
						id="edit-project-payment"
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						bind:value={editProjectForm.paymentStatus}
					>
						<option value="not_paid">Not Paid</option>
						<option value="partial_payment">Partial Payment</option>
						<option value="paid">Paid</option>
					</select>
				</div>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showEditProjectDialog = false)}>Cancel</Button>
				<Button type="submit" disabled={editProjectLoading}>
					{editProjectLoading ? 'Saving...' : 'Save'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog bind:open={showPaymentDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Add Payment</DialogTitle>
		</DialogHeader>
		<form onsubmit={handleAddPayment} class="space-y-4">
			{#if paymentError}
				<p class="text-sm text-destructive">{paymentError}</p>
			{/if}
			<div class="space-y-2">
				<Label for="payment-amount">Amount ($) *</Label>
				<Input
					id="payment-amount"
					type="number"
					step="0.01"
					min="0.01"
					bind:value={paymentForm.amount}
					placeholder="0.00"
					required
				/>
			</div>
			<div class="space-y-2">
				<Label for="payment-date">Date *</Label>
				<Input id="payment-date" type="date" bind:value={paymentForm.date} required />
			</div>
			<div class="space-y-2">
				<Label for="payment-note">Note</Label>
				<Input id="payment-note" bind:value={paymentForm.note} placeholder="Optional note" />
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (showPaymentDialog = false)}>Cancel</Button>
				<Button type="submit" disabled={paymentLoading}>
					{paymentLoading ? 'Adding...' : 'Add Payment'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog bind:open={showUploadDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Upload File</DialogTitle>
		</DialogHeader>
		{#if uploadError}
			<p class="text-sm text-destructive">{uploadError}</p>
		{/if}
		<div class="space-y-4">
			<Input
				type="file"
				accept="image/*,.pdf"
				onchange={handleFileUpload}
				disabled={uploadLoading}
			/>
			{#if uploadLoading}
				<p class="text-sm text-muted-foreground">Uploading...</p>
			{/if}
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => (showUploadDialog = false)}>Close</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>