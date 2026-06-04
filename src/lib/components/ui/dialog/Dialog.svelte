<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	};

	let { open = $bindable(false), onOpenChange, children }: Props = $props();

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}

	function handleBackdropClick() {
		handleClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		onkeydown={handleKeydown}
	>
		<div class="fixed inset-0 bg-black/80" onclick={handleBackdropClick}></div>
		<div
			class={cn(
				'relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg',
				'animate-in fade-in-0 zoom-in-95'
			)}
		>
			{@render children()}
			<button
				onclick={handleClose}
				class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M18 6 6 18"></path>
					<path d="m6 6 12 12"></path>
				</svg>
			</button>
		</div>
	</div>
{/if}