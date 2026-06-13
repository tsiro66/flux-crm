<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { supabaseBrowserClient } from '$lib/supabase/client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		const { error: authError } = await supabaseBrowserClient.auth.signInWithPassword({
			email,
			password
		});

		if (authError) {
			error = authError.message;
			loading = false;
			return;
		}

		goto('/dashboard');
	}
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<span class="font-logo text-xl font-extrabold tracking-tight">FLUX</span>
			<p class="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
		</div>
		<form onsubmit={handleLogin} class="space-y-4">
			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
			<div class="space-y-2">
				<Label for="email">Email</Label>
				<Input id="email" type="email" bind:value={email} placeholder="you@example.com" required />
			</div>
			<div class="space-y-2">
				<Label for="password">Password</Label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					required
				/>
			</div>
			<Button type="submit" class="w-full" disabled={loading}>
				{loading ? 'Signing in...' : 'Sign in'}
			</Button>
		</form>
	</div>
</div>
