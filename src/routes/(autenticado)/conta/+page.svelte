<script lang="ts">
	import { formatPrice } from '$lib/stores/cart.js';
	import type { PageData } from './$types.js';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const statusLabel: Record<string, string> = {
		pending: 'Pendente',
		paid: 'Pago',
		failed: 'Falhou',
		refunded: 'Reembolsado'
	};

	const statusClass: Record<string, string> = {
		pending: 'status-pending',
		paid: 'status-paid',
		failed: 'status-failed',
		refunded: 'status-refunded'
	};

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Minha Conta — Move View Photos</title>
</svelte:head>

<div class="page-container">
	<div class="page-header">
		<h1>Minha Conta</h1>
	</div>

	<div class="account-grid">
		<!-- Profile Card -->
		<div class="card profile-card">
			<div class="avatar-large">
				{data.profile.name.charAt(0).toUpperCase()}
			</div>
			<div class="profile-info">
				<h2>{data.profile.name}</h2>
				<p class="email">{data.profile.email}</p>
				<span class="role-badge">{data.profile.role}</span>
			</div>
		</div>

		<!-- Stats -->
		<div class="stats-grid">
			<div class="stat-card">
				<strong>{data.stats.totalOrders}</strong>
				<span>Pedidos realizados</span>
			</div>
			<div class="stat-card">
				<strong>{formatPrice(data.stats.totalSpent)}</strong>
				<span>Total gasto</span>
			</div>
		</div>
	</div>

	<!-- Quick links -->
	<div class="quick-links">
		<a href="/minhas-fotos" class="quick-link">
			<span class="ql-icon">📷</span>
			<div>
				<strong>Minhas Fotos</strong>
				<p>Ver e baixar fotos compradas</p>
			</div>
		</a>
	</div>

	<!-- Recent Orders -->
	{#if data.recentOrders.length > 0}
		<div class="section">
			<h3>Pedidos recentes</h3>
			<div class="orders-table">
				{#each data.recentOrders as order (order.id)}
					<div class="order-row">
						<span class="order-id">#{order.id.slice(0, 8)}</span>
						<span class="order-date">{formatDate(order.createdAt)}</span>
						<span class="order-amount">{formatPrice(order.totalAmount)}</span>
						<span class="order-status {statusClass[order.status]}">{statusLabel[order.status]}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.page-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 40px 24px;
	}

	.page-header { margin-bottom: 32px; }
	.page-header h1 { font-size: 2rem; font-weight: 800; margin: 0; }

	.account-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 20px;
		margin-bottom: 24px;
		align-items: start;
	}

	@media (max-width: 640px) { .account-grid { grid-template-columns: 1fr; } }

	.card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 24px;
	}

	.profile-card {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.avatar-large {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--accent);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 800;
		flex-shrink: 0;
	}

	.profile-info h2 { margin: 0 0 4px; font-size: 1.1rem; }
	.email { color: var(--text-muted); font-size: 0.85rem; margin: 0 0 8px; }

	.role-badge {
		background: rgba(255,69,0,0.15);
		color: var(--accent);
		padding: 3px 10px;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.stat-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.stat-card strong { font-size: 1.8rem; font-weight: 800; color: var(--accent); }
	.stat-card span { color: var(--text-muted); font-size: 0.85rem; }

	.quick-links {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 32px;
	}

	.quick-link {
		display: flex;
		align-items: center;
		gap: 12px;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 16px 20px;
		text-decoration: none;
		transition: border-color 0.2s;
	}

	.quick-link:hover { border-color: var(--accent); }

	.ql-icon { font-size: 1.5rem; }

	.quick-link strong { display: block; color: var(--text-primary); font-size: 0.95rem; }
	.quick-link p { color: var(--text-muted); font-size: 0.8rem; margin: 0; }

	.section h3 { font-size: 1rem; font-weight: 700; margin-bottom: 16px; color: var(--text-secondary); }

	.orders-table { display: flex; flex-direction: column; gap: 8px; }

	.order-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr auto;
		gap: 16px;
		align-items: center;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 5px;
		padding: 12px 16px;
		font-size: 0.9rem;
	}

	.order-id { font-weight: 700; font-family: monospace; }
	.order-date { color: var(--text-muted); }
	.order-amount { font-weight: 600; }

	.order-status {
		padding: 3px 10px;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 700;
		text-align: center;
	}

	.status-paid { background: rgba(34,197,94,0.15); color: #4ade80; }
	.status-pending { background: rgba(234,179,8,0.15); color: #fbbf24; }
	.status-failed { background: rgba(239,68,68,0.15); color: #f87171; }
	.status-refunded { background: rgba(148,163,184,0.15); color: #94a3b8; }
</style>
