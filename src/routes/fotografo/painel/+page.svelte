<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types.js';

	interface Props { data: PageData; form: ActionData; }

	import type { ActionData } from './$types.js';
	let { data, form }: Props = $props();
	let deleteError = $state('');
	let confirmDeleteOrderId = $state<string | null>(null);

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
		draft: 'Rascunho',
		active: 'Ativo',
		archived: 'Arquivado'
	};

	const statusClass: Record<string, string> = {
		draft: 'status-draft',
		active: 'status-active',
		archived: 'status-archived'
	};
</script>

<svelte:head>
	<title>Painel do Fotógrafo — Move View Photos</title>
</svelte:head>

<div class="dashboard">
	<div class="page-header">
		<div>
			<h1>Dashboard</h1>
			<p>Gerencie seus eventos e acompanhe suas vendas</p>
		</div>
		<a href="/fotografo/painel/novo-evento" class="btn-primary">
			<Icon icon="lucide:plus" width="15" />
			Novo Evento
		</a>
	</div>

	<!-- Stats -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon-wrap">
				<Icon icon="lucide:calendar" width="16" />
			</div>
			<div class="stat-value">{data.stats.totalEvents}</div>
			<div class="stat-label">Total de eventos</div>
		</div>
		<div class="stat-card stat-accent">
			<div class="stat-icon-wrap stat-icon-accent">
				<Icon icon="lucide:circle-check" width="16" />
			</div>
			<div class="stat-value accent">{data.stats.activeEvents}</div>
			<div class="stat-label">Eventos ativos</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon-wrap">
				<Icon icon="lucide:image" width="16" />
			</div>
			<div class="stat-value">{data.stats.totalSales}</div>
			<div class="stat-label">Fotos vendidas</div>
		</div>
		<div class="stat-card stat-accent">
			<div class="stat-icon-wrap stat-icon-accent">
				<Icon icon="lucide:trending-up" width="16" />
			</div>
			<div class="stat-value accent">{formatPrice(data.stats.totalRevenueCents)}</div>
			<div class="stat-label">Receita total</div>
		</div>
	</div>

	<!-- Pedidos pendentes -->
	{#if data.pendingOrders.length > 0}
		<div class="pending-section">
			<div class="pending-header">
				<Icon icon="lucide:clock" width="15" />
				<h2>Pedidos Pendentes ({data.pendingOrders.length})</h2>
			</div>
			{#if form?.error}
				<div class="pending-error"><Icon icon="lucide:alert-circle" width="13" /> {form.error}</div>
			{/if}
			<div class="pending-list">
				{#each data.pendingOrders as order (order.id)}
					<div class="pending-row">
						<div class="pending-info">
							<span class="pending-id">#{order.id.slice(0, 8).toUpperCase()}</span>
							<span class="pending-name">{order.userName}</span>
							<span class="pending-email">{order.userEmail}</span>
							<span class="pending-price">{formatPrice(order.totalAmount)}</span>
							<span class="pending-date">{formatDate(order.createdAt)}</span>
						</div>
						<div class="pending-actions">
						<form method="POST" action="?/approveOrder" use:enhance>
							<input type="hidden" name="orderId" value={order.id} />
							<button type="submit" class="btn-approve">
								<Icon icon="lucide:check" width="13" /> Aprovar
							</button>
						</form>
						<button type="button" class="btn-delete-order" onclick={() => confirmDeleteOrderId = order.id}>
							<Icon icon="lucide:trash-2" width="13" />
						</button>
					</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Content layout: events + side panel -->
	<div class="content-layout">
		<!-- Events column -->
		<div class="events-col">
			<div class="section">
				<h2>Meus Eventos</h2>
				{#if deleteError}
					<div class="delete-error">
						<Icon icon="lucide:alert-circle" width="14" />
						{deleteError}
					</div>
				{/if}

				{#if data.events.length === 0}
					<div class="empty-state">
						<div class="empty-icon">
							<Icon icon="lucide:camera" width="36" />
						</div>
						<h3>Nenhum evento criado ainda</h3>
						<p>Crie seu primeiro evento e comece a fazer upload das suas fotos</p>
						<a href="/fotografo/painel/novo-evento" class="btn-primary">Criar Evento</a>
					</div>
				{:else}
					<div class="events-table">
						<div class="table-header">
							<span>Evento</span>
							<span>Data</span>
							<span>Fotos</span>
							<span>Status</span>
							<span>Ações</span>
						</div>
						{#each data.events as event (event.id)}
							<div class="table-row">
								<div class="event-info">
									<strong>{event.name}</strong>
									<span>{event.sport} · {event.city}</span>
								</div>
								<div class="event-date">{formatDate(event.eventDate)}</div>
								<div class="event-photos">{event.photoCount} foto{event.photoCount !== 1 ? 's' : ''}</div>
								<div>
									<span class="status-badge {statusClass[event.status]}">
										{statusLabel[event.status]}
									</span>
								</div>
								<div class="event-actions">
									<a href="/fotografo/painel/evento/{event.id}/editar" class="btn-sm btn-ghost">
										<Icon icon="lucide:pencil" width="12" />
										Editar
									</a>
									<a href="/fotografo/painel/evento/{event.id}/upload" class="btn-sm btn-upload">
										<Icon icon="lucide:upload" width="12" />
										Upload
									</a>
									<a href="/evento/{event.slug}" class="btn-sm btn-ghost" target="_blank" title="Ver público">
										<Icon icon="lucide:external-link" width="12" />
									</a>
									<form
										method="POST"
										action="?/setStatus"
										use:enhance={() => {
											deleteError = '';
											return async ({ result, update }) => {
												if (result.type === 'failure') deleteError = (result.data?.error as string) ?? 'Erro';
												else await update();
											};
										}}
									>
										<input type="hidden" name="eventId" value={event.id} />
										{#if event.status === 'active'}
											<input type="hidden" name="status" value="archived" />
											<button type="submit" class="btn-sm btn-ghost" title="Arquivar evento">
												<Icon icon="lucide:archive" width="12" />
											</button>
										{:else}
											<input type="hidden" name="status" value="active" />
											<button type="submit" class="btn-sm btn-publish" title="Publicar evento">
												<Icon icon="lucide:globe" width="12" />
											</button>
										{/if}
									</form>
									<form
										method="POST"
										action="?/deleteEvent"
										use:enhance={({ cancel }) => {
											if (!confirm(`Apagar "${event.name}"? Esta ação não pode ser desfeita.`)) {
												cancel();
												return;
											}
											deleteError = '';
											return async ({ result, update }) => {
												if (result.type === 'failure') {
													deleteError = (result.data?.error as string) ?? 'Erro ao apagar evento';
												} else {
													await update();
												}
											};
										}}
									>
										<input type="hidden" name="eventId" value={event.id} />
										<button type="submit" class="btn-sm btn-danger">
											<Icon icon="lucide:trash-2" width="12" />
										</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Side panel -->
		<aside class="side-panel">
			<div class="panel-card">
				<p class="panel-label">Ações Rápidas</p>
				<div class="quick-links">
					<a href="/fotografo/painel/novo-evento" class="quick-link">
						<Icon icon="lucide:plus-square" width="15" />
						Criar novo evento
					</a>
					<a href="/fotografo/painel/esportes" class="quick-link">
						<Icon icon="lucide:trophy" width="15" />
						Gerenciar esportes
					</a>
					<a href="/" target="_blank" class="quick-link">
						<Icon icon="lucide:globe" width="15" />
						Ver site público
					</a>
				</div>
			</div>

			<div class="panel-card">
				<p class="panel-label">Resumo</p>
				<div class="summary-rows">
					<div class="summary-row">
						<span>Total de eventos</span>
						<strong>{data.stats.totalEvents}</strong>
					</div>
					<div class="summary-row">
						<span>Eventos ativos</span>
						<strong class="accent">{data.stats.activeEvents}</strong>
					</div>
					<div class="summary-row">
						<span>Fotos vendidas</span>
						<strong>{data.stats.totalSales}</strong>
					</div>
					<div class="summary-row">
						<span>Receita total</span>
						<strong class="accent">{formatPrice(data.stats.totalRevenueCents)}</strong>
					</div>
				</div>
			</div>

			<div class="panel-card tips-card">
				<p class="panel-label">Dicas</p>
				<ul class="tips-list">
					<li>Ative seus eventos para que fiquem visíveis ao público</li>
					<li>Faça upload de fotos em alta resolução para melhores resultados</li>
					<li>Defina um preço de pacote para incentivar mais compras</li>
				</ul>
			</div>
		</aside>
	</div>
</div>

<!-- Modal confirmação de exclusão de pedido -->
{#if confirmDeleteOrderId}
	<div class="modal-backdrop" onclick={() => confirmDeleteOrderId = null}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-icon">
				<Icon icon="lucide:trash-2" width="24" />
			</div>
			<h3>Excluir pedido?</h3>
			<p>O pedido <strong>#{confirmDeleteOrderId.slice(0, 8).toUpperCase()}</strong> será excluído permanentemente. Esta ação não pode ser desfeita.</p>
			<div class="modal-actions">
				<button class="modal-btn-cancel" onclick={() => confirmDeleteOrderId = null}>Cancelar</button>
				<form method="POST" action="?/deleteOrder" use:enhance={() => {
					return async ({ update }) => {
						confirmDeleteOrderId = null;
						await update();
					};
				}}>
					<input type="hidden" name="orderId" value={confirmDeleteOrderId} />
					<button type="submit" class="modal-btn-confirm">
						<Icon icon="lucide:trash-2" width="14" /> Excluir
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	.dashboard { width: 100%; }

	/* 2-col content layout */
	.content-layout {
		display: grid;
		grid-template-columns: 1fr 260px;
		gap: 20px;
		align-items: start;
	}

	.events-col { min-width: 0; }

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
		gap: 0;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
		border-bottom: 1px solid var(--border-color);
		font-size: 0.82rem;
	}

	.summary-row:last-child { border-bottom: none; }
	.summary-row span { color: var(--text-muted); }
	.summary-row strong { color: var(--text-secondary); font-weight: 600; }
	.summary-row strong.accent { color: var(--accent); }

	.tips-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.tips-list li {
		font-size: 0.8rem;
		color: var(--text-muted);
		padding-left: 14px;
		position: relative;
		line-height: 1.55;
	}

	.tips-list li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--accent);
		opacity: 0.7;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 28px;
		flex-wrap: wrap;
		gap: 16px;
	}

	.page-header h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 4px; }
	.page-header p { color: var(--text-muted); margin: 0; font-size: 0.875rem; }

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		background: var(--accent);
		color: #050507;
		text-decoration: none;
		padding: 9px 18px;
		border-radius: var(--radius-sm);
		font-weight: 700;
		font-size: 0.875rem;
		transition: background var(--transition-fast), box-shadow var(--transition-fast);
		white-space: nowrap;
		border: none;
		cursor: pointer;
		font-family: var(--font-body);
	}

	.btn-primary:hover {
		background: var(--accent-hover);
		box-shadow: 0 0 20px var(--accent-glow);
	}

	/* Stats */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
		margin-bottom: 36px;
	}

	.stat-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 20px 20px 18px;
		transition: border-color var(--transition-fast);
	}

	.stat-card.stat-accent {
		border-color: rgba(61, 201, 13, 0.2);
		background: rgba(61, 201, 13, 0.03);
	}

	.stat-icon-wrap {
		width: 34px;
		height: 34px;
		border-radius: var(--radius-xs);
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		margin-bottom: 14px;
	}

	.stat-icon-wrap.stat-icon-accent {
		background: rgba(61, 201, 13, 0.1);
		border-color: rgba(61, 201, 13, 0.25);
		color: var(--accent);
	}

	.stat-value {
		font-size: 1.7rem;
		font-weight: 800;
		font-family: var(--font-display);
		color: var(--text-primary);
		margin-bottom: 4px;
		letter-spacing: -0.03em;
		line-height: 1;
	}

	.stat-value.accent { color: var(--accent); }
	.stat-label { font-size: 0.8rem; color: var(--text-muted); }

	/* Section */
	.section h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; color: var(--text-secondary); }

	.empty-state {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 56px;
		text-align: center;
	}

	.empty-icon {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-sm);
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16px;
		color: var(--text-muted);
	}

	.empty-state h3 { font-size: 1.05rem; margin-bottom: 8px; }
	.empty-state p { color: var(--text-muted); margin-bottom: 20px; font-size: 0.875rem; }

	/* Table */
	.events-table {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.table-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr auto;
		gap: 16px;
		padding: 11px 20px;
		background: rgba(255,255,255,0.025);
		border-bottom: 1px solid var(--border-color);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.table-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr auto;
		gap: 16px;
		padding: 14px 20px;
		border-bottom: 1px solid var(--border-color);
		align-items: center;
		transition: background var(--transition-fast);
	}

	.table-row:last-child { border-bottom: none; }
	.table-row:hover { background: rgba(255,255,255,0.02); }

	.event-info { display: flex; flex-direction: column; gap: 2px; }
	.event-info strong { font-size: 0.875rem; color: var(--text-primary); }
	.event-info span { font-size: 0.775rem; color: var(--text-muted); }

	.event-date { font-size: 0.82rem; color: var(--text-secondary); }
	.event-photos { font-size: 0.82rem; color: var(--text-secondary); }

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 3px 9px;
		border-radius: var(--radius-xs);
		font-size: 0.72rem;
		font-weight: 600;
	}

	.status-draft    { background: rgba(255,255,255,0.07); color: var(--text-secondary); }
	.status-active   { background: rgba(61,201,13,0.12);   color: var(--accent); }
	.status-archived { background: rgba(255,255,255,0.04); color: var(--text-muted); }

	.event-actions { display: flex; gap: 6px; align-items: center; }

	.btn-sm {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border-radius: var(--radius-xs);
		font-size: 0.775rem;
		font-weight: 600;
		text-decoration: none;
		transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
		white-space: nowrap;
		border: none;
		cursor: pointer;
		font-family: var(--font-body);
	}

	.btn-upload {
		background: var(--accent);
		color: #050507;
	}

	.btn-upload:hover {
		background: var(--accent-hover);
		box-shadow: 0 0 12px var(--accent-glow);
	}

	.btn-ghost {
		background: rgba(255,255,255,0.06);
		color: var(--text-secondary);
	}

	.btn-ghost:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }

	.btn-danger {
		background: rgba(239,68,68,0.12);
		color: #f87171;
		padding: 5px 8px;
	}

	.btn-danger:hover { background: rgba(239,68,68,0.25); }

	.btn-publish {
		background: rgba(61,201,13,0.1);
		color: var(--accent);
		padding: 5px 8px;
	}

	.btn-publish:hover { background: rgba(61,201,13,0.2); }

	.delete-error {
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(239,68,68,0.08);
		border: 1px solid rgba(239,68,68,0.25);
		color: #f87171;
		border-radius: var(--radius-xs);
		padding: 10px 14px;
		font-size: 0.85rem;
		margin-bottom: 14px;
	}

	@media (max-width: 1024px) {
		.content-layout {
			grid-template-columns: 1fr;
		}

		.side-panel {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 12px;
		}

		.tips-card { grid-column: 1 / -1; }
	}

	@media (max-width: 768px) {
		.table-header { display: none; }

		.table-row {
			grid-template-columns: 1fr;
			gap: 8px;
		}

		.side-panel { grid-template-columns: 1fr; }
	}

	/* Pedidos pendentes */
	.pending-section {
		background: rgba(251, 191, 36, 0.06);
		border: 1px solid rgba(251, 191, 36, 0.25);
		border-radius: var(--radius-md);
		padding: 16px 20px;
		margin-bottom: 24px;
	}

	.pending-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		color: #fbbf24;
	}

	.pending-header h2 {
		font-size: 0.9rem;
		font-weight: 700;
		margin: 0;
		color: #fbbf24;
	}

	.pending-error {
		background: rgba(239,68,68,0.1);
		border: 1px solid rgba(239,68,68,0.3);
		color: #f87171;
		padding: 7px 10px;
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
		margin-bottom: 10px;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.pending-list { display: flex; flex-direction: column; gap: 6px; }

	.pending-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 10px 14px;
		gap: 10px;
		flex-wrap: wrap;
	}

	.pending-info {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		font-size: 0.82rem;
	}

	.pending-id { font-family: monospace; color: var(--text-muted); font-size: 0.75rem; }
	.pending-name { font-weight: 600; color: var(--text-primary); }
	.pending-email { color: var(--text-muted); }
	.pending-price { color: var(--accent); font-weight: 700; }
	.pending-date { color: var(--text-muted); }

	.btn-approve {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: var(--accent);
		color: #050507;
		border: none;
		padding: 7px 14px;
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity 0.2s;
	}

	.btn-approve:hover { opacity: 0.85; }

	.pending-actions { display: flex; gap: 6px; align-items: center; }

	.btn-delete-order {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: 1px solid rgba(239,68,68,0.4);
		color: #f87171;
		padding: 7px 10px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-delete-order:hover {
		background: rgba(239,68,68,0.15);
		border-color: #f87171;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 24px;
	}

	.modal {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 32px 28px;
		max-width: 380px;
		width: 100%;
		text-align: center;
	}

	.modal-icon {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: rgba(239,68,68,0.12);
		border: 1px solid rgba(239,68,68,0.3);
		color: #f87171;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16px;
	}

	.modal h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 10px; }
	.modal p { font-size: 0.875rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 24px; }
	.modal p strong { color: var(--text-secondary); }

	.modal-actions { display: flex; gap: 10px; justify-content: center; }

	.modal-btn-cancel {
		padding: 9px 20px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-color);
		background: none;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.modal-btn-cancel:hover { background: var(--bg-elevated); }

	.modal-btn-confirm {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 9px 20px;
		border-radius: var(--radius-sm);
		border: none;
		background: #ef4444;
		color: white;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.modal-btn-confirm:hover { opacity: 0.85; }
</style>
