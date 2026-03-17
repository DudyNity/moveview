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

<footer>
	<div class="footer-inner">
		<div class="footer-brand">
			<img src="/logo/logo.png" alt="Move View Photos" class="footer-logo" />
			<p>Fotografia esportiva profissional.<br />Cada movimento, eternizado.</p>
		</div>
		<div class="footer-links">
			<nav>
				<a href="/">Eventos</a>
				<a href="/privacidade">Privacidade</a>
				<a href="/termos">Termos de Uso</a>
			</nav>
			<span class="footer-copy">© {new Date().getFullYear()} Move View Photos</span>
		</div>
	</div>
</footer>

<style>
	main { min-height: calc(100vh - var(--nav-height) - 160px); }

	footer {
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		padding: 56px 28px;
	}

	.footer-inner {
		max-width: 1320px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 40px;
	}

	.footer-brand {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.footer-logo {
		height: 28px;
		max-width: 160px;
		width: auto;
		object-fit: contain;
		opacity: 0.55;
	}

	.footer-brand p {
		color: var(--text-muted);
		font-size: 0.825rem;
		line-height: 1.7;
		max-width: 220px;
		margin: 0;
	}

	.footer-links {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 16px;
	}

	.footer-links nav {
		display: flex;
		gap: 28px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.footer-links nav a {
		color: var(--text-muted);
		font-size: 0.825rem;
		transition: color 0.18s;
	}

	.footer-links nav a:hover { color: var(--text-secondary); }

	.footer-copy {
		color: var(--text-muted);
		font-size: 0.775rem;
		opacity: 0.5;
	}

	@media (max-width: 600px) {
		footer { padding: 40px 20px; }
		.footer-links { align-items: flex-start; }
		.footer-links nav { justify-content: flex-start; }
	}
</style>
