<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import type { LayoutData } from './$types.js';

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	const navItems = [
		{ href: '/fotografo/painel',              label: 'Dashboard',   icon: 'lucide:layout-dashboard' },
		{ href: '/fotografo/painel/novo-evento',  label: 'Novo Evento', icon: 'lucide:plus-square' },
		{ href: '/fotografo/painel/esportes',     label: 'Esportes',    icon: 'lucide:trophy' }
	];
</script>

<div class="painel-layout">
	<aside class="sidebar">
		<div class="sidebar-logo">
			<a href="/" class="logo-link" aria-label="Move View Photos — Início">
				<img src="/logo/logo.png" alt="Move View Photos" class="logo-img" />
			</a>
			<span class="role-badge">
				<Icon icon="lucide:camera" width="10" />
				Fotógrafo
			</span>
		</div>

		<nav class="sidebar-nav">
			{#each navItems as item}
				<a
					href={item.href}
					class="nav-item"
					class:active={$page.url.pathname === item.href}
				>
					<span class="nav-icon">
						<Icon icon={item.icon} width="15" />
					</span>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<div class="user-info">
				<div class="avatar">{data.user.name.charAt(0).toUpperCase()}</div>
				<div class="user-details">
					<strong>{data.user.name}</strong>
					<span>{data.user.email}</span>
				</div>
			</div>
			<a href="/" class="back-link">
				<Icon icon="lucide:arrow-left" width="13" />
				Ver site
			</a>
		</div>
	</aside>

	<main class="painel-main">
		{@render children()}
	</main>
</div>

<style>
	.painel-layout {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 232px;
		flex-shrink: 0;
		background: var(--bg-card);
		border-right: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		padding: 20px 12px;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
	}

	.sidebar-logo {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 28px;
		padding: 0 8px;
	}

	.logo-link { display: flex; align-items: center; }
	.logo-img {
		height: 28px;
		width: auto;
		object-fit: contain;
	}

	.role-badge {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.62rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		background: rgba(61, 201, 13, 0.12);
		color: var(--accent);
		padding: 3px 7px;
		border-radius: var(--radius-xs);
		border: 1px solid rgba(61, 201, 13, 0.25);
		white-space: nowrap;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 12px;
		border-radius: var(--radius-xs);
		text-decoration: none;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
		border-left: 2px solid transparent;
	}

	.nav-item:hover {
		background: var(--bg-glass-hover);
		color: var(--text-primary);
	}

	.nav-item.active {
		background: rgba(61, 201, 13, 0.08);
		color: var(--accent);
		border-left-color: var(--accent);
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		flex-shrink: 0;
	}

	.sidebar-footer {
		border-top: 1px solid var(--border-color);
		padding-top: 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 8px;
	}

	.avatar {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-xs);
		background: linear-gradient(135deg, var(--accent), #2EA808);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.8rem;
		flex-shrink: 0;
		font-family: var(--font-display);
	}

	.user-details { display: flex; flex-direction: column; overflow: hidden; }
	.user-details strong {
		font-size: 0.82rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.user-details span {
		font-size: 0.72rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 8px 12px;
		border-radius: var(--radius-xs);
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.82rem;
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.back-link:hover {
		color: var(--text-secondary);
		background: var(--bg-glass-hover);
	}

	.painel-main {
		flex: 1;
		padding: 32px;
		overflow-x: hidden;
	}

	@media (max-width: 768px) {
		.painel-layout { flex-direction: column; }

		.sidebar {
			width: 100%;
			height: auto;
			position: static;
			padding: 14px 12px;
		}

		.sidebar-nav { flex-direction: row; overflow-x: auto; }

		.painel-main { padding: 20px; }
	}
</style>
