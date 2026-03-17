<script lang="ts">
	import { formatPrice } from '$lib/stores/cart.js';
	import type { PageData } from './$types.js';
	import Icon from '@iconify/svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Minhas Fotos — Move View Photos</title>
</svelte:head>

<div class="page-container">
	<div class="page-header">
		<h1>Minhas Fotos</h1>
		<p>Fotos adquiridas disponíveis para download</p>
	</div>

	{#if data.orders.length === 0}
		<div class="empty-state">
			<div class="empty-icon">
				<Icon icon="lucide:camera-off" width="40" />
			</div>
			<h2>Nenhuma foto comprada ainda</h2>
			<p>Explore nossos eventos e compre suas fotos favoritas</p>
			<a href="/" class="btn-explore">Explorar Eventos</a>
		</div>
	{:else}
		<div class="orders-list">
			{#each data.orders as order (order.id)}
				<div class="order-card">
					<div class="order-header">
						<div class="order-info">
							<span class="order-id">Pedido #{order.id.slice(0, 8)}</span>
							<span class="order-date">{formatDate(order.createdAt)}</span>
							<span class="order-total">{formatPrice(order.totalAmount)}</span>
						</div>
						<a
							href="/api/download/pacote/{order.id}"
							class="btn-zip"
							download
						>
							<Icon icon="lucide:archive" width="14" />
							Download ZIP ({order.items.length} foto{order.items.length !== 1 ? 's' : ''})
						</a>
					</div>

					<div class="photos-grid">
						{#each order.items as item (item.photoId)}
							<div class="photo-item">
								<a href="/evento/{item.eventSlug}" class="photo-event-link">
									<img src={item.watermarkUrl} alt="Foto do evento" class="photo-thumb" />
								</a>
								<div class="photo-footer">
									<span class="photo-event">{item.eventName}</span>
									<a href="/api/download/{item.photoId}" class="btn-download" download>
										<Icon icon="lucide:download" width="12" /> HD
									</a>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page-container {
		max-width: 1280px;
		margin: 0 auto;
		padding: 40px 24px;
	}

	.page-header { margin-bottom: 32px; }
	.page-header h1 { font-size: 2rem; font-weight: 800; margin-bottom: 8px; }
	.page-header p { color: var(--text-muted); margin: 0; }

	.empty-state {
		text-align: center;
		padding: 80px 24px;
	}

	.empty-icon { color: var(--text-muted); margin-bottom: 16px; }
	.empty-state h2 { font-size: 1.3rem; margin-bottom: 8px; }
	.empty-state p { color: var(--text-muted); margin-bottom: 24px; }

	.btn-explore {
		display: inline-block;
		background: var(--accent);
		color: white;
		text-decoration: none;
		padding: 12px 28px;
		border-radius: 5px;
		font-weight: 700;
	}

	.orders-list { display: flex; flex-direction: column; gap: 24px; }

	.order-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		overflow: hidden;
	}

	.order-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color);
		flex-wrap: wrap;
		gap: 12px;
	}

	.order-info { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }

	.order-id { font-weight: 700; font-size: 0.9rem; color: var(--text-primary); }
	.order-date { color: var(--text-muted); font-size: 0.85rem; }
	.order-total { color: var(--accent); font-weight: 700; }

	.btn-zip {
		background: var(--accent);
		color: #050507;
		text-decoration: none;
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 700;
		transition: opacity 0.2s;
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
		gap: 7px;
	}

	.btn-zip:hover { opacity: 0.85; }

	.photos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 12px;
		padding: 16px 20px;
	}

	.photo-item {
		border-radius: 5px;
		overflow: hidden;
		background: #111;
		border: 1px solid var(--border-color);
	}

	.photo-thumb {
		width: 100%;
		aspect-ratio: 4/3;
		object-fit: cover;
		display: block;
	}

	.photo-event-link { display: block; }

	.photo-footer {
		padding: 8px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.photo-event {
		font-size: 0.75rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}

	.btn-download {
		background: none;
		border: 1px solid var(--accent);
		color: var(--accent);
		text-decoration: none;
		padding: 3px 8px;
		border-radius: var(--radius-xs);
		font-size: 0.72rem;
		font-weight: 700;
		white-space: nowrap;
		transition: all 0.2s;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.btn-download:hover {
		background: var(--accent);
		color: #050507;
	}
</style>
