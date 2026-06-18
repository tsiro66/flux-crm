<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Props = {
		variant?: 'default' | 'secondary' | 'destructive' | 'outline';
		class?: string;
		children: Snippet;
	};

	let { variant = 'default', class: className, children }: Props = $props();

	const variantClasses = {
		default: 'bg-primary text-primary-foreground',
		secondary: 'bg-secondary text-secondary-foreground',
		destructive: 'bg-destructive text-destructive-foreground',
		outline: 'text-foreground'
	};
</script>

<span
	class={cn(
		'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
		variantClasses[variant],
		className
	)}
>
	{@render children()}
</span>
