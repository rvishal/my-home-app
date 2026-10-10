<script lang="ts">
	import { dataStore } from '../../lib/stores/data.svelte';
	import { householdStore } from '../../lib/stores/household.svelte';
	import {
		formatCurrency,
		totalAssetValue,
		totalLoanAmount,
		totalOutstanding,
		upcomingSchedules,
		overdueSchedules,
		formatDate
	} from '../../lib/utils';
	import { parseISO, format, addMonths, startOfMonth } from 'date-fns';

	const totalValue = $derived(totalAssetValue(dataStore.homes));
	const totalLoans = $derived(totalLoanAmount(dataStore.loans));
	const outstanding = $derived(totalOutstanding(dataStore.loans, dataStore.schedules));
	const upcoming = $derived(upcomingSchedules(dataStore.schedules, 30));
	const overdue = $derived(overdueSchedules(dataStore.schedules));

	const monthlyOutflows = $derived(() => {
		const map = new Map<string, number>();
		const start = startOfMonth(new Date());
		for (let i = 0; i < 6; i++) {
			const key = format(addMonths(start, i), 'MMM yyyy');
			map.set(key, 0);
		}
		for (const s of dataStore.schedules) {
			if (s.status === 'paid') continue;
			const d = parseISO(s.dueDate);
			const key = format(startOfMonth(d), 'MMM yyyy');
			if (map.has(key)) {
				map.set(key, (map.get(key) || 0) + s.amount);
			}
		}
		return Array.from(map.entries());
	});

	const maxOutflow = $derived(Math.max(...monthlyOutflows().map(([, v]) => v), 1));
</script>

<div class="space-y-6">
	<div>
		<h1 class="h2">Dashboard</h1>
		{#if householdStore.household}
			<p class="text-surface-600-400">{householdStore.household.name}</p>
		{/if}
	</div>

	<div class="grid gap-4 md:grid-cols-4">
		<div class="rounded-lg bg-surface-100-900 p-4 shadow">
			<p class="text-sm text-surface-500">Total home value</p>
			<p class="text-xl font-semibold">{formatCurrency(totalValue)}</p>
		</div>
		<div class="rounded-lg bg-surface-100-900 p-4 shadow">
			<p class="text-sm text-surface-500">Total loans</p>
			<p class="text-xl font-semibold">{formatCurrency(totalLoans)}</p>
		</div>
		<div class="rounded-lg bg-surface-100-900 p-4 shadow">
			<p class="text-sm text-surface-500">Outstanding principal</p>
			<p class="text-xl font-semibold">{formatCurrency(outstanding)}</p>
		</div>
		<div class="rounded-lg bg-surface-100-900 p-4 shadow">
			<p class="text-sm text-surface-500">Upcoming (30 days)</p>
			<p class="text-xl font-semibold">{upcoming.length}</p>
		</div>
	</div>

	{#if overdue.length > 0}
		<div class="rounded-lg bg-error-100 p-4 shadow">
			<h2 class="h4 text-error-900">Overdue payments</h2>
			<ul class="mt-2 space-y-1">
				{#each overdue as s}
					<li class="text-error-800">
						{s.title} · {formatCurrency(s.amount)} · due {formatDate(s.dueDate)}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="grid gap-6 md:grid-cols-2">
		<div class="rounded-lg bg-surface-100-900 p-4 shadow">
			<h2 class="h4 mb-4">Upcoming payments</h2>
			{#if upcoming.length === 0}
				<p class="text-surface-600-400">No upcoming payments in the next 30 days.</p>
			{:else}
				<ul class="space-y-2">
					{#each upcoming.slice(0, 10) as s}
						<li class="flex items-center justify-between rounded-md bg-surface-50-950 p-2">
							<div>
								<p class="font-medium">{s.title}</p>
								<p class="text-xs text-surface-500">{formatDate(s.dueDate)}</p>
							</div>
							<span class="font-semibold">{formatCurrency(s.amount)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="rounded-lg bg-surface-100-900 p-4 shadow">
			<h2 class="h4 mb-4">6-month payment outlook</h2>
			<div class="space-y-3">
				{#each monthlyOutflows() as [month, amount]}
					<div>
						<div class="mb-1 flex justify-between text-sm">
							<span>{month}</span>
							<span>{formatCurrency(amount)}</span>
						</div>
						<div class="h-4 w-full rounded bg-surface-200-800">
							<div
								class="h-4 rounded bg-primary-500"
								style="width: {(amount / maxOutflow) * 100}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
