<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Check, X } from '@lucide/svelte';
	import { describeProposal, type Proposal } from '$lib/utils';

	let {
		proposal,
		onApprove,
		onReject
	}: {
		proposal: Proposal;
		onApprove: () => void;
		onReject: () => void;
	} = $props();
</script>

<div class="mt-2 max-w-[80%] rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
	<div class="flex items-center gap-2 text-sm font-medium text-primary">
		<Check class="h-4 w-4" />
		{proposal.title}
	</div>
	<p class="mt-2 text-sm text-muted-foreground">{proposal.summary}</p>
	<pre
		class="mt-2 rounded-md bg-background px-3 py-2 text-xs whitespace-pre-wrap text-foreground">{describeProposal(
			proposal
		)}</pre>
	<div class="mt-3 flex items-center gap-2">
		<Button size="sm" class="gap-1.5" onclick={onApprove}>
			<Check class="h-3.5 w-3.5" />
			Επιβεβαίωση
		</Button>
		<Button size="sm" variant="outline" class="gap-1.5" onclick={onReject}>
			<X class="h-3.5 w-3.5" />
			Άκυρο
		</Button>
	</div>
</div>
