<script lang="ts">
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import { cart, formatPrice } from '$lib/stores/cart.js';
	import type { PageData } from './$types.js';
	import Icon from '@iconify/svelte';
	import { PUBLIC_APP_URL, PUBLIC_APP_NAME } from '$env/dynamic/public';

	interface Props { data: PageData; }
	let { data }: Props = $props();

	let allPhotos = $state(data.photos);
	let hasMore = $state(data.hasMore);
	let loadingMore = $state(false);

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;
		try {
			const res = await fetch(`/api/event/${data.event.slug}/photos?offset=${allPhotos.length}`);
			if (res.ok) {
				const json = await res.json();
				allPhotos = [...allPhotos, ...json.photos];
				hasMore = json.hasMore;
			}
		} finally {
			loadingMore = false;
		}
	}

	function setupSentinel(node: HTMLDivElement) {
		const observer = new IntersectionObserver(
			(entries) => { if (entries[0].isIntersecting) loadMore(); },
			{ rootMargin: '300px' }
		);
		observer.observe(node);
		return { destroy() { observer.disconnect(); } };
	}

	function addPackageToCart() {
		allPhotos.forEach((photo) => {
			if (!photo.isPurchased && !$cart.some((i) => i.photoId === photo.id)) {
				cart.addToCart({
					photoId: photo.id,
					eventName: data.event.name,
					watermarkUrl: photo.watermarkUrl,
					price: photo.price
				});
			}
		});
	}

	function parseLocalDate(date: Date | string): Date {
		const str = typeof date === 'string' ? date : date.toISOString();
		return new Date(str.slice(0, 10) + 'T00:00:00');
	}

	function formatDate(date: Date | string) {
		return parseLocalDate(date).toLocaleDateString('pt-BR', {
			weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
		});
	}

	const isFutureEvent = $derived(data.event.isFuture ?? false);

	// Pricing comparison — use event-level photoPrice
	const photoPrice = $derived(data.event.photoPrice ?? 2900);
	const packagePrice = $derived(data.event.packagePrice);
	const totalIndividual = $derived(data.totalPhotos * photoPrice);
	const savings = $derived(packagePrice ? Math.round((1 - packagePrice / totalIndividual) * 100) : 0);
</script>

