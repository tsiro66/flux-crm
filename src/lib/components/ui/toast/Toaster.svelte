<script lang="ts">
	import { getToasts, dismissToast } from '$lib/stores/toast.svelte';

	type ToastType = 'success' | 'error' | 'info';

	const typeStyles: Record<ToastType, string> = {
		success: 'border-green-200 bg-green-50 text-green-800',
		error: 'border-red-200 bg-red-50 text-red-800',
		info: 'border-blue-200 bg-blue-50 text-blue-800'
	};

	const icons: Record<ToastType, string> = {
		success: '✓',
		error: '✕',
		info: 'ℹ'
	};
</script>

{#if getToasts().length > 0}
	<div class="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
		{#each getToasts() as t (t.id)}
			<div
				class="flex items-center gap-2 rounded-md border px-4 py-3 text-sm shadow-lg transition-all {typeStyles[
					t.type
				]}"
				role="alert"
			>
				<span class="font-semibold">{icons[t.type]}</span>
				<span class="flex-1">{t.message}</span>
				<button
					class="ml-2 opacity-60 hover:opacity-100"
					onclick={() => dismissToast(t.id)}
					aria-label="Dismiss"
				>
					✕
				</button>
			</div>
		{/each}
	</div>
{/if}
