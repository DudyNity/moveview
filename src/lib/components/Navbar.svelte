<script lang="ts">
	import { page } from '$app/stores';
	import { cartCount } from '$lib/stores/cart.js';
	import CartDrawer from './CartDrawer.svelte';
	import type { UserPublic } from '$lib/types.js';
	import Icon from '@iconify/svelte';
	import { scale } from 'svelte/transition';

	interface Props {
		user?: UserPublic | null;
	}

	let { user = null }: Props = $props();

	let cartOpen = $state(false);
	let scrolled = $state(false);
	let userMenuOpen = $state(false);

	function handleScroll() {
		scrolled = window.scrollY > 20;
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/';
	}
</script>

<svelte:window onscroll={handleScroll} />

<CartDrawer open={cartOpen} onclose={() => (cartOpen = false)} />

<header class="navbar" class:scrolled>
	<div class="nav-inner">
		<!-- Logo -->
		<a href="/" class="logo" aria-label="Move View Photos — Início">
			<img src="/logo/logo.png" alt="Move View Photos" class="logo-img" />
		</a>

		<!-- Links -->
		<nav class="nav-links">
			<a href="/" class:active={$page.url.pathname === '/'}>Eventos</a>
		</nav>

		<!-- Actions -->
		<div class="nav-actions">
			<!-- Cart -->
			<button onclick={() => (cartOpen = true)} class="icon-btn cart-btn" aria-label="Carrinho">
				<Icon icon="lucide:shopping-bag" width="20" />
				{#if $cartCount > 0}
					<span class="cart-badge">{$cartCount}</span>
				{/if}
			</button>

			{#if user}
				<div class="user-menu-wrap">
					<button
						onclick={() => (userMenuOpen = !userMenuOpen)}
						class="user-btn"
						aria-label="Menu do usuário"
						aria-expanded={userMenuOpen}
					>
						<div class="avatar">
							{user.name.charAt(0).toUpperCase()}
						</div>
					</button>

					{#if userMenuOpen}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="backdrop" onclick={() => (userMenuOpen = false)}></div>
						<div
							class="user-dropdown"
							transition:scale={{ duration: 160, start: 0.92, opacity: 0 }}
						>
							<div class="user-info">
								<strong>{user.name}</strong>
								<span>{user.email}</span>
							</div>
							<a href="/minhas-fotos" onclick={() => (userMenuOpen = false)}>
								<Icon icon="lucide:image" width="14" />
								Minhas Fotos
							</a>
							<a href="/pedidos" onclick={() => (userMenuOpen = false)}>
								<Icon icon="lucide:receipt" width="14" />
								Meus Pedidos
							</a>
							<a href="/conta" onclick={() => (userMenuOpen = false)}>
								<Icon icon="lucide:user" width="14" />
								Minha Conta
							</a>
							{#if user.role === 'photographer' || user.role === 'admin'}
								<div class="dropdown-divider"></div>
								<a href="/fotografo/painel" class="role-link photographer-link" onclick={() => (userMenuOpen = false)}>
									<Icon icon="lucide:camera" width="14" />
									Painel do Fotógrafo
								</a>
							{/if}
							{#if user.role === 'admin'}
								<a href="/admin" class="role-link admin-link" onclick={() => (userMenuOpen = false)}>
									<Icon icon="lucide:settings-2" width="14" />
									Administração
								</a>
							{/if}
							<div class="dropdown-divider"></div>
							<button onclick={logout} class="logout-btn">
								<Icon icon="lucide:log-out" width="14" />
								Sair
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<a href="/login" class="btn-ghost">Entrar</a>
				<a href="/cadastro" class="btn-accent">Criar conta</a>
			{/if}
		</div>
	</div>
</header>

<style>
	.navbar {
		position: sticky;
		top: 0;
		z-index: 100;
		height: var(--nav-height);
		transition:
			background 0.22s ease,
			border-color 0.22s ease,
			box-shadow 0.22s ease;
		border-bottom: 1px solid transparent;
	}

	.navbar.scrolled {
		background: rgba(5, 5, 7, 0.88);
		border-bottom-color: rgba(255, 255, 255, 0.06);
		backdrop-filter: blur(28px) saturate(1.6);
		-webkit-backdrop-filter: blur(28px) saturate(1.6);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04), 0 4px 24px rgba(0, 0, 0, 0.3);
	}

	.nav-inner {
		max-width: 1320px;
		margin: 0 auto;
		padding: 0 28px;
		height: 100%;
		display: flex;
		align-items: center;
		gap: 24px;
	}

	/* Logo */
	.logo { display: flex; align-items: center; flex-shrink: 0; }
	.logo-img {
		height: 42px;
		max-width: 160px;
		width: auto;
		object-fit: contain;
		display: block;
	}

	/* Nav links */
	.nav-links {
		display: flex;
		gap: 4px;
		flex: 1;
		padding-left: 8px;
	}

	.nav-links a {
		position: relative;
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 500;
		padding: 6px 12px;
		border-radius: var(--radius-xs);
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.nav-links a::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 12px;
		right: 12px;
		height: 2px;
		background: var(--accent);
		border-radius: 2px;
		transform: scaleX(0);
		transition: transform var(--transition-smooth);
	}

	.nav-links a:hover { color: var(--text-primary); }
	.nav-links a.active { color: var(--text-primary); }
	.nav-links a.active::after { transform: scaleX(1); }

	/* Actions */
	.nav-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

	/* Icon button */
	.icon-btn {
		position: relative;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-secondary);
		width: 38px;
		height: 38px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.icon-btn:hover {
		color: var(--text-primary);
		background: var(--bg-glass-hover);
	}

	.cart-badge {
		position: absolute;
		top: 3px;
		right: 3px;
		background: var(--accent);
		color: white;
		font-size: 0.6rem;
		font-weight: 800;
		min-width: 16px;
		height: 16px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
		border: 1.5px solid var(--bg-base);
		animation: pulseGlow 2s ease-in-out infinite;
	}

	/* User menu */
	.user-menu-wrap { position: relative; }

	.user-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 2px;
		border-radius: 50%;
		transition: box-shadow var(--transition-fast);
	}

	.user-btn:hover { box-shadow: 0 0 0 2px var(--border-bright); }

	.avatar {
		width: 34px;
		height: 34px;
		border-radius: var(--radius-xs);
		background: linear-gradient(135deg, var(--accent), #2EA808);
		color: #050507;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.85rem;
		font-family: var(--font-display);
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
	}

	.user-dropdown {
		position: absolute;
		top: calc(100% + 10px);
		right: 0;
		transform-origin: top right;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 6px;
		min-width: 210px;
		display: flex;
		flex-direction: column;
		gap: 1px;
		box-shadow: var(--shadow-card), 0 0 0 0.5px rgba(255,255,255,0.05) inset;
		z-index: 11;
	}

	.user-info {
		padding: 10px 12px 12px;
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 4px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.user-info strong { color: var(--text-primary); font-size: 0.875rem; font-weight: 600; }
	.user-info span { color: var(--text-muted); font-size: 0.78rem; }

	.user-dropdown a,
	.logout-btn {
		padding: 8px 12px;
		border-radius: var(--radius-xs);
		color: var(--text-secondary);
		font-size: 0.875rem;
		transition: background var(--transition-fast), color var(--transition-fast);
		display: flex;
		align-items: center;
		gap: 9px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		width: 100%;
		font-family: var(--font-body);
	}

	.user-dropdown a:hover,
	.logout-btn:hover {
		background: var(--bg-glass-hover);
		color: var(--text-primary);
	}

	.role-link.photographer-link { color: var(--accent); }
	.role-link.admin-link { color: #a78bfa; }
	.logout-btn { color: #f87171; }

	.dropdown-divider {
		height: 1px;
		background: var(--border-color);
		margin: 4px 6px;
	}

	/* Auth buttons */
	.btn-ghost {
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		padding: 7px 14px;
		border-radius: 6px;
		transition: color 0.18s, background 0.18s;
	}

	.btn-ghost:hover {
		color: var(--text-primary);
		background: var(--bg-glass-hover);
	}

	.btn-accent {
		background: var(--accent);
		color: #050507;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 7px 16px;
		border-radius: 6px;
		transition: background 0.18s, box-shadow 0.18s, transform 0.15s;
	}

	.btn-accent:hover {
		background: var(--accent-hover);
		box-shadow: 0 0 20px var(--accent-glow);
		transform: translateY(-1px);
	}

	.btn-accent:active {
		transform: translateY(0);
	}

	/* ── Mobile ──────────────────────────────────────────────── */
	@media (max-width: 640px) {
		.nav-inner {
			padding: 0 16px;
			gap: 8px;
		}

		.logo-img {
			height: 34px;
			max-width: 120px;
		}

		/* Esconde "Eventos" no menu — pouco espaço */
		.nav-links {
			display: none;
		}

		/* Esconde "Entrar" — mantém só "Criar conta" */
		.btn-ghost {
			display: none;
		}

		.btn-accent {
			font-size: 0.8rem;
			padding: 6px 12px;
		}
	}

	@media (max-width: 400px) {
		.logo-img {
			height: 28px;
			max-width: 100px;
		}
	}
</style>
