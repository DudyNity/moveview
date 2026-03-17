<script lang="ts">
	import type { PhotoPublic } from '$lib/types.js';
	import { cart, formatPrice } from '$lib/stores/cart.js';
	import PhotoLightbox from './PhotoLightbox.svelte';
	import Icon from '@iconify/svelte';

	interface Props {
		photos: PhotoPublic[];
		eventName: string;
	}

	let { photos, eventName }: Props = $props();

	let lightboxIndex = $state(-1);

	function openLightbox(index: number) {
		lightboxIndex = index;
	}

	function closeLightbox() {
		lightboxIndex = -1;
	}

	function toggleCart(e: MouseEvent, photo: PhotoPublic) {
		e.preventDefault();
		e.stopPropagation();
		if ($cart.some((i) => i.photoId === photo.id)) {
			cart.removeFromCart(photo.id);
		} else {
			cart.addToCart({
				photoId: photo.id,
				eventName,
				watermarkUrl: photo.watermarkUrl,
				price: photo.price
			});
		}
	}

	// IntersectionObserver for lazy loading
	function lazyLoad(node: HTMLImageElement, src: string) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					node.src = src;
					observer.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(node);
		return {
			destroy() { observer.disconnect(); }
		};
	}
</script>

{#if lightboxIndex >= 0}
	<PhotoLightbox
		{photos}
		bind:currentIndex={lightboxIndex}
		{eventName}
		onclose={closeLightbox}
	/>
{/if}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="photo-grid"
	oncontextmenu={(e) => e.preventDefault()}
	ondragstart={(e) => e.preventDefault()}
>
	{#each photos as photo, i (photo.id)}
		{@const inCart = $cart.some((c) => c.photoId === photo.id)}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="photo-item"
			class:is-in-cart={inCart}
			class:is-purchased={photo.isPurchased}
			onclick={() => openLightbox(i)}
		>
			<div class="photo-wrap" style="aspect-ratio: {photo.width}/{photo.height}">
				<img
					use:lazyLoad={photo.watermarkUrl}
					alt="Foto do evento"
					class="photo-img"
					loading="lazy"
					draggable="false"
				/>
				{#if !photo.isPurchased}
					<div class="wm-overlay" aria-hidden="true"></div>
				{/if}

				<!-- Always-visible status badge (top-right) -->
				{#if photo.isPurchased}
					<div class="badge badge-purchased">
						<Icon icon="lucide:check" width="11" /> Comprado
					</div>
				{:else if inCart}
					<div class="badge badge-in-cart">
						<Icon icon="lucide:check" width="11" /> No carrinho
					</div>
				{:else}
					<div class="badge badge-price">{formatPrice(photo.price)}</div>
				{/if}

				<!-- Hover overlay -->
				<div class="photo-overlay">
					{#if photo.isPurchased}
						<a
							href="/api/download/{photo.id}"
							class="overlay-btn btn-download"
							download
							onclick={(e) => e.stopPropagation()}
						>
							<Icon icon="lucide:download" width="15" />
							<span>Baixar HD</span>
						</a>
					{:else if inCart}
						<button
							onclick={(e) => toggleCart(e, photo)}
							class="overlay-btn btn-remove"
						>
							<Icon icon="lucide:x" width="15" />
							<span>Remover</span>
						</button>
					{:else}
						<button
							onclick={(e) => toggleCart(e, photo)}
							class="overlay-btn btn-add"
						>
							<Icon icon="lucide:shopping-cart" width="15" />
							<span>Adicionar — {formatPrice(photo.price)}</span>
						</button>
					{/if}
					<button
						class="overlay-expand"
						onclick={(e) => { e.stopPropagation(); openLightbox(i); }}
						aria-label="Ver em tela cheia"
					>
						<Icon icon="lucide:expand" width="14" />
					</button>
				</div>
			</div>
		</div>
	{/each}
</div>

{#if photos.length === 0}
	<div class="empty-state">
		<p>Nenhuma foto encontrada</p>
	</div>
{/if}

<style>
	.photo-grid {
		columns: 2;
		column-gap: 8px;
	}

	@media (min-width: 640px) { .photo-grid { columns: 3; } }
	@media (min-width: 1024px) { .photo-grid { columns: 4; } }

	.photo-item {
		break-inside: avoid;
		margin-bottom: 8px;
		cursor: pointer;
	}

	.photo-wrap {
		position: relative;
		overflow: hidden;
		border-radius: 5px;
		background: #111;
		/* transition for selection ring */
		outline: 2px solid transparent;
		outline-offset: -2px;
		transition: outline-color 0.2s;
	}

	/* Green ring when in cart */
	.is-in-cart .photo-wrap {
		outline-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent), 0 0 12px rgba(61,201,13,0.25);
	}

	/* Teal ring when purchased */
	.is-purchased .photo-wrap {
		outline-color: #22d3ee;
		box-shadow: 0 0 0 1px #22d3ee, 0 0 12px rgba(34,211,238,0.2);
	}

	.photo-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.35s ease;
		/* Impede arrastar a imagem diretamente */
		-webkit-user-drag: none;
		user-select: none;
	}

	.photo-item:hover .photo-img { transform: scale(1.04); }

	/* ── Persistent badge (always visible) ──────────────── */
	.badge {
		position: absolute;
		top: 7px;
		right: 7px;
		z-index: 4;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.2px;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		pointer-events: none;
		transition: opacity 0.2s;
	}

	.badge-price {
		background: rgba(0,0,0,0.55);
		color: rgba(255,255,255,0.85);
		border: 1px solid rgba(255,255,255,0.12);
	}

	/* Hide price badge on hover (overlay takes over) */
	.photo-item:hover .badge-price { opacity: 0; }

	.badge-in-cart {
		background: rgba(61,201,13,0.18);
		color: var(--accent);
		border: 1px solid rgba(61,201,13,0.4);
	}

	.badge-purchased {
		background: rgba(34,211,238,0.15);
		color: #22d3ee;
		border: 1px solid rgba(34,211,238,0.35);
	}

	/* ── Hover overlay ──────────────────────────────────── */
	.photo-overlay {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 10px;
		gap: 6px;
		background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 100%);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.photo-item:hover .photo-overlay { opacity: 1; }

	.overlay-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 12px;
		border-radius: 5px;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		border: none;
		font-family: inherit;
		transition: opacity 0.15s, transform 0.15s;
		white-space: nowrap;
		text-decoration: none;
	}

	.overlay-btn:hover { opacity: 0.88; transform: translateY(-1px); }

	.btn-add {
		background: var(--accent);
		color: #050507;
	}

	.btn-remove {
		background: rgba(255,255,255,0.1);
		border: 1px solid rgba(61,201,13,0.45);
		color: var(--accent);
	}

	.btn-download {
		background: #22d3ee;
		color: #050507;
	}

	/* Expand icon — small circle button, top-left on hover */
	.overlay-expand {
		position: absolute;
		top: 8px;
		left: 8px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(0,0,0,0.5);
		border: 1px solid rgba(255,255,255,0.15);
		color: rgba(255,255,255,0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.15s;
	}

	.overlay-expand:hover { background: rgba(0,0,0,0.75); }

	.empty-state {
		text-align: center;
		padding: 48px;
		color: var(--text-muted);
	}

	/* CSS watermark overlay — light diagonal tiles */
	.wm-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 2;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='110'%3E%3Ctext x='130' y='62' font-family='Arial,sans-serif' font-size='11' font-weight='700' fill='white' fill-opacity='0.16' text-anchor='middle' letter-spacing='4' transform='rotate(-30,130,55)'%3EMOVE VIEW PHOTOS%3C/text%3E%3C/svg%3E");
		background-repeat: repeat;
		background-size: 260px 110px;
	}
</style>
