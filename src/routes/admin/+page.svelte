<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types.js';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function formatPrice(cents: number) {
		return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	const statusLabel: Record<string, string> = {
		pending: 'Pendente',
		paid: 'Pago',
		failed: 'Falhou',
		refunded: 'Reembolsado',
		draft: 'Rascunho',
		active: 'Ativo',
		archived: 'Arquivado'
	};

	const statusClass: Record<string, string> = {
		pending: 'status-pending',
		paid: 'status-paid',
		failed: 'status-failed',
		refunded: 'status-refunded',
		draft: 'status-draft',
		active: 'status-active',
		archived: 'status-archived'
	};

	let activeTab = $state<'orders' | 'events'>('orders');
</script>

<svelte:head>
	<title>Admin — Move View Photos</title>
</svelte:head>

<div class="admin-page">
	<header class="admin-header">
		<div class="header-left">
			<a href="/" class="logo-link" aria-label="Move View Photos — Início">
				<img src="/logo/logo.png" alt="Move View Photos" class="logo-img" />
			</a>
			<span class="admin-badge">
				<Icon icon="lucide:shield" width="10" />
				Admin
			</span>
		</div>
		<div class="header-right">
			<a href="/" class="nav-link">
				<Icon icon="lucide:arrow-left" width="14" />
				Ver site
			</a>
		</div>
	</header>

	<div class="admin-body">
		<div class="page-title">
			<h1>Painel Administrativo</h1>
			<p>Visão geral da plataforma</p>
		</div>

		<!-- Stats grid -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon stat-icon-blue">
					<Icon icon="lucide:users" width="17" />
				</div>
				<div class="stat-value">{data.stats.totalUsers}</div>
				<div class="stat-label">Usuários</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon stat-icon-purple">
					<Icon icon="lucide:camera" width="17" />
				</div>
				<div class="stat-value">{data.stats.totalPhotographers}</div>
				<div class="stat-label">Fotógrafos</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon stat-icon-green">
					<Icon icon="lucide:calendar" width="17" />
				</div>
				<div class="stat-value">{data.stats.activeEvents}</div>
				<div class="stat-label">Eventos ativos</div>
				<div class="stat-sub">{data.stats.totalEvents} total</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon stat-icon-teal">
					<Icon icon="lucide:images" width="17" />
				</div>
				<div class="stat-value">{data.stats.totalPhotos.toLocaleString()}</div>
				<div class="stat-label">Fotos</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon stat-icon-amber">
					<Icon icon="lucide:shopping-bag" width="17" />
				</div>
				<div class="stat-value">{data.stats.totalOrders}</div>
				<div class="stat-label">Pedidos pagos</div>
			</div>

			<div class="stat-card highlight">
				<div class="stat-icon stat-icon-green">
					<Icon icon="lucide:trending-up" width="17" />
				</div>
				<div class="stat-value">{formatPrice(data.stats.totalRevenueCents)}</div>
				<div class="stat-label">Receita total</div>
			</div>
		</div>

		<!-- 2-col layout: table + side panel -->
		<div class="content-layout">
			<!-- Left: tabs + table -->
			<div class="content-main">
				<div class="tabs">
					<button
						onclick={() => (activeTab = 'orders')}
						class="tab"
						class:tab-active={activeTab === 'orders'}
					>
						<Icon icon="lucide:receipt" width="14" />
						Pedidos Recentes
					</button>
					<button
						onclick={() => (activeTab = 'events')}
						class="tab"
						class:tab-active={activeTab === 'events'}
					>
						<Icon icon="lucide:calendar" width="14" />
						Eventos Recentes
					</button>
				</div>

				<!-- Orders table -->
				{#if activeTab === 'orders'}
					<div class="data-table">
						{#if data.recentOrders.length === 0}
							<div class="table-empty">
								<Icon icon="lucide:inbox" width="28" />
								<p>Nenhum pedido encontrado</p>
							</div>
						{:else}
							<div class="table-header orders-grid">
								<span>Pedido</span>
								<span>Usuário</span>
								<span>Valor</span>
								<span>Status</span>
								<span>Data</span>
							</div>
							{#each data.recentOrders as order (order.id)}
								<div class="table-row orders-grid">
									<span class="mono text-sm">#{order.id.slice(0, 8)}</span>
									<div class="user-cell">
										<strong>{order.userName}</strong>
										<span>{order.userEmail}</span>
									</div>
									<span class="price-cell">{formatPrice(order.totalAmount)}</span>
									<span class="status-badge {statusClass[order.status]}">
										{statusLabel[order.status]}
									</span>
									<span class="date-cell">{formatDate(order.createdAt)}</span>
								</div>
							{/each}
						{/if}
					</div>
				{/if}

				<!-- Events table -->
				{#if activeTab === 'events'}
					<div class="data-table">
						{#if data.recentEvents.length === 0}
							<div class="table-empty">
								<Icon icon="lucide:calendar-x" width="28" />
								<p>Nenhum evento encontrado</p>
							</div>
						{:else}
							<div class="table-header events-grid">
								<span>Evento</span>
								<span>Fotógrafo</span>
								<span>Data</span>
								<span>Status</span>
								<span>Ações</span>
							</div>
							{#each data.recentEvents as event (event.id)}
								<div class="table-row events-grid">
									<div class="event-cell">
										<strong>{event.name}</strong>
										<span>{event.sport} · {event.city}</span>
									</div>
									<span class="photographer-cell">{event.photographerName ?? '—'}</span>
									<span class="date-cell">{formatDate(event.eventDate)}</span>
									<span class="status-badge {statusClass[event.status]}">
										{statusLabel[event.status]}
									</span>
									<div class="action-cell">
										<a href="/evento/{event.slug}" target="_blank" class="btn-sm">
											<Icon icon="lucide:external-link" width="12" />
											Ver
										</a>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>

			<!-- Right: side panel -->
			<aside class="side-panel">
				<div class="panel-card">
					<p class="panel-label">Acesso Rápido</p>
					<div class="quick-links">
						<a href="/fotografo/painel" class="quick-link">
							<Icon icon="lucide:camera" width="14" />
							Painel Fotógrafo
						</a>
						<a href="/" target="_blank" class="quick-link">
							<Icon icon="lucide:globe" width="14" />
							Ver site público
						</a>
					</div>
				</div>

				<div class="panel-card">
					<p class="panel-label">Plataforma</p>
					<div class="summary-rows">
						<div class="summary-row">
							<span>Fotógrafos</span>
							<strong>{data.stats.totalPhotographers}</strong>
						</div>
						<div class="summary-row">
							<span>Usuários</span>
							<strong>{data.stats.totalUsers}</strong>
						</div>
						<div class="summary-row">
							<span>Total de fotos</span>
							<strong>{data.stats.totalPhotos.toLocaleString()}</strong>
						</div>
						<div class="summary-row">
							<span>Eventos ativos</span>
							<strong class="accent">{data.stats.activeEvents}</strong>
						</div>
						<div class="summary-row">
							<span>Total de eventos</span>
							<strong>{data.stats.totalEvents}</strong>
						</div>
						<div class="summary-row">
							<span>Pedidos pagos</span>
							<strong>{data.stats.totalOrders}</strong>
						</div>
						<div class="summary-row">
							<span>Receita total</span>
							<strong class="accent">{formatPrice(data.stats.totalRevenueCents)}</strong>
						</div>
					</div>
				</div>
			</aside>
		</div>
	</div>
</div>

<style>
	.admin-page {
		min-height: 100vh;
		background: var(--bg-base);
		color: var(--text-primary);
	}

	.admin-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 32px;
		height: 60px;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-color);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-left { display: flex; align-items: center; gap: 12px; }

	.logo-link { display: flex; align-items: center; }
	.logo-img {
		height: 26px;
		width: auto;
		object-fit: contain;
	}

	.admin-badge {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		background: rgba(239,68,68,0.12);
		color: #f87171;
		padding: 3px 8px;
		border-radius: var(--radius-xs);
		border: 1px solid rgba(239,68,68,0.25);
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color var(--transition-fast);
	}

	.nav-link:hover { color: var(--text-secondary); }

	.admin-body {
		max-width: 1280px;
		margin: 0 auto;
		padding: 32px;
	}

	.page-title { margin-bottom: 24px; }
	.page-title h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 4px; }
	.page-title p { color: var(--text-muted); margin: 0; font-size: 0.875rem; }

	/* Stats */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 12px;
		margin-bottom: 32px;
	}

	.stat-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 18px 20px;
	}

	.stat-card.highlight {
		border-color: rgba(61, 201, 13, 0.25);
		background: rgba(61, 201, 13, 0.03);
	}

	.stat-icon {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
	}

	.stat-icon-blue   { background: rgba(59,130,246,0.12);  border: 1px solid rgba(59,130,246,0.25);  color: #60a5fa; }
	.stat-icon-purple { background: rgba(168,85,247,0.12);  border: 1px solid rgba(168,85,247,0.25);  color: #c084fc; }
	.stat-icon-green  { background: rgba(61,201,13,0.12);   border: 1px solid rgba(61,201,13,0.25);   color: var(--accent); }
	.stat-icon-teal   { background: rgba(20,184,166,0.12);  border: 1px solid rgba(20,184,166,0.25);  color: #2dd4bf; }
	.stat-icon-amber  { background: rgba(245,158,11,0.12);  border: 1px solid rgba(245,158,11,0.25);  color: #fbbf24; }

	.stat-value {
		font-size: 1.55rem;
		font-weight: 800;
		font-family: var(--font-display);
		margin-bottom: 4px;
		letter-spacing: -0.03em;
		line-height: 1;
	}

	.stat-label { font-size: 0.78rem; color: var(--text-muted); }
	.stat-sub { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }

	/* 2-col content layout */
	.content-layout {
		display: grid;
		grid-template-columns: 1fr 260px;
		gap: 20px;
		align-items: start;
	}

	.content-main { min-width: 0; }

	/* Side panel */
	.side-panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.panel-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 16px 18px;
	}

	.panel-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin-bottom: 12px;
	}

	.quick-links {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.quick-link {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 10px;
		border-radius: var(--radius-xs);
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.quick-link:hover {
		background: var(--bg-glass-hover);
		color: var(--text-primary);
	}

	.summary-rows {
		display: flex;
		flex-direction: column;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 7px 0;
		border-bottom: 1px solid var(--border-color);
		font-size: 0.82rem;
	}

	.summary-row:last-child { border-bottom: none; }
	.summary-row span { color: var(--text-muted); }
	.summary-row strong { color: var(--text-secondary); font-weight: 600; font-size: 0.82rem; }
	.summary-row strong.accent { color: var(--accent); }

	/* Tabs */
	.tabs {
		display: flex;
		gap: 2px;
		margin-bottom: 14px;
		border-bottom: 1px solid var(--border-color);
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 7px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 10px 14px;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		margin-bottom: -1px;
		transition: color var(--transition-fast), border-color var(--transition-fast);
		font-family: var(--font-body);
	}

	.tab:hover { color: var(--text-primary); }
	.tab-active { color: var(--accent); border-bottom-color: var(--accent); }

	/* Data table */
	.data-table {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.table-empty {
		padding: 48px;
		text-align: center;
		color: var(--text-muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.table-empty p { font-size: 0.875rem; margin: 0; }

	.table-header {
		padding: 11px 20px;
		background: rgba(255,255,255,0.025);
		border-bottom: 1px solid var(--border-color);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		display: grid;
		gap: 16px;
		align-items: center;
	}

	.table-row {
		padding: 13px 20px;
		border-bottom: 1px solid var(--border-color);
		display: grid;
		gap: 16px;
		align-items: center;
		transition: background var(--transition-fast);
	}

	.table-row:last-child { border-bottom: none; }
	.table-row:hover { background: rgba(255,255,255,0.018); }

	.orders-grid { grid-template-columns: 1fr 2fr 1fr 1fr 1fr; }
	.events-grid { grid-template-columns: 2fr 1fr 1fr 1fr 80px; }

	.mono { font-family: monospace; }
	.text-sm { font-size: 0.82rem; }

	.user-cell { display: flex; flex-direction: column; gap: 2px; }
	.user-cell strong { font-size: 0.875rem; }
	.user-cell span { font-size: 0.78rem; color: var(--text-muted); }

	.price-cell { font-weight: 700; color: var(--accent); font-size: 0.875rem; }

	.date-cell { font-size: 0.82rem; color: var(--text-secondary); }
	.photographer-cell { font-size: 0.82rem; color: var(--text-secondary); }

	.event-cell { display: flex; flex-direction: column; gap: 2px; }
	.event-cell strong { font-size: 0.875rem; }
	.event-cell span { font-size: 0.78rem; color: var(--text-muted); }

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 3px 9px;
		border-radius: var(--radius-xs);
		font-size: 0.72rem;
		font-weight: 600;
		width: fit-content;
	}

	.status-paid, .status-active     { background: rgba(61,201,13,0.12);   color: var(--accent); }
	.status-pending, .status-draft   { background: rgba(234,179,8,0.12);   color: #facc15; }
	.status-failed, .status-refunded { background: rgba(239,68,68,0.12);   color: #f87171; }
	.status-archived                 { background: rgba(255,255,255,0.05); color: var(--text-muted); }

	.action-cell { display: flex; gap: 6px; }

	.btn-sm {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: var(--radius-xs);
		font-size: 0.775rem;
		font-weight: 600;
		text-decoration: none;
		background: rgba(255,255,255,0.06);
		color: var(--text-secondary);
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.btn-sm:hover { background: rgba(255,255,255,0.11); color: var(--text-primary); }

	@media (max-width: 1100px) {
		.content-layout { grid-template-columns: 1fr; }
	}

	@media (max-width: 768px) {
		.admin-body { padding: 20px; }
		.orders-grid, .events-grid { grid-template-columns: 1fr; }
		.table-header { display: none; }
	}
</style>
