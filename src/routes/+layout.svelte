<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { auth } from '../lib/stores/auth.svelte';
	import { householdStore } from '../lib/stores/household.svelte';
	import { dataStore } from '../lib/stores/data.svelte';

	let { children } = $props();
	let passphrase = $state('');
	let unlockError = $state('');
	let isUnlocking = $state(false);

	onMount(async () => {
		await auth.init();
		if (auth.user) {
			await householdStore.fetchForUser(auth.user.id);
			if (householdStore.household) {
				await dataStore.load(householdStore.household.id);
			}
		}
	});

	async function handleUnlock(e: Event) {
		e.preventDefault();
		unlockError = '';
		isUnlocking = true;
		const ok = await householdStore.unlock(passphrase);
		if (ok && householdStore.household) {
			await householdStore.loadBackup();
			await dataStore.load(householdStore.household.id);
		} else {
			unlockError = 'Incorrect passphrase. Please try again.';
		}
		isUnlocking = false;
	}

	async function handleLogout() {
		await auth.signOut();
		householdStore.leave();
		dataStore.clear();
	}
</script>

<svelte:head>
	<title>My Home App</title>
</svelte:head>

{#if auth.isLoading || householdStore.isLoading}
	<div class="grid h-screen place-items-center">
		<p class="text-surface-500">Loading...</p>
	</div>
{:else if !auth.user}
	<main class="min-h-screen bg-surface-50-950">
		{@render children()}
	</main>
{:else if !householdStore.household}
	<main class="min-h-screen bg-surface-50-950 p-4">
		<div class="mx-auto max-w-md rounded-lg bg-surface-100-900 p-6 shadow-lg">
			{@render children()}
		</div>
	</main>
{:else if !householdStore.encryptionKey}
	<main class="min-h-screen bg-surface-50-950 p-4">
		<div class="mx-auto max-w-md rounded-lg bg-surface-100-900 p-6 shadow-lg">
			<h1 class="h3 mb-4">Unlock {householdStore.household.name}</h1>
			<p class="mb-4 text-surface-600-400">
				Enter your household passphrase to decrypt your local data.
			</p>
			<form onsubmit={handleUnlock} class="space-y-4">
				<label class="label">
					<span>Passphrase</span>
					<input
						type="password"
						bind:value={passphrase}
						placeholder="Your household passphrase"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				{#if unlockError}
					<p class="text-error-500 text-sm">{unlockError}</p>
				{/if}
				<button
					type="submit"
					disabled={isUnlocking}
					class="btn w-full rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
				>
					{isUnlocking ? 'Unlocking...' : 'Unlock'}
				</button>
			</form>
			<button onclick={handleLogout} class="mt-4 text-sm text-surface-500 underline">
				Sign out
			</button>
		</div>
	</main>
{:else}
	<div class="min-h-screen bg-surface-50-950">
		<nav class="bg-surface-100-900 border-b border-surface-200-800">
			<div class="mx-auto flex max-w-6xl items-center justify-between p-4">
				<a href="/" class="text-xl font-bold text-primary-500">My Home App</a>
				<div class="flex items-center gap-4">
					<a href="/dashboard" class="text-surface-700-300 hover:text-primary-500">Dashboard</a>
					<a href="/homes" class="text-surface-700-300 hover:text-primary-500">Homes</a>
					<a href="/loans" class="text-surface-700-300 hover:text-primary-500">Loans</a>
					<a href="/schedules" class="text-surface-700-300 hover:text-primary-500">Schedules</a>
					<a href="/settings" class="text-surface-700-300 hover:text-primary-500">Settings</a>
					<button
						onclick={handleLogout}
						class="text-sm text-surface-500 underline hover:text-surface-700-300"
					>
						Sign out
					</button>
				</div>
			</div>
		</nav>
		<main class="mx-auto max-w-6xl p-4">
			{@render children()}
		</main>
	</div>
{/if}
