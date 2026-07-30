<script lang="ts">
	import { ArrowDown, ArrowUp } from '@lucide/svelte';

	// Fixed-width slot so headers don't shift horizontally when the sort
	// column changes — the arrow appears/disappears inside a reserved box.
	let { active, dir }: { active: boolean; dir: 'asc' | 'desc' } = $props();
</script>

<span class="ml-0.5 inline-flex w-3.5 items-center align-middle">
	{#if active}
		{#if dir === 'asc'}
			<ArrowUp class="h-3.5 w-3.5" />
		{:else}
			<ArrowDown class="h-3.5 w-3.5" />
		{/if}
	{/if}
</span>
