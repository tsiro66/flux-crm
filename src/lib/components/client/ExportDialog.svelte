<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogHeader,
		DialogTitle,
		DialogContent,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { Download } from '@lucide/svelte';

	let { open = $bindable() }: { open: boolean } = $props();
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Export CSV</DialogTitle>
		</DialogHeader>
		<p class="text-sm text-muted-foreground">
			Download your data as a CSV file. Amounts are in dollars.
		</p>
		<div class="flex flex-col gap-3">
			<a
				href="/api/clients/export"
				download
				class="flex items-center justify-between rounded-md border border-input bg-background px-4 py-3 text-sm transition-colors hover:bg-accent"
			>
				<span>Clients</span>
				<Download class="h-4 w-4" />
			</a>
			<a
				href="/api/projects/export"
				download
				class="flex items-center justify-between rounded-md border border-input bg-background px-4 py-3 text-sm transition-colors hover:bg-accent"
			>
				<span>Projects</span>
				<Download class="h-4 w-4" />
			</a>
		</div>
		<DialogFooter>
			<Button type="button" variant="outline" onclick={() => (open = false)}>Close</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
