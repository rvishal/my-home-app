<script lang="ts">
	import { goto } from '$app/navigation';
	import { dataStore } from '../../lib/stores/data.svelte';
	import { householdStore } from '../../lib/stores/household.svelte';
	import { generateId } from '../../lib/crypto';
	import { formatCurrency, calculateEMI } from '../../lib/utils';
	import type { Loan } from '../../lib/types';

	let showForm = $state(false);
	let homeId = $state('');
	let bankName = $state('');
	let loanAmount = $state('');
	let interestRate = $state('');
	let tenureMonths = $state('');
	let emiAmount = $state('');

	$effect(() => {
		const principal = Number(loanAmount) || 0;
		const rate = Number(interestRate) || 0;
		const tenure = Number(tenureMonths) || 0;
		const emi = calculateEMI(principal, rate, tenure);
		emiAmount = emi ? String(emi) : '';
	});

	async function addLoan(e: Event) {
		e.preventDefault();
		if (!householdStore.household) return;
		const loan: Loan = {
			id: generateId(),
			householdId: householdStore.household.id,
			homeId,
			bankName,
			loanAmount: Number(loanAmount) || 0,
			interestRate: Number(interestRate) || 0,
			tenureMonths: Number(tenureMonths) || 0,
			emiAmount: Number(emiAmount) || 0,
			emiDueDay: 5,
			sanctionDate: new Date().toISOString().split('T')[0],
			disbursementSchedule: [],
			coApplicants: [],
			documents: [],
			notes: '',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		await dataStore.addLoan(loan);
		homeId = '';
		bankName = '';
		loanAmount = '';
		interestRate = '';
		tenureMonths = '';
		emiAmount = '';
		showForm = false;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="h2">Home Loans</h1>
		<button
			onclick={() => (showForm = !showForm)}
			class="btn rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
		>
			{showForm ? 'Cancel' : 'Add Loan'}
		</button>
	</div>

	{#if showForm}
		<form onsubmit={addLoan} class="rounded-lg bg-surface-100-900 p-4 shadow">
			<h2 class="h4 mb-4">Add a new loan</h2>
			<div class="grid gap-4 md:grid-cols-2">
				<label class="label">
					<span>Home</span>
					<select
						bind:value={homeId}
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					>
						<option value="">Select home</option>
						{#each dataStore.homes as home}
							<option value={home.id}>{home.name}</option>
						{/each}
					</select>
				</label>
				<label class="label">
					<span>Bank</span>
					<input
						type="text"
						bind:value={bankName}
						placeholder="e.g., HDFC Bank"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				<label class="label">
					<span>Loan amount</span>
					<input
						type="number"
						bind:value={loanAmount}
						placeholder="0"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				<label class="label">
					<span>Interest rate (% p.a.)</span>
					<input
						type="number"
						bind:value={interestRate}
						placeholder="8.5"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				<label class="label">
					<span>Tenure (months)</span>
					<input
						type="number"
						bind:value={tenureMonths}
						placeholder="240"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				<label class="label">
					<span>Calculated EMI</span>
					<input
						type="number"
						bind:value={emiAmount}
						placeholder="Auto-calculated"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
					/>
				</label>
			</div>
			<button
				type="submit"
				class="btn mt-4 rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
			>
				Save Loan
			</button>
		</form>
	{/if}

	{#if dataStore.loans.length === 0}
		<div class="rounded-lg bg-surface-100-900 p-8 text-center shadow">
			<p class="text-surface-600-400">No loans added yet.</p>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each dataStore.loans as loan (loan.id)}
				<button
					onclick={() => goto(`/loans/${loan.id}`)}
					class="rounded-lg bg-surface-100-900 p-4 text-left shadow transition hover:shadow-md"
				>
					<h3 class="h4 text-primary-500">{loan.bankName}</h3>
					<p class="text-sm text-surface-600-400">
						{dataStore.homes.find((h) => h.id === loan.homeId)?.name || 'Unlinked'}
					</p>
					<p class="mt-2 text-lg font-semibold">{formatCurrency(loan.loanAmount)}</p>
					<p class="text-sm">{loan.interestRate}% for {loan.tenureMonths} months</p>
					<p class="text-sm font-medium">EMI: {formatCurrency(loan.emiAmount)}</p>
				</button>
			{/each}
		</div>
	{/if}
</div>
