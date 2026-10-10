<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '../../lib/stores/auth.svelte';
	import { householdStore } from '../../lib/stores/household.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		isSubmitting = true;
		try {
			await auth.signIn(email, password);
			if (auth.user) {
				await householdStore.fetchForUser(auth.user.id);
				if (!householdStore.household) {
					goto('/register');
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign in failed';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="mx-auto max-w-md pt-20">
	<div class="rounded-lg bg-surface-100-900 p-6 shadow-lg">
		<h1 class="h3 mb-2">Sign in</h1>
		<p class="mb-4 text-surface-600-400">Welcome back to My Home App.</p>
		<form onsubmit={handleSubmit} class="space-y-4">
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
				{isSubmitting ? 'Signing in...' : 'Sign in'}
			</button>
		</form>
		<p class="mt-4 text-center text-sm text-surface-500">
			Don't have an account? <a href="/register" class="text-primary-500 hover:underline">Register</a>
		</p>
	</div>
</div>
