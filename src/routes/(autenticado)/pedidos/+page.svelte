<script lang="ts">
	import type { PageData } from './$types.js';
	import Icon from '@iconify/svelte';

	interface Props { data: PageData; }
	let { data }: Props = $props();

	function formatPrice(cents: number) {
		return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('pt-BR', {
			day: '2-digit', month: 'short', year: 'numeric'
		});
	}

	const statusLabel: Record<string, string> = {
		paid: 'Pago',
		pending: 'Pendente',
		failed: 'Falhou',
		refunded: 'Reembolsado'
	};
</script>

<svelte:head>
	<title>Meus Pedidos — Move View Photos</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1>Meus Pedidos</h1>
		<p>Histórico de todas as suas compras</p>
	</div>

	{#if data.orders.length === 0}
		<div class="empty-state">
			<Icon icon="lucide:receipt" width="40" />
			<h2>Nenhum pedido ainda</h2>
			<p>Suas compras aparecerão aqui.</p>
			<a href="/" class="btn-explore">Explorar eventos</a>
		</div>
	{:else}
		<div class="orders-list">
			{#each data.orders as order (order.id)}
				<div class="order-card">
					<div class="order-header">
						<div class="order-meta">
							<span class="order-id">#{order.id.slice(0, 8).toUpperCase()}</span>
							<span class="order-date"><Icon icon="lucide:calendar" width="13" /> {formatDate(order.createdAt)}</span>
						</div>
						<div class="order-right">
							<span class="status-badge status-{order.status}">{statusLabel[order.status] ?? order.status}</span>
							<span class="order-total">{formatPrice(order.totalAmount)}</span>
						</div>
					</div>

					{#if order.items.length > 0}
						<div class="order-body">
							<p class="event-label">
								<Icon icon="lucide:image" width="13" />
								{order.items[0].eventName}
								{#if new Set(order.items.map(i => i.eventSlug)).size > 1}
									<span class="muted"> + mais eventos</span>
								{/if}
								<span class="muted"> · {order.items.length} foto{order.items.length !== 1 ? 's' : ''}</span>
							</p>
							<div class="thumbs">
								{#each order.items.slice(0, 6) as item (item.photoId)}
									<img src={item.watermarkUrl} alt="" class="thumb" />
								{/each}
								{#if order.items.length > 6}
									<div class="thumb-more">+{order.items.length - 6}</div>
								{/if}
							</div>
						</div>
					{/if}

					<div class="order-footer">
						<a href="/minhas-fotos" class="btn-link">
							<Icon icon="lucide:image" width="13" /> Ver fotos
						</a>
						{#if order.status === 'paid'}
							<a href="/pedidos/sucesso?order={order.id}" class="btn-link">
								<Icon icon="lucide:receipt" width="13" /> Detalhes
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 760px;
		margin: 0 auto;
		padding: 40px 24px;
	}

	.page-header { margin-bottom: 32px; }
	.page-header h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 6px; }
	.page-header p { color: var(--text-muted); margin: 0; font-size: 0.9rem; }

	.empty-state {
		text-align: center;
		padding: 64px 24px;
		color: var(--text-muted);
	}

	.empty-state :global(svg) { margin-bottom: 16px; opacity: 0.35; }
	.empty-state h2 { font-size: 1.1rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; }
	.empty-state p { font-size: 0.9rem; margin-bottom: 24px; }

	.btn-explore {
		background: var(--accent);
		color: #050507;
		padding: 10px 24px;
		border-radius: var(--radius-sm);
		text-decoration: none;
		font-weight: 700;
		font-size: 0.9rem;
	}

	.orders-list { display: flex; flex-direction: column; gap: 16px; }

	.order-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.order-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color);
		gap: 12px;
		flex-wrap: wrap;
	}

	.order-meta { display: flex; align-items: center; gap: 12px; }

	.order-id {
		font-weight: 700;
		font-size: 0.85rem;
		font-family: monospace;
		color: var(--text-primary);
	}

	.order-date {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--text-muted);
		font-size: 0.82rem;
	}

	.order-right { display: flex; align-items: center; gap: 12px; }

	.order-total {
		font-weight: 700;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.status-badge {
		font-size: 0.72rem;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 3px;
		letter-spacing: 0.3px;
	}

	.status-paid { background: rgba(61,201,13,0.12); color: var(--accent); border: 1px solid rgba(61,201,13,0.25); }
	.status-pending { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
	.status-failed { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.25); }
	.status-refunded { background: rgba(99,102,241,0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25); }

	.order-body { padding: 16px 20px; }

	.event-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0 0 12px;
	}

	.muted { color: var(--text-muted); }

	.thumbs {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.thumb {
		width: 56px;
		height: 56px;
		object-fit: cover;
		border-radius: var(--radius-xs);
		background: var(--bg-elevated);
	}

	.thumb-more {
		width: 56px;
		height: 56px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		color: var(--text-muted);
		font-weight: 600;
	}

	.order-footer {
		display: flex;
		gap: 16px;
		padding: 12px 20px;
		border-top: 1px solid var(--border-color);
		background: rgba(255,255,255,0.015);
	}

	.btn-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: var(--accent);
		text-decoration: none;
		font-size: 0.82rem;
		font-weight: 600;
		transition: opacity 0.2s;
	}

	.btn-link:hover { opacity: 0.75; }
</style>
