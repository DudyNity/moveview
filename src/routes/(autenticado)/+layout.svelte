<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { cart } from '$lib/stores/cart.js';
	import type { LayoutData } from './$types.js';

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	$effect(() => {
		cart.initForUser(data.user.id);
	});
</script>

<Navbar user={data.user} />

<main>
	{@render children()}
</main>

<style>
	main { min-height: calc(100vh - 64px); }
</style>
