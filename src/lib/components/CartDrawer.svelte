<script lang="ts">
	import { cart, cartTotal, formatPrice } from '$lib/stores/cart.js';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let loading = $state(false);
	let error = $state('');

	async function handleCheckout() {
		if ($cart.length === 0) return;
		loading = true;
		error = '';

		try {
			const res = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cartItems: $cart.map((i) => i.photoId) })
			});

			if (res.status === 401) {
				onclose();
				goto('/login?next=/');
				return;
			}

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				error = data.error || 'Erro ao processar checkout';
				return;
			}

			const { url } = await res.json();
			if (url) {
				cart.clearCart();
				window.location.href = url;
			}
		} catch {
			error = 'Erro de conexão. Tente novamente.';
		} finally {
			loading = false;
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="overlay fade-in" onclick={onclose}></div>

	<div class="drawer" role="dialog" aria-label="Carrinho de compras" aria-modal="true">
		<div class="drawer-header">
			<div class="drawer-title">
				<Icon icon="lucide:shopping-bag" width="18" />
				<h2>Carrinho</h2>
				{#if $cart.length > 0}
					<span class="item-count">{$cart.length}</span>
				{/if}
			</div>
			<button onclick={onclose} class="close-btn" aria-label="Fechar carrinho">
				<Icon icon="lucide:x" width="18" />
			</button>
		</div>

		<div class="drawer-body">
			{#if $cart.length === 0}
				<div class="empty-state">
					<div class="empty-icon-wrap">
						<Icon icon="lucide:shopping-bag" width="28" />
					</div>
					<h3>Carrinho vazio</h3>
					<p>Adicione fotos ao carrinho para começar</p>
				</div>
			{:else}
				<ul class="cart-list">
					{#each $cart as item (item.photoId)}
						<li class="cart-item">
							<div class="item-thumb-wrap">
								<img src={item.watermarkUrl} alt={item.eventName} class="item-thumb" />
							</div>
							<div class="item-info">
								<span class="item-event">{item.eventName}</span>
								<span class="item-price">{formatPrice(item.price)}</span>
							</div>
							<button
								onclick={() => cart.removeFromCart(item.photoId)}
								class="remove-btn"
								aria-label="Remover do carrinho"
							>
								<Icon icon="lucide:x" width="14" />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		{#if $cart.length > 0}
			<div class="drawer-footer">
				{#if error}
					<div class="error-msg">
						<Icon icon="lucide:alert-circle" width="14" />
						{error}
					</div>
				{/if}

				<div class="total-row">
					<span>Total</span>
					<strong>{formatPrice($cartTotal)}</strong>
				</div>

				<button onclick={handleCheckout} disabled={loading} class="checkout-btn">
					{#if loading}
						<div class="btn-spinner"></div>
						Processando...
					{:else}
						<Icon icon="lucide:lock" width="16" />
						Finalizar Compra
					{/if}
				</button>

				<p class="secure-note">
					<Icon icon="lucide:shield-check" width="12" />
					Pagamento seguro via Stripe
				</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 200;
	}

	.drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 400px;
		max-width: 100vw;
		background: var(--bg-card);
		border-left: 1px solid rgba(255, 255, 255, 0.06);
		z-index: 201;
		display: flex;
		flex-direction: column;
		animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		box-shadow: -32px 0 80px rgba(0, 0, 0, 0.6);
	}

	@keyframes slideInRight {
		from { transform: translateX(100%); opacity: 0.3; }
		to   { transform: translateX(0);    opacity: 1; }
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color);
		flex-shrink: 0;
	}

	.drawer-title {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--text-secondary);
	}

	.drawer-title h2 {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		font-family: var(--font-display);
	}

	.item-count {
		background: var(--accent);
		color: white;
		font-size: 0.68rem;
		font-weight: 800;
		min-width: 20px;
		height: 20px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 5px;
	}

	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		width: 34px;
		height: 34px;
		border-radius: var(--radius-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.close-btn:hover {
		color: var(--text-primary);
		background: var(--bg-glass-hover);
	}

	.drawer-body {
		flex: 1;
		overflow-y: auto;
		padding: 20px 24px;
	}

	.empty-state {
		text-align: center;
		padding: 60px 20px;
	}

	.empty-icon-wrap {
		width: 60px;
		height: 60px;
		border-radius: var(--radius-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16px;
		color: var(--text-muted);
	}

	.empty-state h3 {
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 6px;
		color: var(--text-secondary);
	}

	.empty-state p { font-size: 0.83rem; color: var(--text-muted); }

	.cart-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }

	.cart-item {
		display: flex;
		align-items: center;
		gap: 12px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 12px;
		transition: border-color 0.18s;
	}

	.cart-item:hover { border-color: var(--border-bright); }

	.item-thumb-wrap {
		width: 56px;
		height: 56px;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--bg-elevated);
	}

	.item-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }

	.item-info { flex: 1; min-width: 0; }

	.item-event {
		display: block;
		font-size: 0.78rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 3px;
	}

	.item-price {
		display: block;
		font-size: 0.95rem;
		font-weight: 800;
		color: var(--text-primary);
		font-family: var(--font-display);
		letter-spacing: -0.02em;
	}

	.remove-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		width: 28px;
		height: 28px;
		border-radius: var(--radius-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.remove-btn:hover {
		color: #f87171;
		background: rgba(248, 113, 113, 0.1);
	}

	.drawer-footer {
		padding: 20px 24px;
		border-top: 1px solid var(--border-color);
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.error-msg {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #f87171;
		font-size: 0.82rem;
		padding: 10px 12px;
		background: rgba(248, 113, 113, 0.08);
		border: 1px solid rgba(248, 113, 113, 0.2);
		border-radius: var(--radius-xs);
	}

	.total-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.total-row span { font-size: 0.875rem; color: var(--text-secondary); }

	.total-row strong {
		font-size: 1.5rem;
		font-weight: 900;
		color: var(--text-primary);
		font-family: var(--font-display);
		letter-spacing: -0.03em;
	}

	.checkout-btn {
		width: 100%;
		background: var(--accent);
		color: #050507;
		border: none;
		border-radius: 8px;
		padding: 14px 20px;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.18s, box-shadow 0.18s, transform 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-family: var(--font-body);
		letter-spacing: -0.01em;
	}

	.checkout-btn:hover:not(:disabled) {
		background: var(--accent-hover);
		box-shadow: 0 0 28px var(--accent-glow);
		transform: translateY(-1px);
	}

	.checkout-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.checkout-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn-spinner {
		width: 15px;
		height: 15px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	.secure-note {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		font-size: 0.72rem;
		color: var(--text-muted);
		margin: 0;
	}
</style>
