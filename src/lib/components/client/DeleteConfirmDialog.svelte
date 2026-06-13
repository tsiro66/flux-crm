<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogHeader,
		DialogTitle,
		DialogContent,
		DialogFooter
	} from '$lib/components/ui/dialog';

	let {
		open = $bindable(),
		title = 'Confirm Delete',
		description = 'Are you sure? This action cannot be undone.',
		loading = false,
		onConfirm
	}: {
		open: boolean;
		title?: string;
		description?: string;
		loading?: boolean;
		onConfirm: () => void;
	} = $props();
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{title}</DialogTitle>
		</DialogHeader>
		<p class="text-sm text-muted-foreground">{description}</p>
		<DialogFooter>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button variant="destructive" disabled={loading} onclick={onConfirm}>
				{loading ? 'Deleting...' : 'Delete'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
