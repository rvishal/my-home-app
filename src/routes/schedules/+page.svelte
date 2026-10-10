<script lang="ts">
	import { dataStore } from '../../lib/stores/data.svelte';
	import { householdStore } from '../../lib/stores/household.svelte';
	import { generateId } from '../../lib/crypto';
	import { formatCurrency, formatDate, getScheduleStatus, generateEMISchedules } from '../../lib/utils';
	import type { PaymentSchedule } from '../../lib/types';

	let showForm = $state(false);
	let title = $state('');
	let type = $state<'builder' | 'bank_emi' | 'custom'>('builder');
	let amount = $state('');
	let dueDate = $state(new Date().toISOString().split('T')[0]);
	let homeId = $state('');
	let loanId = $state('');
	let recurrence = $state<'none' | 'monthly' | 'quarterly'>('none');
	let notes = $state('');

	async function addSchedule(e: Event) {
		e.preventDefault();
		if (!householdStore.household) return;

		if (type === 'bank_emi' && loanId) {
			const loan = dataStore.loans.find((l) => l.id === loanId);
			if (loan) {
				const schedules = generateEMISchedules(loan, householdStore.household.id);
				for (const s of schedules) {
					await dataStore.addSchedule(s);
				}
			}
		} else {
			const schedule: PaymentSchedule = {
				id: generateId(),
				householdId: householdStore.household.id,
				homeId: homeId || undefined,
				loanId: loanId || undefined,
				title,
				type,
				amount: Number(amount) || 0,
				dueDate,
				recurrence,
				status: getScheduleStatus(dueDate, false),
				reminderDaysBefore: [7, 1],
				notes,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};
			await dataStore.addSchedule(schedule);
		}

		title = '';
		amount = '';
		dueDate = new Date().toISOString().split('T')[0];
		homeId = '';
		loanId = '';
		recurrence = 'none';
		notes = '';
		showForm = false;
	}

	async function togglePaid(schedule: PaymentSchedule) {
		if (schedule.status === 'paid') {
			schedule.status = 'pending';
			schedule.paidDate = undefined;
		} else {
			schedule.status = 'paid';
			schedule.paidDate = new Date().toISOString().split('T')[0];
		}
		schedule.updatedAt = new Date().toISOString();
		await dataStore.updateSchedule(schedule);
	}

	async function deleteSchedule(id: string) {
		if (!confirm('Delete this schedule?')) return;
		await dataStore.deleteSchedule(id);
	}

	const sortedSchedules = $derived(
		[...dataStore.schedules].sort(
			(a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
		)
	);
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="h2">Payment Schedules</h1>
		<button
			onclick={() => (showForm = !showForm)}
			class="btn rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
		>
			{showForm ? 'Cancel' : 'Add Schedule'}
		</button>
	</div>

	{#if showForm}
		<form onsubmit={addSchedule} class="rounded-lg bg-surface-100-900 p-4 shadow">
			<h2 class="h4 mb-4">Add schedule</h2>
			<div class="grid gap-4 md:grid-cols-2">
				<label class="label">
					<span>Type</span>
					<select
						bind:value={type}
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
					>
						<option value="builder">Builder milestone</option>
						<option value="bank_emi">Bank EMI (auto-generate)</option>
						<option value="custom">Custom reminder</option>
					</select>
				</label>
				<label class="label">
					<span>Title</span>
					<input
						type="text"
						bind:value={title}
						placeholder="e.g., 10% slab payment"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required={type !== 'bank_emi'}
					/>
				</label>
				<label class="label">
					<span>Amount</span>
					<input
						type="number"
						bind:value={amount}
						placeholder="0"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required={type !== 'bank_emi'}
					/>
				</label>
				<label class="label">
					<span>Due date</span>
					<input
						type="date"
						bind:value={dueDate}
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required={type !== 'bank_emi'}
					/>
				</label>
				<label class="label">
					<span>Home</span>
					<select
						bind:value={homeId}
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
					>
						<option value="">Select home</option>
						{#each dataStore.homes as home}
							<option value={home.id}>{home.name}</option>
						{/each}
					</select>
				</label>
				<label class="label">
					<span>Loan (required for EMI auto-generate)</span>
					<select
						bind:value={loanId}
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
					>
						<option value="">Select loan</option>
						{#each dataStore.loans as loan}
							<option value={loan.id}>{loan.bankName}</option>
						{/each}
					</select>
				</label>
				<label class="label">
					<span>Recurrence</span>
					<select
						bind:value={recurrence}
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
					>
						<option value="none">None</option>
						<option value="monthly">Monthly</option>
						<option value="quarterly">Quarterly</option>
					</select>
				</label>
				<label class="label md:col-span-2">
					<span>Notes</span>
					<textarea
						bind:value={notes}
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						rows="2"
					></textarea>
				</label>
			</div>
			<button
				type="submit"
				class="btn mt-4 rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
			>
				Save Schedule
			</button>
		</form>
	{/if}

	{#if sortedSchedules.length === 0}
		<div class="rounded-lg bg-surface-100-900 p-8 text-center shadow">
			<p class="text-surface-600-400">No schedules yet. Add builder or bank payment schedules.</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each sortedSchedules as schedule (schedule.id)}
				<div
					class="flex flex-col justify-between gap-2 rounded-lg bg-surface-100-900 p-4 shadow md:flex-row md:items-center"
				>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="font-semibold">{schedule.title}</h3>
							<span
								class="rounded px-2 py-0.5 text-xs capitalize"
								class:bg-success-200={schedule.status === 'paid'}
								class:text-success-900={schedule.status === 'paid'}
								class:bg-warning-200={schedule.status === 'pending'}
								class:text-warning-900={schedule.status === 'pending'}
								class:bg-error-200={schedule.status === 'overdue'}
								class:text-error-900={schedule.status === 'overdue'}
							>
								{schedule.status}
							</span>
						</div>
						<p class="text-sm text-surface-600-400">
							Due {formatDate(schedule.dueDate)} · {formatCurrency(schedule.amount)}
						</p>
						{#if schedule.notes}
							<p class="text-xs text-surface-500">{schedule.notes}</p>
						{/if}
					</div>
					<div class="flex gap-2">
						<button
							onclick={() => togglePaid(schedule)}
							class="btn rounded-md px-3 py-1 text-sm {schedule.status === 'paid'
								? 'bg-warning-500 text-white'
								: 'bg-success-500 text-white'}"
						>
							{schedule.status === 'paid' ? 'Mark pending' : 'Mark paid'}
						</button>
						<button
							onclick={() => deleteSchedule(schedule.id)}
							class="btn rounded-md bg-error-500 px-3 py-1 text-sm text-white"
						>
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
