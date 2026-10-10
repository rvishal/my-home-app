<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { dataStore } from '../../../lib/stores/data.svelte';
	import { formatCurrency, formatDate } from '../../../lib/utils';

	const id = $derived(page.params.id);
	let home = $derived(dataStore.homes.find((h) => h.id === id));
	let isEditing = $state(false);
	let saving = $state(false);

	let form = $state({
		name: '',
		address: '',
		builderName: '',
		builderContact: '',
		purchasePrice: 0,
		agreementValue: 0,
		registrationCost: 0,
		gstAmount: 0,
		otherCosts: 0,
		possessionDate: '',
		floorPlan: '',
		status: 'booking' as 'booking' | 'construction' | 'ready' | 'registered',
		notes: ''
	});

	$effect(() => {
		if (home && !isEditing) {
			form = { ...home };
		}
	});

	async function save() {
		if (!home) return;
		saving = true;
		await dataStore.updateHome({ ...home, ...form, updatedAt: new Date().toISOString() });
		isEditing = false;
		saving = false;
	}

	async function remove() {
		if (!home) return;
		if (!confirm('Delete this home and all associated loans/schedules?')) return;
		await dataStore.deleteHome(home.id);
		goto('/homes');
	}
</script>

{#if !home}
	<p class="text-surface-500">Home not found.</p>
{:else}
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<h1 class="h2">{home.name}</h1>
			<div class="flex gap-2">
				<button
					onclick={() => (isEditing = !isEditing)}
					class="btn rounded-md bg-secondary-500 px-4 py-2 text-white hover:bg-secondary-600"
				>
					{isEditing ? 'Cancel' : 'Edit'}
				</button>
				<button
					onclick={remove}
					class="btn rounded-md bg-error-500 px-4 py-2 text-white hover:bg-error-600"
				>
					Delete
				</button>
			</div>
		</div>

		{#if isEditing}
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="rounded-lg bg-surface-100-900 p-4 shadow">
				<div class="grid gap-4 md:grid-cols-2">
					<label class="label">
						<span>Name</span>
						<input type="text" bind:value={form.name} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" required />
					</label>
					<label class="label">
						<span>Builder</span>
						<input type="text" bind:value={form.builderName} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label md:col-span-2">
						<span>Address</span>
						<input type="text" bind:value={form.address} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label">
						<span>Builder contact</span>
						<input type="text" bind:value={form.builderContact} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label">
						<span>Purchase price</span>
						<input type="number" bind:value={form.purchasePrice} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label">
						<span>Agreement value</span>
						<input type="number" bind:value={form.agreementValue} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label">
						<span>Registration cost</span>
						<input type="number" bind:value={form.registrationCost} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label">
						<span>GST</span>
						<input type="number" bind:value={form.gstAmount} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label">
						<span>Other costs</span>
						<input type="number" bind:value={form.otherCosts} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label">
						<span>Possession date</span>
						<input type="date" bind:value={form.possessionDate} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label">
						<span>Status</span>
						<select bind:value={form.status} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2">
							<option value="booking">Booking</option>
							<option value="construction">Construction</option>
							<option value="ready">Ready</option>
							<option value="registered">Registered</option>
						</select>
					</label>
					<label class="label md:col-span-2">
						<span>Floor plan / unit details</span>
						<input type="text" bind:value={form.floorPlan} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" />
					</label>
					<label class="label md:col-span-2">
						<span>Notes</span>
						<textarea bind:value={form.notes} class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2" rows="3"></textarea>
					</label>
				</div>
				<button type="submit" disabled={saving} class="btn mt-4 rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50">
					{saving ? 'Saving...' : 'Save changes'}
				</button>
			</form>
		{:else}
			<div class="rounded-lg bg-surface-100-900 p-6 shadow">
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<p class="text-sm text-surface-500">Address</p>
						<p>{home.address || '—'}</p>
					</div>
					<div>
						<p class="text-sm text-surface-500">Builder</p>
						<p>{home.builderName || '—'} {home.builderContact ? `(${home.builderContact})` : ''}</p>
					</div>
					<div>
						<p class="text-sm text-surface-500">Purchase price</p>
						<p class="text-lg font-semibold">{formatCurrency(home.purchasePrice)}</p>
					</div>
					<div>
						<p class="text-sm text-surface-500">Possession</p>
						<p>{formatDate(home.possessionDate)}</p>
					</div>
					<div>
						<p class="text-sm text-surface-500">Status</p>
						<p class="capitalize">{home.status}</p>
					</div>
					<div>
						<p class="text-sm text-surface-500">Floor plan</p>
						<p>{home.floorPlan || '—'}</p>
					</div>
				</div>
				{#if home.notes}
					<div class="mt-4">
						<p class="text-sm text-surface-500">Notes</p>
						<p>{home.notes}</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
