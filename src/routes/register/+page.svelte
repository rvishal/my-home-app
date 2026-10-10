<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth } from '../../lib/stores/auth.svelte';
	import { householdStore } from '../../lib/stores/household.svelte';

	const inviteToken = $derived(page.url.searchParams.get('invite'));

	let email = $state('');
	let password = $state('');
	let householdName = $state('');
	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let error = $state('');
	let isSubmitting = $state(false);

	async function handleSignUp(e: Event) {
		e.preventDefault();
		error = '';
		isSubmitting = true;
		try {
			await auth.signUp(email, password);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign up failed';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleCreateHousehold(e: Event) {
		e.preventDefault();
		error = '';
		if (passphrase !== confirmPassphrase) {
			error = 'Passphrases do not match';
			return;
		}
		if (!auth.user) {
			error = 'Not signed in';
			return;
		}
		isSubmitting = true;
		try {
			await householdStore.createHousehold(auth.user.id, householdName || 'My Household', passphrase);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create household';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleAcceptInvite(e: Event) {
		e.preventDefault();
		error = '';
		if (!auth.user || !inviteToken) {
			error = 'Missing invite or not signed in';
			return;
		}
		isSubmitting = true;
		try {
			await householdStore.acceptInvite(inviteToken, auth.user.id, passphrase);
			goto('/dashboard');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to accept invite';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="mx-auto max-w-md pt-10">
	<div class="rounded-lg bg-surface-100-900 p-6 shadow-lg">
		{#if !auth.user}
			<h1 class="h3 mb-2">Create account</h1>
			<p class="mb-4 text-surface-600-400">Get started with My Home App.</p>
			<form onsubmit={handleSignUp} class="space-y-4">
				<label class="label">
					<span>Email</span>
					<input
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				<label class="label">
					<span>Password</span>
					<input
						type="password"
						bind:value={password}
						placeholder="••••••••"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				{#if error}
					<p class="text-error-500 text-sm">{error}</p>
				{/if}
				<button
					type="submit"
					disabled={isSubmitting}
					class="btn w-full rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
				>
					{isSubmitting ? 'Creating account...' : 'Create account'}
				</button>
			</form>
			<p class="mt-4 text-center text-sm text-surface-500">
				Already have an account? <a href="/login" class="text-primary-500 hover:underline">Sign in</a>
			</p>
		{:else if inviteToken}
			<h1 class="h3 mb-2">Join household</h1>
			<p class="mb-4 text-surface-600-400">
				Enter the household passphrase shared by the owner to decrypt shared data.
			</p>
			<form onsubmit={handleAcceptInvite} class="space-y-4">
				<label class="label">
					<span>Household passphrase</span>
					<input
						type="password"
						bind:value={passphrase}
						placeholder="Shared passphrase"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				{#if error}
					<p class="text-error-500 text-sm">{error}</p>
				{/if}
				<button
					type="submit"
					disabled={isSubmitting}
					class="btn w-full rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
				>
					{isSubmitting ? 'Joining...' : 'Join household'}
				</button>
			</form>
		{:else}
			<h1 class="h3 mb-2">Create household</h1>
			<p class="mb-4 text-surface-600-400">
				Create your household to start tracking your home purchase and loans.
			</p>
			<form onsubmit={handleCreateHousehold} class="space-y-4">
				<label class="label">
					<span>Household name</span>
					<input
						type="text"
						bind:value={householdName}
						placeholder="e.g., Sharma Family"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				<label class="label">
					<span>Household passphrase</span>
					<input
						type="password"
						bind:value={passphrase}
						placeholder="Create a strong passphrase"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				<label class="label">
					<span>Confirm passphrase</span>
					<input
						type="password"
						bind:value={confirmPassphrase}
						placeholder="Confirm passphrase"
						class="input w-full rounded-md border border-surface-300-700 bg-surface-50-950 p-2"
						required
					/>
				</label>
				{#if error}
					<p class="text-error-500 text-sm">{error}</p>
				{/if}
				<button
					type="submit"
					disabled={isSubmitting}
					class="btn w-full rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
				>
					{isSubmitting ? 'Creating...' : 'Create household'}
				</button>
			</form>
		{/if}
	</div>
</div>
