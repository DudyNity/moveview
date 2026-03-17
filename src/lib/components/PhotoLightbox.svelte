<script lang="ts">
	import type { PhotoPublic } from '$lib/types.js';
	import { cart, formatPrice } from '$lib/stores/cart.js';

	interface Props {
		photos: PhotoPublic[];
		currentIndex: number;
		eventName: string;
		onclose: () => void;
	}

	let { photos, currentIndex = $bindable(), eventName, onclose }: Props = $props();

	function prev() {
		if (currentIndex > 0) currentIndex--;
	}

	function next() {
		if (currentIndex < photos.length - 1) currentIndex++;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'ArrowLeft') prev();
		if (e.key === 'ArrowRight') next();
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	const currentPhoto = $derived(photos[currentIndex]);

	function toggleCart() {
		if (!currentPhoto) return;
		if ($cart.some((i) => i.photoId === currentPhoto.id)) {
			cart.removeFromCart(currentPhoto.id);
		} else {
			cart.addToCart({
				photoId: currentPhoto.id,
				eventName,
				watermarkUrl: currentPhoto.watermarkUrl,
				price: currentPhoto.price
			});
		}
	}

	const inCart = $derived(currentPhoto ? $cart.some((i) => i.photoId === currentPhoto.id) : false);
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lightbox-backdrop" onclick={handleBackdrop}>

	<button class="close-btn" onclick={onclose} aria-label="Fechar">
		<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M18 6 6 18M6 6l12 12"/>
		</svg>
	</button>

	{#if currentPhoto}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="img-wrap"
		oncontextmenu={(e) => e.preventDefault()}
		ondragstart={(e) => e.preventDefault()}
	>
			<img
				src={currentPhoto.watermarkUrl}
				alt="Foto {currentIndex + 1}"
				class="lightbox-img"
				draggable="false"
			/>

			{#if !currentPhoto.isPurchased}
				<div class="wm-overlay" aria-hidden="true"></div>
			{/if}

			<!-- Nav arrows overlaid on image sides -->
			<button
				class="nav-btn nav-prev"
				onclick={prev}
				disabled={currentIndex === 0}
				aria-label="Anterior"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="m15 18-6-6 6-6"/>
				</svg>
			</button>

			<button
				class="nav-btn nav-next"
				onclick={next}
				disabled={currentIndex === photos.length - 1}
				aria-label="Próxima"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="m9 18 6-6-6-6"/>
				</svg>
			</button>

			<!-- Bottom gradient: counter + action button -->
			<div class="img-footer">
				<span class="photo-counter">{currentIndex + 1} / {photos.length}</span>

				{#if currentPhoto.bibNumbers?.length}
					<span class="bib-info">Dorsal {currentPhoto.bibNumbers.join(', ')}</span>
				{/if}

				{#if currentPhoto.isPurchased}
					<a
						href="/api/download/{currentPhoto.id}"
						class="btn-action"
						download
						onclick={(e) => e.stopPropagation()}
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
						Baixar Original
					</a>
				{:else}
					<button
						onclick={(e) => { e.stopPropagation(); toggleCart(); }}
						class="btn-action"
						class:in-cart={inCart}
					>
						{#if inCart}
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
							No Carrinho · {formatPrice(currentPhoto.price)}
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
							Comprar · {formatPrice(currentPhoto.price)}
						{/if}
					</button>
				{/if}
			</div>
		</div>
	{/if}

</div>

<style>
	.lightbox-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.92);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn {
		position: absolute;
		top: 16px;
		right: 16px;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: rgba(255,255,255,0.75);
		transition: background 0.2s, color 0.2s;
		z-index: 10;
	}

	.close-btn:hover {
		background: rgba(255,255,255,0.16);
		color: white;
	}

	/* Image wrapper — all controls overlay on top */
	.img-wrap {
		position: relative;
		display: inline-flex;
		border-radius: 10px;
		overflow: hidden;
	}

	.lightbox-img {
		max-width: 90vw;
		max-height: 88vh;
		object-fit: contain;
		display: block;
		-webkit-user-drag: none;
		user-select: none;
	}

	/* CSS watermark: light diagonal tiles */
	.wm-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='120'%3E%3Ctext x='150' y='68' font-family='Arial,sans-serif' font-size='13' font-weight='700' fill='white' fill-opacity='0.18' text-anchor='middle' letter-spacing='4' transform='rotate(-30,150,60)'%3EMOVE VIEW PHOTOS%3C/text%3E%3C/svg%3E");
		background-repeat: repeat;
		background-size: 300px 120px;
	}

	/* Nav arrows — overlaid on left/right edges of image */
	.nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(0,0,0,0.30);
		border: none;
		width: 44px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: rgba(255,255,255,0.80);
		transition: background 0.18s, color 0.18s;
		z-index: 3;
	}

	.nav-prev { left: 0; border-radius: 0 6px 6px 0; }
	.nav-next { right: 0; border-radius: 6px 0 0 6px; }

	.nav-btn:hover:not(:disabled) {
		background: rgba(0,0,0,0.55);
		color: white;
	}

	.nav-btn:disabled { opacity: 0.2; cursor: not-allowed; }

	/* Bottom gradient bar — overlaid on image */
	.img-footer {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 28px 16px 14px;
		background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%);
		display: flex;
		align-items: center;
		gap: 10px;
		z-index: 3;
	}

	.photo-counter {
		color: rgba(255,255,255,0.60);
		font-size: 0.78rem;
		font-weight: 500;
		flex: 1;
	}

	.bib-info {
		color: var(--accent);
		font-size: 0.78rem;
		font-weight: 600;
	}

	.btn-action {
		padding: 7px 16px;
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
		font-weight: 700;
		cursor: pointer;
		border: none;
		background: var(--accent);
		color: #050507;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		transition: opacity 0.2s;
		white-space: nowrap;
	}

	.btn-action.in-cart {
		background: rgba(255,255,255,0.12);
		color: rgba(255,255,255,0.85);
		border: 1px solid rgba(255,255,255,0.20);
	}

	.btn-action:hover { opacity: 0.88; }
</style>
