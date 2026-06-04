<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className, children }: Props = $props();
</script>

<h3 class={cn('text-2xl leading-none font-semibold tracking-tight', className)}>
	{@render children()}
</h3>
