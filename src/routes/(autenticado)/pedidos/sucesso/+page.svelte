<script lang="ts">
	import { formatPrice } from '$lib/stores/cart.js';
	import type { PageData } from './$types.js';
	import Icon from '@iconify/svelte';

	interface Props { data: PageData; }
	let { data }: Props = $props();

	const isPaid = $derived(data.order.status === 'paid');
</script>

<svelte:head>
	<title>Pedido confirmado — Move View Photos</title>
</svelte:head>

<div class="success-page">
	<div class="success-card">
		{#if isPaid}
			<div class="icon-wrap paid">
				<Icon icon="lucide:circle-check" width="40" />
			</div>
			<h1>Pagamento confirmado!</h1>
			<p class="subtitle">Suas fotos já estão disponíveis para download em alta resolução.</p>
		{:else}
			<div class="icon-wrap pending">
				<Icon icon="lucide:clock" width="40" />
			</div>
			<h1>Pedido recebido</h1>
			<p class="subtitle">Seu pedido está sendo processado. Você receberá um e-mail quando o pagamento for confirmado.</p>
		{/if}

		<div class="order-summary">
			<div class="summary-row">
				<span>Pedido</span>
				<strong>#{data.order.id.slice(0, 8).toUpperCase()}</strong>
			</div>
			<div class="summary-row">
				<span>Fotos</span>
				<strong>{data.order.items.length} foto{data.order.items.length !== 1 ? 's' : ''}</strong>
			</div>
			<div class="summary-row total">
				<span>Total pago</span>
				<strong class="accent">{formatPrice(data.order.totalAmount)}</strong>
			</div>
		</div>

		{#if data.order.items.length > 0}
			<div class="thumbs">
				{#each data.order.items.slice(0, 6) as item (item.photoId)}
					<div class="thumb-wrap">
						<img src={item.watermarkUrl} alt={item.eventName} class="thumb" />
					</div>
				{/each}
				{#if data.order.items.length > 6}
					<div class="thumb-more">+{data.order.items.length - 6}</div>
				{/if}
			</div>
		{/if}

		<div class="actions">
			{#if isPaid}
				<a href="/minhas-fotos" class="btn-primary">
					<Icon icon="lucide:download" width="16" />
					Ver e baixar minhas fotos
				</a>
			{/if}
			<a href="/" class="btn-ghost">Explorar mais eventos</a>
		</div>
	</div>
</div>

<style>
	.success-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.success-card {
		width: 100%;
		max-width: 480px;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 48px 40px;
		text-align: center;
	}

	.icon-wrap {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 20px;
	}

	.icon-wrap.paid {
		background: rgba(61, 201, 13, 0.12);
		border: 1px solid rgba(61, 201, 13, 0.3);
		color: var(--accent);
	}

	.icon-wrap.pending {
		background: rgba(251, 191, 36, 0.12);
		border: 1px solid rgba(251, 191, 36, 0.3);
		color: #fbbf24;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 800;
		font-family: var(--font-display);
		margin-bottom: 10px;
	}

	.subtitle {
		color: var(--text-muted);
		font-size: 0.92rem;
		line-height: 1.6;
		margin-bottom: 28px;
	}

	.order-summary {
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 16px 20px;
		margin-bottom: 24px;
		text-align: left;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 7px 0;
		border-bottom: 1px solid var(--border-color);
		font-size: 0.875rem;
	}

	.summary-row:last-child { border-bottom: none; }
	.summary-row span { color: var(--text-muted); }
	.summary-row strong { color: var(--text-secondary); }
	.summary-row.total strong { font-size: 1rem; }
	.accent { color: var(--accent) !important; }

	.thumbs {
		display: flex;
		justify-content: center;
		gap: 6px;
		margin-bottom: 28px;
		flex-wrap: wrap;
	}

	.thumb-wrap {
		width: 60px;
		height: 60px;
		border-radius: var(--radius-xs);
		overflow: hidden;
		border: 1px solid var(--border-color);
	}

	.thumb { width: 100%; height: 100%; object-fit: cover; display: block; }

	.thumb-more {
		width: 60px;
		height: 60px;
		border-radius: var(--radius-xs);
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		background: var(--accent);
		color: #050507;
		text-decoration: none;
		padding: 13px 24px;
		border-radius: var(--radius-sm);
		font-weight: 700;
		font-size: 0.95rem;
		transition: opacity 0.2s;
	}

	.btn-primary:hover { opacity: 0.85; }

	.btn-ghost {
		display: inline-block;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.875rem;
		padding: 8px;
		transition: color 0.2s;
	}

	.btn-ghost:hover { color: var(--text-secondary); }
</style>