<svelte:head>
	<title>{data.event.name} — {PUBLIC_APP_NAME}</title>
	<meta name="description" content="{data.event.sport} em {data.event.city} · {data.totalPhotos} foto{data.totalPhotos !== 1 ? 's' : ''} disponíveis" />
	<meta property="og:title" content="{data.event.name} — {PUBLIC_APP_NAME}" />
	<meta property="og:description" content="{data.event.sport} em {data.event.city} · {data.totalPhotos} foto{data.totalPhotos !== 1 ? 's' : ''} disponíveis" />
	<meta property="og:type" content="website" />
	{#if data.event.coverUrl}
		<meta property="og:image" content={data.event.coverUrl.startsWith('/') ? `${PUBLIC_APP_URL}${data.event.coverUrl}` : data.event.coverUrl} />
		<meta name="twitter:card" content="summary_large_image" />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	<meta property="og:url" content="{PUBLIC_APP_URL}/evento/{data.event.slug}" />
</svelte:head>

<!-- Event Header -->
<div class="event-hero" class:has-cover={!!data.event.coverUrl}>
	{#if data.event.coverUrl}
		<div class="hero-cover-bg" style="background-image: url({data.event.coverUrl})"></div>
	{/if}
	<div class="hero-orb orb-1"></div>
	<div class="hero-orb orb-2"></div>
	<div class="hero-dots"></div>
	<div class="event-hero-overlay">
		<div class="event-hero-content">
			<a href="/" class="back-link">
				<Icon icon="lucide:arrow-left" width="14" /> Voltar
			</a>

			<div class="hero-body">
				<div class="hero-left">
					{#if isFutureEvent}
						<div class="upcoming-badge">
							<Icon icon="lucide:calendar-clock" width="12" /> Em breve
						</div>
					{/if}

					<h1 class="hero-title">{data.event.name}</h1>

					{#if data.event.description}
						<p class="event-desc">{data.event.description}</p>
					{/if}

					<div class="event-tags">
						<span class="tag tag-sport">
							<Icon icon="lucide:trophy" width="13" /> {data.event.sport}
						</span>
						<span class="tag tag-location">
							<Icon icon="lucide:map-pin" width="13" /> {data.event.location}, {data.event.city}
						</span>
						<span class="tag tag-date">
							<Icon icon="lucide:calendar" width="13" /> {formatDate(data.event.eventDate)}
						</span>
					</div>
				</div>

				{#if !isFutureEvent}
					<div class="hero-stat-card">
						<div class="stat-number">{data.totalPhotos}</div>
						<div class="stat-label">fotos disponíveis</div>
						{#if data.event.packagePrice}
							<div class="stat-divider"></div>
							<div class="stat-pkg">
								<span class="stat-pkg-label">pacote completo</span>
								<span class="stat-pkg-price">{formatPrice(data.event.packagePrice)}</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

{#if isFutureEvent}
	<!-- Evento ainda não realizado -->
	<div class="upcoming-notice">
		<div class="upcoming-inner">
			<div class="upcoming-icon">
				<Icon icon="lucide:calendar-clock" width="32" />
			</div>
			<div class="upcoming-text">
				<h2>Fotografias não disponíveis</h2>
				<p>
					Este evento está agendado para <strong>{formatDate(data.event.eventDate)}</strong>
					e ainda não foi realizado. As fotografias serão disponibilizadas após a conclusão do evento.
				</p>
				<p class="upcoming-sub">
					Volte a esta página após a data do evento para visualizar e adquirir as suas fotografias.
				</p>
			</div>
		</div>
	</div>
{:else}
	<!-- Toolbar -->
	<div class="toolbar">
		<div class="toolbar-inner">
			<div class="toolbar-left">
				<span class="photo-count">{data.totalPhotos} foto{data.totalPhotos !== 1 ? 's' : ''}</span>
			</div>

			{#if packagePrice}
				<button onclick={addPackageToCart} class="pkg-btn">
					<Icon icon="lucide:package" width="16" /> Pacote completo — {formatPrice(packagePrice)}
				</button>
			{/if}
		</div>
	</div>

	<!-- Pricing Comparison Banner -->
	{#if packagePrice && data.totalPhotos > 1}
		<div class="pricing-banner">
			<div class="pricing-inner">
				<div class="pricing-option individual">
					<div class="pricing-icon"><Icon icon="lucide:image" width="18" /></div>
					<div class="pricing-info">
						<span class="pricing-label">Foto individual</span>
						<span class="pricing-value">{formatPrice(photoPrice)}<span class="pricing-unit"> / foto</span></span>
						<span class="pricing-sub">Escolha as fotos que quiser</span>
					</div>
					<div class="pricing-action">
						<span class="tag-individual">Clique nas fotos abaixo</span>
					</div>
				</div>

				<div class="pricing-divider">
					<span>ou</span>
				</div>

				<div class="pricing-option package">
					<div class="pricing-icon accent"><Icon icon="lucide:package" width="18" /></div>
					<div class="pricing-info">
						<span class="pricing-label">Pacote completo</span>
						<span class="pricing-value accent">{formatPrice(packagePrice)}<span class="pricing-unit"> tudo</span></span>
						<span class="pricing-sub">
							{data.totalPhotos} fotos em alta resolução
							{#if savings > 0}· <strong class="savings">economize {savings}%</strong>{/if}
						</span>
					</div>
					<div class="pricing-action">
						<button onclick={addPackageToCart} class="btn-package">
							<Icon icon="lucide:shopping-cart" width="14" /> Adicionar pacote
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Photo Grid -->
	<div class="grid-container">
		<PhotoGrid photos={allPhotos} eventName={data.event.name} />

		<!-- Infinite scroll sentinel -->
		{#if hasMore}
			<div use:setupSentinel class="sentinel">
				{#if loadingMore}
					<div class="loading-more">
						<span class="spinner"></span> Carregando mais fotos…
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* ── Event Hero ──────────────────────────────────────── */
	.event-hero {
		min-height: 360px;
		background: #050507;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.hero-cover-bg {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		filter: blur(2px) brightness(0.25) saturate(0.6);
		transform: scale(1.05);
	}

	/* Decorative orbs */
	.hero-orb {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		filter: blur(80px);
		opacity: 0.18;
	}

	.orb-1 {
		width: 480px;
		height: 480px;
		background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
		top: -160px;
		right: -100px;
	}

	.orb-2 {
		width: 320px;
		height: 320px;
		background: radial-gradient(circle, #1e7b0c 0%, transparent 70%);
		bottom: -80px;
		left: 10%;
		opacity: 0.12;
	}

	/* Dot grid */
	.hero-dots {
		position: absolute;
		inset: 0;
		background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
		background-size: 28px 28px;
		-webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
		mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
	}

	.event-hero-overlay {
		position: relative;
		z-index: 2;
		flex: 1;
		display: flex;
		align-items: flex-end;
		padding: 28px 32px 36px;
	}

	.event-hero-content {
		max-width: 1280px;
		width: 100%;
		margin: 0 auto;
	}

	.back-link {
		color: rgba(255,255,255,0.45);
		text-decoration: none;
		font-size: 0.82rem;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 28px;
		transition: color 0.2s;
		letter-spacing: 0.2px;
	}
	.back-link:hover { color: rgba(255,255,255,0.85); }

	.hero-body {
		display: flex;
		align-items: flex-end;
		gap: 32px;
	}

	.hero-left { flex: 1; min-width: 0; }

	.hero-title {
		font-size: clamp(2rem, 5vw, 3.2rem);
		font-weight: 900;
		font-family: 'Space Grotesk', sans-serif;
		color: #fff;
		line-height: 1.1;
		margin-bottom: 14px;
		letter-spacing: -0.5px;
		text-shadow: 0 2px 24px rgba(0,0,0,0.5);
	}

	.event-desc {
		color: rgba(255,255,255,0.55);
		font-size: 0.9rem;
		max-width: 560px;
		margin-bottom: 16px;
		line-height: 1.6;
	}

	.event-tags {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 12px;
		border-radius: var(--radius-xs);
		font-size: 0.8rem;
		font-weight: 500;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.07);
		color: rgba(255,255,255,0.75);
		white-space: nowrap;
	}

	.tag-sport {
		background: rgba(61,201,13,0.12);
		border-color: rgba(61,201,13,0.25);
		color: var(--accent);
	}

	/* Stat card */
	.hero-stat-card {
		flex-shrink: 0;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: var(--radius-md);
		padding: 20px 28px;
		text-align: center;
		min-width: 160px;
	}

	.stat-number {
		font-size: 2.8rem;
		font-weight: 900;
		font-family: 'Space Grotesk', sans-serif;
		color: var(--accent);
		line-height: 1;
		letter-spacing: -1px;
	}

	.stat-label {
		font-size: 0.75rem;
		color: rgba(255,255,255,0.45);
		text-transform: uppercase;
		letter-spacing: 0.8px;
		margin-top: 4px;
	}

	.stat-divider {
		height: 1px;
		background: rgba(255,255,255,0.1);
		margin: 14px 0;
	}

	.stat-pkg {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat-pkg-label {
		font-size: 0.7rem;
		color: rgba(255,255,255,0.35);
		text-transform: uppercase;
		letter-spacing: 0.6px;
	}

	.stat-pkg-price {
		font-size: 1.1rem;
		font-weight: 800;
		font-family: 'Space Grotesk', sans-serif;
		color: rgba(255,255,255,0.85);
	}

	.upcoming-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: rgba(255, 193, 7, 0.12);
		border: 1px solid rgba(255, 193, 7, 0.35);
		color: #ffc107;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.5px;
		padding: 4px 10px;
		border-radius: var(--radius-xs);
		margin-bottom: 12px;
		text-transform: uppercase;
	}

	/* ── Upcoming notice ─────────────────────────────────── */
	.upcoming-notice {
		max-width: 1280px;
		margin: 48px auto;
		padding: 0 24px;
	}

	.upcoming-inner {
		display: flex;
		gap: 24px;
		align-items: flex-start;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-left: 3px solid var(--accent);
		border-radius: var(--radius-md);
		padding: 28px 32px;
	}

	.upcoming-icon {
		color: var(--accent);
		flex-shrink: 0;
		margin-top: 2px;
	}

	.upcoming-text h2 {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 8px;
		font-family: 'Space Grotesk', sans-serif;
	}

	.upcoming-text p {
		font-size: 0.92rem;
		color: var(--text-secondary);
		line-height: 1.65;
		margin: 0 0 6px;
	}

	.upcoming-text p strong {
		color: var(--text-primary);
		font-weight: 600;
	}

	.upcoming-sub {
		color: var(--text-muted) !important;
		font-size: 0.84rem !important;
	}

	/* ── Toolbar ─────────────────────────────────────────── */
	.toolbar {
		background: rgba(20,20,20,0.95);
		border-bottom: 1px solid var(--border-color);
		position: sticky;
		top: 64px;
		z-index: 50;
		padding: 12px 24px;
	}

	.toolbar-inner {
		max-width: 1280px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.toolbar-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

	.photo-count { color: var(--text-muted); font-size: 0.9rem; }

	.pkg-btn {
		background: var(--accent);
		color: #050507;
		border: none;
		border-radius: 4px;
		padding: 10px 20px;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.2s;
		font-size: 0.9rem;
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.pkg-btn:hover { opacity: 0.85; }

	.grid-container {
		max-width: 1280px;
		margin: 0 auto;
		padding: 24px;
	}

	/* ── Pricing banner ──────────────────────────────────── */
	.pricing-banner {
		background: var(--bg-card);
		border-top: 1px solid var(--border-color);
		border-bottom: 1px solid var(--border-color);
		padding: 20px 24px;
	}

	.pricing-inner {
		max-width: 1280px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: 0;
	}

	.pricing-option {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 8px 12px;
	}

	.pricing-option.package {
		background: rgba(61,201,13,0.04);
		border: 1px solid rgba(61,201,13,0.15);
		border-radius: var(--radius-sm);
		padding: 12px 16px;
	}

	.pricing-icon {
		color: var(--text-muted);
		flex-shrink: 0;
	}
	.pricing-icon.accent { color: var(--accent); }

	.pricing-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.pricing-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: 600;
	}

	.pricing-value {
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
		font-family: 'Space Grotesk', sans-serif;
	}
	.pricing-value.accent { color: var(--accent); }

	.pricing-unit {
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--text-muted);
	}

	.pricing-sub {
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.savings { color: var(--accent); font-weight: 700; }

	.tag-individual {
		font-size: 0.75rem;
		color: var(--text-muted);
		border: 1px dashed var(--border-color);
		padding: 4px 10px;
		border-radius: var(--radius-xs);
		white-space: nowrap;
	}

	.btn-package {
		background: var(--accent);
		color: #050507;
		border: none;
		border-radius: var(--radius-xs);
		padding: 9px 16px;
		font-weight: 700;
		font-size: 0.82rem;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
		transition: opacity 0.2s;
		font-family: inherit;
	}
	.btn-package:hover { opacity: 0.85; }

	.pricing-divider {
		padding: 0 20px;
		color: var(--text-muted);
		font-size: 0.8rem;
		flex-shrink: 0;
	}

	/* ── Infinite scroll ─────────────────────────────────── */
	.sentinel { height: 1px; }

	.loading-more {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 32px;
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-color);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	@media (max-width: 720px) {
		.hero-body { flex-direction: column; align-items: flex-start; gap: 20px; }
		.hero-stat-card { width: 100%; }
		.event-hero-overlay { padding: 20px 20px 28px; }
	}

	@media (max-width: 640px) {
		.pricing-inner { flex-direction: column; align-items: stretch; gap: 8px; }
		.pricing-divider { text-align: center; padding: 4px 0; }
	}
</style>
