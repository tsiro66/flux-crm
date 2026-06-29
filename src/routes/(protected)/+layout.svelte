<script lang="ts">
	import AppNav from '$lib/components/AppNav.svelte';
	import { Toaster } from '$lib/components/ui/toast';
	import { navigating } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { User } from '@supabase/supabase-js';

	let { data, children }: { data: { user: User | null }; children: Snippet } = $props();
</script>

<!-- Top loading bar: shown during client-side navigation while the next
route's load() resolves. Gives immediate feedback on every goto/click. -->
{#if navigating}
	<div class="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
		<div class="h-full w-full animate-pulse bg-primary"></div>
	</div>
{/if}

<div class="flex h-screen">
	<aside class="flex w-40 flex-col border-r bg-background">
		<AppNav user={data.user} />
	</aside>
	<main class="flex-1 overflow-auto bg-muted/30">
		{@render children()}
	</main>
</div>

<Toaster />
