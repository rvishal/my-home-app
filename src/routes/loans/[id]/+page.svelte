<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { dataStore } from '../../../lib/stores/data.svelte';
	import { formatCurrency, generateAmortizationSchedule } from '../../../lib/utils';
	import { parseISO } from 'date-fns';

	const id = $derived(page.params.id);
	let loan = $derived(dataStore.loans.find((l) => l.id === id));
	let home = $derived(dataStore.homes.find((h) => h.id === loan?.homeId));

	let amortization = $derived(
		loan
			? generateAmortizationSchedule(
					loan.loanAmount,
					loan.interestRate,
					loan.emiAmount,
					loan.sanctionDate ? parseISO(loan.sanctionDate) : new Date(),
					Math.min(loan.tenureMonths, 12)
				)
			: []
	);

	async function remove() {
		if (!loan) return;
		if (!confirm('Delete this loan and its schedules?')) return;
		await dataStore.deleteLoan(loan.id);
		goto('/loans');
	}
</script>

{#if !loan}
	<p class="text-surface-500">Loan not found.</p>
{:else}
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="h2">{loan.bankName}</h1>
				<p class="text-surface-600-400">{home?.name || 'Unlinked home'}</p>
			</div>
			<button
				onclick={remove}
				class="btn rounded-md bg-error-500 px-4 py-2 text-white hover:bg-error-600"
			>
				Delete
			</button>
		</div>

		<div class="grid gap-4 md:grid-cols-4">
			<div class="rounded-lg bg-surface-100-900 p-4 shadow">
				<p class="text-sm text-surface-500">Loan amount</p>
				<p class="text-xl font-semibold">{formatCurrency(loan.loanAmount)}</p>
			</div>
			<div class="rounded-lg bg-surface-100-900 p-4 shadow">
				<p class="text-sm text-surface-500">Interest rate</p>
				<p class="text-xl font-semibold">{loan.interestRate}%</p>
			</div>
			<div class="rounded-lg bg-surface-100-900 p-4 shadow">
				<p class="text-sm text-surface-500">Tenure</p>
				<p class="text-xl font-semibold">{loan.tenureMonths} months</p>
			</div>
			<div class="rounded-lg bg-surface-100-900 p-4 shadow">
				<p class="text-sm text-surface-500">EMI</p>
				<p class="text-xl font-semibold">{formatCurrency(loan.emiAmount)}</p>
			</div>
		</div>

		<div class="rounded-lg bg-surface-100-900 p-4 shadow">
			<h2 class="h4 mb-4">Amortization preview (first year)</h2>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-surface-300-700">
							<th class="py-2">Month</th>
							<th class="py-2">Date</th>
							<th class="py-2">EMI</th>
							<th class="py-2">Principal</th>
							<th class="py-2">Interest</th>
							<th class="py-2">Balance</th>
						</tr>
					</thead>
					<tbody>
						{#each amortization as row}
							<tr class="border-b border-surface-200-800">
								<td class="py-2">{row.month}</td>
								<td class="py-2">{row.date}</td>
								<td class="py-2">{formatCurrency(row.emi)}</td>
								<td class="py-2">{formatCurrency(row.principal)}</td>
								<td class="py-2">{formatCurrency(row.interest)}</td>
								<td class="py-2">{formatCurrency(row.balance)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/if}
