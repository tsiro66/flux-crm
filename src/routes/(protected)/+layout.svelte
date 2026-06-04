<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabaseBrowserClient } from '$lib/supabase/client';
	import { Button } from '$lib/components/ui/button';
	import type { Snippet } from 'svelte';
	import type { User } from '@supabase/supabase-js';

	let { data, children }: { data: { user: User | null }; children: Snippet } = $props();

	let navItems = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/clients', label: 'Clients' },
		{ href: '/finance', label: 'Finance' }
	] as const;

	async function handleLogout() {
		await supabaseBrowserClient.auth.signOut();
		goto('/login');
	}
</script>

<div class="flex min-h-screen">
	<aside class="flex w-64 flex-col border-r bg-muted/50">
		<div class="flex h-14 items-center border-b px-4">
			<span class="text-lg font-bold">Flux CRM</span>
		</div>
		<nav class="flex-1 space-y-1 p-4">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
				>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="border-t p-4">
			<p class="mb-2 truncate text-xs text-muted-foreground">{data.user?.email}</p>
			<Button variant="outline" size="sm" class="w-full" onclick={handleLogout}>Sign out</Button>
		</div>
	</aside>
	<main class="flex-1 overflow-auto">
		<div class="p-6">{@render children()}</div>
	</main>
</div>
