<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	let {
		page,
		totalPages,
		onPageChange
	}: {
		page: number;
		totalPages: number;
		onPageChange: (page: number) => void;
	} = $props();

	function getPageNumbers(): (number | '...')[] {
		const pages: (number | '...')[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
			return pages;
		}

		pages.push(1);

		if (page > 3) pages.push('...');

		const start = Math.max(2, page - 1);
		const end = Math.min(totalPages - 1, page + 1);

		for (let i = start; i <= end; i++) pages.push(i);

		if (page < totalPages - 2) pages.push('...');

		pages.push(totalPages);

		return pages;
	}
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-center gap-1">
		<Button
			variant="outline"
			size="sm"
			disabled={page <= 1}
			onclick={() => onPageChange(page - 1)}
			class="h-8 w-8 p-0"
		>
			&lt;
		</Button>
		{#each getPageNumbers() as pageNum (pageNum)}
			{#if pageNum === '...'}
				<span class="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
					>...</span
				>
			{:else}
				<Button
					variant={pageNum === page ? 'default' : 'outline'}
					size="sm"
					onclick={() => onPageChange(pageNum)}
					class="h-8 w-8 p-0"
				>
					{pageNum}
				</Button>
			{/if}
		{/each}
		<Button
			variant="outline"
			size="sm"
			disabled={page >= totalPages}
			onclick={() => onPageChange(page + 1)}
			class="h-8 w-8 p-0"
		>
			&gt;
		</Button>
	</div>
{/if}
