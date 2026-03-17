<script lang="ts">
	import SportManager from '$lib/components/SportManager.svelte';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types.js';

	interface Props { data: PageData; }
	let { data }: Props = $props();

	let sports = $state(data.sports);
</script>

<svelte:head>
	<title>Esportes — Move View Photos</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div>
			<h1>Esportes</h1>
			<p>Gerencie os esportes disponíveis para seus eventos</p>
		</div>
	</div>

	<div class="layout">
		<!-- CRUD list -->
		<div class="manager-card">
			<SportManager bind:sports />
		</div>

		<!-- Info aside -->
		<aside class="info-aside">
			<div class="info-card">
				<div class="info-icon">
					<Icon icon="lucide:info" width="16" />
				</div>
				<div class="info-body">
					<strong>Como funciona</strong>
					<p>Os esportes cadastrados aqui aparecem como sugestões ao criar ou editar um evento. Você ainda pode digitar qualquer nome livremente.</p>
				</div>
			</div>
			<div class="info-card">
				<div class="info-icon">
					<Icon icon="lucide:trophy" width="16" />
				</div>
				<div class="info-body">
					<strong>{sports.length} esporte{sports.length !== 1 ? 's' : ''} cadastrado{sports.length !== 1 ? 's' : ''}</strong>
					<p>Adicione, renomeie ou remova esportes a qualquer momento.</p>
				</div>
			</div>
		</aside>
	</div>
</div>

<style>
	.page { width: 100%; max-width: 780px; }

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 32px;
		flex-wrap: wrap;
		gap: 16px;
	}

	.page-header h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 4px; }
	.page-header p  { color: var(--text-muted); margin: 0; font-size: 0.875rem; }

	.layout {
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 20px;
		align-items: start;
	}

	.manager-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 24px;
	}

	.info-aside {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.info-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 16px;
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}

	.info-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-xs);
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.info-body { display: flex; flex-direction: column; gap: 4px; }
	.info-body strong { font-size: 0.85rem; color: var(--text-primary); font-weight: 600; }
	.info-body p { font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.55; }

	@media (max-width: 680px) {
		.layout { grid-template-columns: 1fr; }
	}
</style>
