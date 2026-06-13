<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { getInitials } from '$lib/utils';
	import { ArrowLeft, Pencil, Trash2, Mail, Phone } from '@lucide/svelte';

	let {
		clientName,
		clientEmail,
		clientPhone,
		onEdit,
		onDelete
	}: {
		clientName: string;
		clientEmail: string | null;
		clientPhone: string | null;
		onEdit: () => void;
		onDelete: () => void;
	} = $props();
</script>

<div class="mb-6 flex items-center justify-between">
	<a
		href="/clients"
		class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
	>
		<ArrowLeft class="h-3.5 w-3.5" />
		Back to Clients
	</a>
	<div class="flex gap-2">
		<Button
			variant="outline"
			size="sm"
			onclick={onDelete}
			class="gap-1.5 text-destructive hover:text-destructive"
		>
			<Trash2 class="h-3.5 w-3.5" />
			Delete
		</Button>
		<Button size="sm" onclick={onEdit} class="gap-1.5">
			<Pencil class="h-3.5 w-3.5" />
			Edit
		</Button>
	</div>
</div>

<div class="mb-8 flex items-start gap-4">
	<div
		class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background"
	>
		{getInitials(clientName)}
	</div>
	<div class="min-w-0">
		<h1 class="text-xl font-semibold tracking-tight">{clientName}</h1>
		<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
			{#if clientEmail}
				<span class="flex items-center gap-1"><Mail class="h-3.5 w-3.5" />{clientEmail}</span>
			{/if}
			{#if clientPhone}
				<span class="flex items-center gap-1"><Phone class="h-3.5 w-3.5" />{clientPhone}</span>
			{/if}
			{#if !clientEmail && !clientPhone}
				<span>No contact info</span>
			{/if}
		</div>
	</div>
</div>
