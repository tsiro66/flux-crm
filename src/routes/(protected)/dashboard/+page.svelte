<script lang="ts">
	import type { Chart as ChartType } from 'chart.js';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { DollarSign, Clock, FolderOpen, Users } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let canvasEl: HTMLCanvasElement;
	let chartInstance: ChartType | null = null;

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount / 100);
	}

	const stats = $derived([
		{
			label: 'Total Revenue',
			value: formatCurrency(data.totalRevenue),
			icon: DollarSign
		},
		{
			label: 'Outstanding',
			value: formatCurrency(data.outstandingRevenue),
			icon: Clock
		},
		{
			label: 'Projects',
			value: String(data.projectCount),
			icon: FolderOpen
		},
		{
			label: 'Clients',
			value: String(data.clientCount),
			icon: Users
		}
	]);

	onMount(async () => {
		const { Chart, registerables } = await import('chart.js');
		Chart.register(...registerables);

		if (chartInstance) chartInstance.destroy();

		const labels = data.monthlyRevenue.map((m) => m.month);
		const values = data.monthlyRevenue.map((m) => m.revenue / 100);

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		chartInstance = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: labels.length > 0 ? labels : ['No data'],
				datasets: [
					{
						label: 'Revenue',
						data: values.length > 0 ? values : [0],
						backgroundColor: 'oklch(0.205 0 0 / 0.1)',
						borderColor: 'oklch(0.205 0 0)',
						borderWidth: 1.5,
						borderRadius: 6,
						barPercentage: 0.6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false }
				},
				scales: {
					x: {
						grid: { display: false },
						border: { display: false },
						ticks: {
							font: { size: 11 }
						}
					},
					y: {
						beginAtZero: true,
						grid: {
							color: 'oklch(0.922 0 0)'
						},
						border: { display: false },
						ticks: {
							font: { size: 11 },
							callback: (value) =>
								new Intl.NumberFormat('en-US', {
									style: 'currency',
									currency: 'USD',
									minimumFractionDigits: 0
								}).format(value as number)
						}
					}
				}
			}
		});
	});
</script>

<div class="p-8">
	<h1 class="mb-8 text-2xl font-semibold tracking-tight">Dashboard</h1>

	<div class="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat (stat.label)}
			<div class="rounded-lg border p-5">
				<div class="flex items-center justify-between">
					<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
						{stat.label}
					</p>
					<div class="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
						<stat.icon class="h-4 w-4 text-muted-foreground" />
					</div>
				</div>
				<p class="mt-2 text-2xl font-semibold tracking-tight">{stat.value}</p>
			</div>
		{/each}
	</div>

	<div class="rounded-lg border">
		<div class="border-b px-5 py-4">
			<h2 class="font-semibold">Revenue by Month</h2>
		</div>
		<div class="p-5">
			<div class="h-[300px]">
				<canvas bind:this={canvasEl}></canvas>
			</div>
		</div>
	</div>
</div>
