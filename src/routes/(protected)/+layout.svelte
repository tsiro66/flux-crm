<script lang="ts">
	import AppNav from '$lib/components/AppNav.svelte';
	import { Toaster } from '$lib/components/ui/toast';
	import { page, navigating } from '$app/state';
	import { Menu } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { User } from '@supabase/supabase-js';

	let { data, children }: { data: { user: User | null }; children: Snippet } = $props();

	let mobileNavOpen = $state(false);

	// Close the mobile drawer whenever the route changes (nav link clicked).
	$effect(() => {
		void page.url.pathname;
		mobileNavOpen = false;
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (mobileNavOpen = false)} />

<!-- Top loading bar: shown during client-side navigation while the next
route's load() resolves. Gives immediate feedback on every goto/click. -->
{#if navigating}
	<div class="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
		<div class="h-full w-full animate-pulse bg-primary"></div>
	</div>
{/if}

<div class="flex h-screen flex-col lg:flex-row">
	<!-- Mobile top bar with menu button (desktop uses the static sidebar). -->
	<header class="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 lg:hidden">
		<button
			type="button"
			aria-label="Open menu"
			onclick={() => (mobileNavOpen = true)}
			class="rounded-md p-1.5 transition-colors hover:bg-muted"
		>
			<Menu class="h-5 w-5" />
		</button>
		<span class="font-logo text-base font-extrabold tracking-tight">FLUX</span>
	</header>

	<aside class="hidden w-40 shrink-0 flex-col border-r bg-background lg:flex">
		<AppNav user={data.user} />
	</aside>

	<!-- Mobile drawer: backdrop + slide-in sidebar. -->
	{#if mobileNavOpen}
		<div class="fixed inset-0 z-40 lg:hidden">
			<button
				type="button"
				class="absolute inset-0 bg-black/40"
				aria-label="Close menu"
				tabindex="-1"
				onclick={() => (mobileNavOpen = false)}
			></button>
			<aside class="absolute inset-y-0 left-0 w-56 border-r bg-background shadow-xl">
				<AppNav user={data.user} />
			</aside>
		</div>
	{/if}

	<main class="flex-1 overflow-auto bg-muted/30">
		{@render children()}
	</main>
</div>

<Toaster />
