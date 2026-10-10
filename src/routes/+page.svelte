<script lang="ts">
	import { auth } from '../lib/stores/auth.svelte';
	import { householdStore } from '../lib/stores/household.svelte';
</script>

{#if auth.user}
	{#if householdStore.household}
		<meta http-equiv="refresh" content="0; url=/dashboard" />
	{:else}
		<meta http-equiv="refresh" content="0; url=/register" />
	{/if}
{:else}
	<meta http-equiv="refresh" content="0; url=/login" />
{/if}
