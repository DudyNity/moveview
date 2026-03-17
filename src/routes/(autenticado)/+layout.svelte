<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import type { LayoutData } from './$types.js';

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();
</script>

<Navbar user={data.user} />

<main>
	{@render children()}
</main>

<style>
	main { min-height: calc(100vh - 64px); }
</style>
