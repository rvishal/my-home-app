<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth } from '../../../lib/stores/auth.svelte';
	import { householdStore } from '../../../lib/stores/household.svelte';

	const token = $derived(page.params.token ?? '');
	let passphrase = $state('');
	let error = $state('');
	let isSubmitting = $state(false);

	async function handleJoin(e: Event) {
		e.preventDefault();
		error = '';
		const user = auth.user;
		const userId = user?.id;
		if (!userId) {
			goto(`/login?invite=${token}`);
			return;
		}
		isSubmitting = true;
		try {
			await householdStore.acceptInvite(token, userId as string, passphrase);
			goto('/dashboard');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to join household';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="mx-auto max-w-md pt-20">
	<div class="rounded-lg bg-surface-100-900 p-6 shadow-lg">
		<h1 class="h3 mb-2">Join household</h1>
		<p class="mb-4 text-surface-600-400">
			Enter the household passphrase shared by the owner to decrypt shared data.
		</p>
		{#if !auth.user}
			<p class="mb-4 text-surface-600-400">
				Please <a href="/login" class="text-primary-500 hover:underline">sign in</a> or
				<a href="/register" class="text-primary-500 hover:underline">register</a> first.
			</p>
		{:else}
			<form onsubmit={handleJoin} class="space-y-4">
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
		{/if}
	</div>
</div>
