<script lang="ts">
	import { goto } from '$app/navigation';
	import { dataStore } from '../../lib/stores/data.svelte';
	import { householdStore } from '../../lib/stores/household.svelte';
	import { generateId } from '../../lib/crypto';
	import { formatCurrency, formatDate } from '../../lib/utils';
	import type { Home } from '../../lib/types';

	let showForm = $state(false);
	let name = $state('');
	let address = $state('');
	let builderName = $state('');
	let purchasePrice = $state('');

	function resetForm() {
		name = '';
		address = '';
		builderName = '';
		purchasePrice = '';
		showForm = false;
	}

	async function addHome(e: Event) {
		e.preventDefault();
		if (!householdStore.household) return;
		const home: Home = {
			id: generateId(),
			householdId: householdStore.household.id,
			name,
			address,
			builderName,
			builderContact: '',
			purchasePrice: Number(purchasePrice) || 0,
			agreementValue: Number(purchasePrice) || 0,
			registrationCost: 0,
			gstAmount: 0,
			otherCosts: 0,
			possessionDate: new Date().toISOString().split('T')[0],
			floorPlan: '',
			status: 'booking',
			notes: '',
			documents: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		await dataStore.addHome(home);
		resetForm();
	}

	function openHome(id: string) {
		goto(`/homes/${id}`);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="h2">My Homes</h1>
		<button
			onclick={() => (showForm = !showForm)}
			class="btn rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
		>
			{showForm ? 'Cancel' : 'Add Home'}
		</button>
	</div>

	{#if showForm}
		<form onsubmit={addHome} class="rounded-lg bg-surface-100-900 p-4 shadow">
			<h2 class="h4 mb-4">Add a new home</h2>
			<div class="grid gap-4 md:grid-cols-2">
				<label class="label">
					<span>Name</span>
					<input
						type="text"
						bind:value={name}
						placeholder="e.g., Dream Villa"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				<label class="label">
					<span>Builder</span>
					<input
						type="text"
						bind:value={builderName}
						placeholder="Builder name"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
					/>
				</label>
				<label class="label md:col-span-2">
					<span>Address</span>
					<input
						type="text"
						bind:value={address}
						placeholder="Property address"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
					/>
				</label>
				<label class="label">
					<span>Purchase price</span>
					<input
						type="number"
						bind:value={purchasePrice}
						placeholder="0"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
					/>
				</label>
			</div>
			<button
				type="submit"
				class="btn mt-4 rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
			>
				Save Home
			</button>
		</form>
	{/if}

	{#if dataStore.homes.length === 0}
		<div class="rounded-lg bg-surface-100-900 p-8 text-center shadow">
			<p class="text-surface-600-400">No homes added yet. Add your first home to get started.</p>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each dataStore.homes as home (home.id)}
				<button
					onclick={() => openHome(home.id)}
					class="rounded-lg bg-surface-100-900 p-4 text-left shadow transition hover:shadow-md"
				>
					<h3 class="h4 text-primary-500">{home.name}</h3>
					<p class="text-sm text-surface-600-400">{home.address || 'No address'}</p>
					<p class="mt-2 text-sm">Builder: {home.builderName || 'Not set'}</p>
					<p class="text-lg font-semibold">{formatCurrency(home.purchasePrice)}</p>
					<p class="text-xs text-surface-500">Possession: {formatDate(home.possessionDate)}</p>
				</button>
			{/each}
		</div>
	{/if}
</div>
