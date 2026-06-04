<script lang="ts">
	import {
		Card,
		CardHeader,
		CardTitle,
		CardContent
	} from '$lib/components/ui/card';
	import type { Chart as ChartType } from 'chart.js';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

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
						backgroundColor: 'oklch(0.205 0 0 / 0.8)',
						borderColor: 'oklch(0.205 0 0)',
						borderWidth: 1,
						borderRadius: 4
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
					y: {
						beginAtZero: true,
						ticks: {
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

<div>
	<h1 class="mb-6 text-2xl font-bold">Dashboard</h1>

	<div class="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{formatCurrency(data.outstandingRevenue)}</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Projects</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{data.projectCount}</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Clients</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{data.clientCount}</p>
			</CardContent>
		</Card>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Revenue by Month</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="h-[300px]">
				<canvas bind:this={canvasEl}></canvas>
			</div>
		</CardContent>
	</Card>
</div>