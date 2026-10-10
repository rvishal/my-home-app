<script lang="ts">
	import { auth } from '../../lib/stores/auth.svelte';
	import { householdStore } from '../../lib/stores/household.svelte';
	import { dataStore } from '../../lib/stores/data.svelte';
	import { generateICS, upcomingSchedules } from '../../lib/utils';
	import {
		sendTelegram,
		formatReminderMessage,
		formatHomeMessage
	} from '../../lib/telegram';

	let inviteUrl = $state('');
	let copied = $state(false);
	let backupStatus = $state('');
	let restoring = $state(false);
	let telegramStatus = $state('');
	let savingTelegram = $state(false);

	let telegramBotToken = $state(dataStore.settings?.telegramBotToken ?? '');
	let telegramChatId = $state(dataStore.settings?.telegramChatId ?? '');
	let telegramRemindersEnabled = $state(
		dataStore.settings?.telegramRemindersEnabled ?? false
	);

	$effect(() => {
		telegramBotToken = dataStore.settings?.telegramBotToken ?? '';
		telegramChatId = dataStore.settings?.telegramChatId ?? '';
		telegramRemindersEnabled = dataStore.settings?.telegramRemindersEnabled ?? false;
	});

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

	async function saveTelegramSettings() {
		savingTelegram = true;
		telegramStatus = 'Saving...';
		try {
			await dataStore.updateSettings({
				telegramBotToken,
				telegramChatId,
				telegramRemindersEnabled
			});
			telegramStatus = 'Telegram settings saved';
		} catch (err) {
			telegramStatus = err instanceof Error ? err.message : 'Failed to save settings';
		}
		savingTelegram = false;
	}

	async function testTelegram() {
		if (!telegramBotToken || !telegramChatId) {
			telegramStatus = 'Please enter bot token and chat ID';
			return;
		}
		telegramStatus = 'Sending test message...';
		try {
			const home = dataStore.homes[0];
			const message = home
				? formatHomeMessage(home)
				: 'Hello from My Home App! Telegram integration is working.';
			await sendTelegram(telegramBotToken, telegramChatId, message);
			telegramStatus = 'Test message sent';
		} catch (err) {
			telegramStatus = err instanceof Error ? err.message : 'Failed to send test message';
		}
	}

	async function sendTelegramReminders() {
		if (!telegramBotToken || !telegramChatId) {
			telegramStatus = 'Please enter bot token and chat ID';
			return;
		}
		telegramStatus = 'Sending reminders...';
		try {
			const upcoming = upcomingSchedules(dataStore.schedules, 7);
			const message = formatReminderMessage(upcoming);
			await sendTelegram(telegramBotToken, telegramChatId, message);
			telegramStatus = 'Reminders sent';
		} catch (err) {
			telegramStatus = err instanceof Error ? err.message : 'Failed to send reminders';
		}
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
		<h2 class="h4 mb-2">Telegram</h2>
		<p class="mb-4 text-surface-600-400">
			Connect a Telegram bot to share details and get payment reminders. The bot token is sent
			only to this app's server endpoint and is never logged or exposed in the UI.
		</p>
		<div class="grid gap-4 md:grid-cols-2">
			<label class="label">
				<span>Bot token</span>
				<input
					type="password"
					bind:value={telegramBotToken}
					placeholder="123456:ABC-DEF..."
					class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
				/>
			</label>
			<label class="label">
				<span>Chat ID</span>
				<input
					type="text"
					bind:value={telegramChatId}
					placeholder="@mychannel or 123456789"
					class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
				/>
			</label>
		</div>
		<label class="label mt-4 flex items-center gap-2">
			<input type="checkbox" bind:checked={telegramRemindersEnabled} />
			<span>Enable automatic payment reminders via Telegram</span>
		</label>
		<div class="mt-4 flex flex-wrap gap-2">
			<button
				onclick={saveTelegramSettings}
				disabled={savingTelegram}
				class="btn rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
			>
				{savingTelegram ? 'Saving...' : 'Save Telegram settings'}
			</button>
			<button
				onclick={testTelegram}
				class="btn rounded-md bg-secondary-500 px-4 py-2 text-white hover:bg-secondary-600"
			>
				Send test message
			</button>
			<button
				onclick={sendTelegramReminders}
				class="btn rounded-md bg-tertiary-500 px-4 py-2 text-white hover:bg-tertiary-600"
			>
				Send weekly reminders now
			</button>
		</div>
		{#if telegramStatus}
			<p class="mt-2 text-sm text-surface-600-400">{telegramStatus}</p>
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
