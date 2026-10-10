<script lang="ts">
	import { auth } from '../../lib/stores/auth.svelte';
	import { householdStore } from '../../lib/stores/household.svelte';
	import { dataStore } from '../../lib/stores/data.svelte';
	import { generateICS } from '../../lib/utils';

	let inviteUrl = $state('');
	let copied = $state(false);
	let backupStatus = $state('');
	let restoring = $state(false);

	const webcalUrl = $derived(
		dataStore.settings?.calendarToken
			? `webcal://${typeof window !== 'undefined' ? window.location.host : 'my-home-app.netlify.app'}/api/webcal/${dataStore.settings.calendarToken}.ics`
			: ''
	);

	async function generateInvite() {
		try {
			const token = await householdStore.createInvite();
			inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://my-home-app.netlify.app'}/invite/${token}`;
		} catch (err) {
			backupStatus = err instanceof Error ? err.message : 'Failed to create invite';
		}
	}

	function copyInvite() {
		navigator.clipboard.writeText(inviteUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function copyWebcal() {
		if (!webcalUrl) return;
		navigator.clipboard.writeText(webcalUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function backupNow() {
		backupStatus = 'Backing up...';
		try {
			await householdStore.saveBackup();
			backupStatus = 'Backup saved successfully';
		} catch (err) {
			backupStatus = err instanceof Error ? err.message : 'Backup failed';
		}
	}

	async function restoreNow() {
		restoring = true;
		backupStatus = 'Restoring...';
		try {
			await householdStore.loadBackup();
			if (householdStore.household) {
				await dataStore.load(householdStore.household.id);
			}
			backupStatus = 'Restore completed';
		} catch (err) {
			backupStatus = err instanceof Error ? err.message : 'Restore failed';
		}
		restoring = false;
	}

	function downloadICS() {
		const ics = generateICS(householdStore.household?.name || 'My Home', dataStore.schedules);
		const blob = new Blob([ics], { type: 'text/calendar' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'my-home-schedules.ics';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-6">
	<h1 class="h2">Settings</h1>

	<div class="rounded-lg bg-surface-100-900 p-6 shadow">
		<h2 class="h4 mb-2">Household</h2>
		{#if householdStore.household}
			<p class="text-lg font-semibold">{householdStore.household.name}</p>
			<p class="text-sm text-surface-500 capitalize">Role: {householdStore.household.role}</p>
		{:else}
			<p class="text-surface-600-400">No household joined.</p>
		{/if}
	</div>

	<div class="rounded-lg bg-surface-100-900 p-6 shadow">
		<h2 class="h4 mb-4">Invite members</h2>
		{#if householdStore.household?.role === 'owner'}
			{#if inviteUrl}
				<div class="flex flex-col gap-2 md:flex-row">
					<input
						type="text"
						readonly
						value={inviteUrl}
						class="input flex-1 rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
					/>
					<button
						onclick={copyInvite}
						class="btn rounded-md bg-secondary-500 px-4 py-2 text-white hover:bg-secondary-600"
					>
						{copied ? 'Copied!' : 'Copy link'}
					</button>
				</div>
			{:else}
				<button
					onclick={generateInvite}
					class="btn rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
				>
					Generate invite link
				</button>
			{/if}
		{:else}
			<p class="text-surface-600-400">Only the household owner can invite new members.</p>
		{/if}
	</div>

	<div class="rounded-lg bg-surface-100-900 p-6 shadow">
		<h2 class="h4 mb-2">Apple Calendar</h2>
		<p class="mb-4 text-surface-600-400">
			Subscribe to this webcal URL in Apple Calendar to see payment due dates automatically.
		</p>
		{#if webcalUrl}
			<div class="flex flex-col gap-2 md:flex-row">
				<input
					type="text"
					readonly
					value={webcalUrl}
					class="input flex-1 rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
				/>
				<button
					onclick={copyWebcal}
					class="btn rounded-md bg-secondary-500 px-4 py-2 text-white hover:bg-secondary-600"
				>
					{copied ? 'Copied!' : 'Copy webcal'}
				</button>
			</div>
			<button
				onclick={downloadICS}
				class="btn mt-4 rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
			>
				Download current schedules as .ics
			</button>
		{:else}
			<p class="text-surface-500">Calendar token not available.</p>
		{/if}
	</div>

	<div class="rounded-lg bg-surface-100-900 p-6 shadow">
		<h2 class="h4 mb-2">Encrypted cloud backup</h2>
		<p class="mb-4 text-surface-600-400">
			Your data is encrypted in the browser before being stored in Supabase.
		</p>
		<div class="flex gap-2">
			<button
				onclick={backupNow}
				class="btn rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
			>
				Backup now
			</button>
			<button
				onclick={restoreNow}
				disabled={restoring}
				class="btn rounded-md bg-secondary-500 px-4 py-2 text-white hover:bg-secondary-600 disabled:opacity-50"
			>
				{restoring ? 'Restoring...' : 'Restore from backup'}
			</button>
		</div>
		{#if backupStatus}
			<p class="mt-2 text-sm text-surface-600-400">{backupStatus}</p>
		{/if}
	</div>

	<div class="rounded-lg bg-surface-100-900 p-6 shadow">
		<h2 class="h4 mb-2">Account</h2>
		<p class="text-surface-600-400">{auth.user?.email}</p>
	</div>
</div>
