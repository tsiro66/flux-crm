<script lang="ts">
	import { Toaster } from '$lib/components/ui/toast';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="flex h-screen overflow-hidden">
	<main class="flex-1 overflow-hidden">
		{@render children()}
	</main>
</div>

<Toaster />
