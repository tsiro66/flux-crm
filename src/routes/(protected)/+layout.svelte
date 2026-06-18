<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabaseBrowserClient } from '$lib/supabase/client';
	import { Button } from '$lib/components/ui/button';
	import { Toaster } from '$lib/components/ui/toast';
	import type { Snippet } from 'svelte';
	import type { User } from '@supabase/supabase-js';
	import { LayoutDashboard, Users, Receipt, MessageCircle, LogOut } from '@lucide/svelte';
	import { page } from '$app/stores';

	let { data, children }: { data: { user: User | null }; children: Snippet } = $props();

	let navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/clients', label: 'Clients', icon: Users },
		{ href: '/finance', label: 'Finance', icon: Receipt },
		{ href: '/chat', label: 'Chat', icon: MessageCircle }
	] as const;

	function isActive(href: string, pathname: string): boolean {
		return pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
	}

	async function handleLogout() {
		await supabaseBrowserClient.auth.signOut();
		goto('/login');
	}
</script>

<div class="flex h-screen">
	<aside class="flex w-40 flex-col border-r bg-background">
		<div class="flex h-14 items-center px-5">
			<span class="font-logo text-base font-extrabold tracking-tight">FLUX</span>
		</div>
		<nav class="flex-1 space-y-0.5 px-3 pt-2">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted hover:text-foreground {isActive(
						item.href,
						$page.url.pathname
					)
						? 'bg-muted font-medium text-foreground'
						: 'text-muted-foreground'}"
				>
					<item.icon class="h-4 w-4" />
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="border-t p-3">
			<p class="mb-2 truncate px-2.5 text-xs text-muted-foreground">{data.user?.email}</p>
			<Button
				variant="ghost"
				size="sm"
				class="w-full justify-start gap-2 text-muted-foreground"
				onclick={handleLogout}
			>
				<LogOut class="h-3.5 w-3.5" />
				Sign out
			</Button>
		</div>
	</aside>
	<main class="flex-1 overflow-auto bg-muted/30">
		{@render children()}
	</main>
</div>

<Toaster />
