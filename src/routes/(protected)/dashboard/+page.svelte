<script lang="ts">
	import type { Chart as ChartType, ScriptableContext, TooltipItem } from 'chart.js';
	import type { PageData } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import { Euro, Clock, FolderOpen, Users, TrendingUp, TrendingDown } from '@lucide/svelte';
	import { StatusBadge } from '$lib/components/ui/status-badge';
	import { formatCurrency, formatDate } from '$lib/utils';

	let { data }: { data: PageData } = $props();

	let canvasEl: HTMLCanvasElement;
	let chartInstance: ChartType | null = null;
	let chartModule: typeof import('chart.js') | null = null;
	let chartRegistered = false;

	// Month-over-month revenue change (last vs previous month), null when
	// there isn't a previous month to compare against.
	const revenueDelta = $derived.by(() => {
		const m = data.monthlyRevenue;
		if (m.length < 2) return null;
		const prev = m[m.length - 2].revenue;
		const cur = m[m.length - 1].revenue;
		if (prev <= 0) return null;
		return Math.round(((cur - prev) / prev) * 100);
	});

	const stats = $derived([
		{
			label: 'Total Revenue',
			value: formatCurrency(data.totalRevenue, { decimals: false }),
			icon: Euro,
			accent: 'bg-success/10 text-success',
			delta: revenueDelta
		},
		{
			label: 'Outstanding',
			value: formatCurrency(data.outstandingRevenue, { decimals: false }),
			icon: Clock,
			accent: 'bg-warning/10 text-warning',
			delta: null
		},
		{
			label: 'Projects',
			value: String(data.projectCount),
			icon: FolderOpen,
			accent: 'bg-info/10 text-info',
			delta: null
		},
		{
			label: 'Clients',
			value: String(data.clientCount),
			icon: Users,
			accent: 'bg-primary/10 text-primary',
			delta: null
		}
	]);

	async function ensureChart() {
		if (!chartModule) {
			chartModule = await import('chart.js');
			// Register once for the lifetime of this component. Re-registering on
			// every chart recreation logs 'already registered' warnings and does no
			// useful work.
			if (!chartRegistered) {
				chartModule.Chart.register(...chartModule.registerables);
				chartRegistered = true;
			}
		}
		if (chartInstance) {
			chartInstance.destroy();
		}
		if (!canvasEl) return;

		// Pull stream/grid colors from the theme tokens so the chart follows the
		// design system instead of duplicating raw oklch values.
		const cssVars = getComputedStyle(document.documentElement);
		const token = (name: string, fallback: string) =>
			cssVars.getPropertyValue(name).trim() || fallback;
		const withAlpha = (color: string, alpha: number) => color.replace(/\)$/, ` / ${alpha})`);
		const streamColor = token('--color-chart-1', 'oklch(0.646 0.222 41.116)');
		const gridColor = token('--color-border', 'oklch(0.912 0 0)');
		const tickColor = token('--color-muted-foreground', 'oklch(0.48 0 0)');

		const formatEur = (value: number) =>
			new Intl.NumberFormat('en-IE', {
				style: 'currency',
				currency: 'EUR',
				minimumFractionDigits: 0
			}).format(value);

		const labels = data.monthlyRevenue.map((m) => m.month);
		const values = data.monthlyRevenue.map((m) => m.revenue / 100);

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		// Sharp-edged revenue graph: straight segments between visible points
		// (tension 0), gradient fill underneath.
		chartInstance = new chartModule.Chart(ctx, {
			type: 'line',
			data: {
				labels: labels.length > 0 ? labels : ['No data'],
				datasets: [
					{
						label: 'Revenue',
						data: values.length > 0 ? values : [0],
						fill: true,
						tension: 0,
						borderColor: streamColor,
						borderWidth: 2,
						pointRadius: 3,
						pointBackgroundColor: streamColor,
						pointBorderColor: 'transparent',
						pointHoverRadius: 5,
						pointHoverBackgroundColor: streamColor,
						pointHoverBorderColor: 'transparent',
						backgroundColor: (context: ScriptableContext<'line'>) => {
							const { chart } = context;
							const { ctx: c, chartArea } = chart;
							// chartArea is undefined on the first layout pass.
							if (!chartArea) return withAlpha(streamColor, 0.2);
							const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
							gradient.addColorStop(0, withAlpha(streamColor, 0.35));
							gradient.addColorStop(1, withAlpha(streamColor, 0));
							return gradient;
						}
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { display: false },
					tooltip: {
						displayColors: false,
						callbacks: {
							label: (item: TooltipItem<'line'>) => formatEur(item.parsed.y ?? 0)
						}
					}
				},
				scales: {
					x: {
						grid: { display: false },
						border: { display: false },
						ticks: {
							font: { size: 11 },
							color: tickColor
						}
					},
					y: {
						beginAtZero: true,
						grid: {
							color: gridColor
						},
						border: { display: false },
						ticks: {
							font: { size: 11 },
							color: tickColor,
							callback: (value) => formatEur(value as number)
						}
					}
				}
			}
		});
	}

	onMount(() => {
		ensureChart();
	});

	$effect(() => {
		void data.monthlyRevenue;
		if (chartInstance) {
			ensureChart();
		}
	});

	onDestroy(() => {
		if (chartInstance) chartInstance.destroy();
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
					<div class="flex h-8 w-8 items-center justify-center rounded-md {stat.accent}">
						<stat.icon class="h-4 w-4" />
					</div>
				</div>
				<div class="mt-2 flex items-baseline gap-2">
					<p class="text-2xl font-semibold tracking-tight">{stat.value}</p>
					{#if stat.delta !== null}
						<span
							class="inline-flex items-center gap-0.5 text-xs font-medium {stat.delta >= 0
								? 'text-success'
								: 'text-destructive'}"
							title="vs last month"
						>
							{#if stat.delta >= 0}
								<TrendingUp class="h-3 w-3" />
							{:else}
								<TrendingDown class="h-3 w-3" />
							{/if}
							{stat.delta >= 0 ? '+' : ''}{stat.delta}%
						</span>
					{/if}
				</div>
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

	<div class="mt-8 grid gap-4 lg:grid-cols-2">
		<!-- Projects still owed money, largest outstanding first. -->
		<div class="rounded-lg border">
			<div class="border-b px-5 py-4">
				<h2 class="font-semibold">Needs Attention</h2>
			</div>
			{#if data.needsAttention.length === 0}
				<p class="px-5 py-8 text-center text-sm text-muted-foreground">
					Nothing outstanding. All projects are paid up.
				</p>
			{:else}
				<ul class="divide-y">
					{#each data.needsAttention as project (project.id)}
						<li>
							<a
								href={`/projects/${project.id}`}
								class="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
							>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{project.title}</p>
									<p class="truncate text-xs text-muted-foreground">{project.clientName}</p>
								</div>
								<div class="flex shrink-0 items-center gap-2">
									<StatusBadge kind="invoice" status={project.invoiceStatus} />
									<span class="text-sm font-medium text-destructive">
										{formatCurrency(project.outstanding)}
									</span>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Latest payments received. -->
		<div class="rounded-lg border">
			<div class="border-b px-5 py-4">
				<h2 class="font-semibold">Recent Payments</h2>
			</div>
			{#if data.recentPayments.length === 0}
				<p class="px-5 py-8 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
			{:else}
				<ul class="divide-y">
					{#each data.recentPayments as payment (payment.id)}
						<li>
							<a
								href={`/projects/${payment.projectId}`}
								class="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
							>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{payment.projectTitle}</p>
									<p class="truncate text-xs text-muted-foreground">
										{payment.clientName} · {formatDate(payment.date)}
									</p>
								</div>
								<span class="shrink-0 text-sm font-medium text-success">
									{formatCurrency(payment.amount)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>
