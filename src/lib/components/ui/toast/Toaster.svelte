<script lang="ts">
	import { getToasts, dismissToast } from '$lib/stores/toast.svelte';
	import { Check, X, Info } from '@lucide/svelte';
	import type { Component } from 'svelte';

	type ToastType = 'success' | 'error' | 'info';

	const typeStyles: Record<ToastType, string> = {
		success: 'border-success/40 bg-card text-success',
		error: 'border-destructive/40 bg-card text-destructive',
		info: 'border-info/40 bg-card text-info'
	};

	const icons: Record<ToastType, Component<{ class?: string }>> = {
		success: Check,
		error: X,
		info: Info
	};
</script>

{#if getToasts().length > 0}
	<div class="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
		{#each getToasts() as t (t.id)}
			{@const Icon = icons[t.type]}
			<div
				class="flex items-center gap-2 rounded-md border px-4 py-3 text-sm shadow-lg transition-all {typeStyles[
					t.type
				]}"
				role="alert"
			>
				<Icon class="h-4 w-4 shrink-0" />
				<span class="flex-1 text-foreground">{t.message}</span>
				<button
					class="ml-2 text-muted-foreground opacity-60 hover:opacity-100"
					onclick={() => dismissToast(t.id)}
					aria-label="Dismiss"
				>
					<X class="h-3.5 w-3.5" />
				</button>
			</div>
		{/each}
	</div>
{/if}
