<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		ClientHeader,
		ClientNotes,
		ClientFiles,
		ProjectCard,
		EditClientDialog,
		DeleteConfirmDialog,
		ProjectFormDialog,
		PaymentDialog
	} from '$lib/components/client';
	import { Plus } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { toastSuccess, toastError } from '$lib/stores/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let deleteLoading = $state(false);

	let showProjectDialog = $state(false);
	let editingProject: (typeof data.projects)[0] | null = $state(null);

	let deleteProjectDialog = $state(false);
	let deleteProjectId = $state('');
	let deleteProjectLoading = $state(false);

	let showPaymentDialog = $state(false);
	let paymentProjectId = $state('');
	let editingPayment: (typeof data.projectPayments)[0]['payments'][0] | null = $state(null);

	async function handleDeleteClient() {
		deleteLoading = true;
		const res = await fetch(`/api/clients/${data.client.id}`, { method: 'DELETE' });
		if (res.ok) {
			toastSuccess('Client deleted');
			goto('/clients');
		} else {
			toastError('Failed to delete client');
		}
		deleteLoading = false;
		showDeleteDialog = false;
	}

	function openEditProject(project: (typeof data.projects)[0]) {
		editingProject = project;
		showProjectDialog = true;
	}

	function openCreateProject() {
		editingProject = null;
		showProjectDialog = true;
	}

	async function handleDeleteProject() {
		deleteProjectLoading = true;
		const res = await fetch(`/api/projects/${deleteProjectId}`, { method: 'DELETE' });
		deleteProjectLoading = false;
		deleteProjectDialog = false;
		deleteProjectId = '';
		if (res.ok) {
			toastSuccess('Project deleted');
			invalidateAll();
		} else {
			toastError('Failed to delete project');
		}
	}

	function handleEditPayment(payment: (typeof data.projectPayments)[0]['payments'][0]) {
		editingPayment = payment;
		paymentProjectId = payment.projectId;
		showPaymentDialog = true;
	}

	async function handleDeletePayment(paymentId: string) {
		const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
		if (res.ok) {
			toastSuccess('Payment deleted');
			invalidateAll();
		} else {
			toastError('Failed to delete payment');
		}
	}

	function getPaymentsForProject(projectId: string) {
		const found = data.projectPayments.find((p) => p.projectId === projectId);
		return found?.payments ?? [];
	}
</script>

<div class="p-8">
	<ClientHeader
		clientName={data.client.name}
		clientEmail={data.client.email}
		clientPhone={data.client.phone}
		onEdit={() => (showEditDialog = true)}
		onDelete={() => (showDeleteDialog = true)}
	/>

	<div class="grid gap-8 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-1">
			<ClientNotes clientId={data.client.id} initialNotes={data.client.notes || ''} />
			<ClientFiles clientId={data.client.id} files={data.files} />
		</div>

		<div class="lg:col-span-2">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
					Projects ({data.projects.length})
				</h2>
				<Button size="sm" onclick={openCreateProject} class="gap-1.5">
					<Plus class="h-3.5 w-3.5" />
					Add Project
				</Button>
			</div>

			{#if data.projects.length === 0}
				<div class="py-12 text-center">
					<p class="text-sm text-muted-foreground">No projects yet. Create your first project.</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each data.projects as project (project.id)}
						<ProjectCard
							{project}
							payments={getPaymentsForProject(project.id)}
							onAddPayment={() => {
								paymentProjectId = project.id;
								editingPayment = null;
								showPaymentDialog = true;
							}}
							onEditPayment={handleEditPayment}
							onDeletePayment={handleDeletePayment}
							onEdit={() => openEditProject(project)}
							onDelete={() => {
								deleteProjectId = project.id;
								deleteProjectDialog = true;
							}}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<EditClientDialog bind:open={showEditDialog} client={data.client} />

<DeleteConfirmDialog
	bind:open={showDeleteDialog}
	title="Delete Client"
	description="Are you sure you want to delete this client? This will also delete all their projects and files. This action cannot be undone."
	loading={deleteLoading}
	onConfirm={handleDeleteClient}
/>

<DeleteConfirmDialog
	bind:open={deleteProjectDialog}
	title="Delete Project"
	description="Are you sure you want to delete this project? This will also remove all associated payments. This action cannot be undone."
	loading={deleteProjectLoading}
	onConfirm={handleDeleteProject}
/>

<ProjectFormDialog
	bind:open={showProjectDialog}
	clientId={data.client.id}
	project={editingProject}
/>

<PaymentDialog
	bind:open={showPaymentDialog}
	projectId={paymentProjectId}
	payment={editingPayment}
/>
