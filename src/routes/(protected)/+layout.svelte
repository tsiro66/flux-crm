<script lang="ts">
	import AppNav from '$lib/components/AppNav.svelte';
	import { Toaster } from '$lib/components/ui/toast';
	import type { Snippet } from 'svelte';
	import type { User } from '@supabase/supabase-js';

	let { data, children }: { data: { user: User | null }; children: Snippet } = $props();
</script>

<div class="flex h-screen">
	<aside class="flex w-40 flex-col border-r bg-background">
		<AppNav user={data.user} />
	</aside>
	<main class="flex-1 overflow-auto bg-muted/30">
		{@render children()}
	</main>
</div>

<Toaster />
