<script lang="ts">
	import AppNav from '$lib/components/AppNav.svelte';
	import { MessageCircle } from '@lucide/svelte';
	import type { User as SupabaseUser } from '@supabase/supabase-js';

	let { data }: { data: { userId: string | null; user: SupabaseUser | null } } = $props();
</script>

<div class="flex h-full">
	<div
		class="fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r bg-background md:relative md:translate-x-0"
	>
		<AppNav user={data.user} compact>
			<div class="flex h-full flex-col items-center justify-center p-6">
				<p class="text-xs text-muted-foreground">No conversations</p>
			</div>
		</AppNav>
	</div>

	<div class="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
		<div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
			<MessageCircle class="h-6 w-6" />
		</div>
		<h2 class="text-lg font-medium text-foreground">AI Chat</h2>
		<p class="text-sm">Not available yet.</p>
	</div>
</div>
