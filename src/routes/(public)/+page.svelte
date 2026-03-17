<script lang="ts">
	import { onMount } from 'svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types.js';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { sport: initialSport } = data;
	let activeSport = $state(initialSport || '');
	const eventCount = $derived(data.events.length);
	let hintVisible = $state(true);
	function handleScroll() { hintVisible = window.scrollY < 80; }

	// Pega até 3 eventos com foto de capa para as ps-back cards
	const heroPhotos = $derived(
		data.events.filter((e) => e.coverUrl).slice(0, 3)
	);

	// Todas as fotos com marca d'água de todos os eventos — para o slideshow central
	const allPreviews = $derived(
		data.events.flatMap((e) => e.previewPhotos ?? [])
	);
	let slideIndex = $state(0);

	onMount(() => {
		if (allPreviews.length <= 1) return;
		const id = setInterval(() => {
			slideIndex = (slideIndex + 1) % allPreviews.length;
		}, 2800);
		return () => clearInterval(id);
	});

	const filtered = $derived(
		activeSport
			? data.events.filter((e) => e.sport.toLowerCase() === activeSport.toLowerCase())
			: data.events
	);
</script>

<svelte:window onscroll={handleScroll} />

{#if hintVisible}
<a href="#eventos" class="scroll-hint" aria-label="Ver eventos disponíveis">
	<span class="scroll-label">Ver eventos</span>
	<div class="scroll-arrow">
		<Icon icon="lucide:chevron-down" width="18" />
	</div>
</a>
{/if}

<svelte:head>
	<title>Move View Photos — Fotografia Esportiva</title>
	<meta name="description" content="Encontre e compre suas fotos em corridas, triathlons, ciclismo e muito mais." />
</svelte:head>

<!-- ─── Hero ──────────────────────────────────────────────────── -->
<section class="hero">
	<div class="orb orb-1" aria-hidden="true"></div>
	<div class="orb orb-2" aria-hidden="true"></div>
	<div class="hero-grid" aria-hidden="true"></div>

	<div class="hero-body">
	<div class="hero-inner">

		<!-- Left: editorial content -->
		<div class="hero-content">
			<div class="hero-badge fade-up">
				<span class="badge-dot"></span>
				Fotografia Esportiva Profissional
			</div>

			<h1 class="hero-title fade-up" style="animation-delay:0.06s">
				Seus<br>
				<em class="title-accent">melhores</em><br>
				momentos.
			</h1>

			<p class="hero-sub fade-up" style="animation-delay:0.1s">
				Encontre suas fotos em corridas, triathlons,<br>
				ciclismo e muito mais. HD. Download imediato.
			</p>

			<div class="hero-search fade-up" style="animation-delay:0.14s">
				<SearchBar />
			</div>

			<div class="hero-stats fade-up" style="animation-delay:0.18s">
				<div class="stat-item">
					<strong>{eventCount}</strong>
					<span>eventos ativos</span>
				</div>
				<div class="stat-div" aria-hidden="true"></div>
				<div class="stat-item">
					<strong>HD</strong>
					<span>resolução máxima</span>
				</div>
				<div class="stat-div" aria-hidden="true"></div>
				<div class="stat-item">
					<strong>ZIP</strong>
					<span>pacote completo</span>
				</div>
			</div>
		</div>

		<!-- Right: event photo stack -->
		<div class="hero-visual fade-in" style="animation-delay:0.12s" aria-hidden="true">
			<div class="photo-stack">
				<!-- Back card -->
				<div class="ps-card ps-back-2">
					{#if heroPhotos[1]?.coverUrl}
						<img src={heroPhotos[1].coverUrl} alt="" class="ps-img" />
						<div class="ps-overlay"></div>
					{:else}
						<div class="ps-bg bg-cycling"></div>
					{/if}
				</div>
				<!-- Middle card -->
				<div class="ps-card ps-back-1">
					{#if heroPhotos[0]?.coverUrl}
						<img src={heroPhotos[0].coverUrl} alt="" class="ps-img" />
						<div class="ps-overlay"></div>
					{:else}
						<div class="ps-bg bg-triathlon"></div>
					{/if}
				</div>
				<!-- Front card: slideshow de fotos com marca d'água -->
				<div class="ps-card ps-front">
					{#if allPreviews.length > 0}
						{#each allPreviews as src, i}
							<img
								{src}
								alt=""
								class="ps-img ps-slide"
								class:active={i === slideIndex}
								loading="lazy"
							/>
						{/each}
					{:else}
						<div class="ps-bg bg-running"></div>
					{/if}
					<div class="ps-overlay"></div>
					<div class="ps-scan"></div>
					<div class="vf-corner vf-tl"></div>
					<div class="vf-corner vf-tr"></div>
					<div class="vf-corner vf-bl"></div>
					<div class="vf-corner vf-br"></div>
					<div class="vf-cross">
						<div class="vf-h"></div>
						<div class="vf-v"></div>
						<div class="vf-dot"></div>
					</div>
					<div class="cam-hud cam-top">
						<span>1/2000s</span>
						<span>f/2.8</span>
						<span>ISO 400</span>
					</div>
					<div class="cam-hud cam-bottom">
						<span class="rec-badge"><span class="rec-dot"></span>WM</span>
						<span class="ps-tag-front">{allPreviews.length > 0 ? '● ● ●' : 'Corrida'}</span>
					</div>
				</div>
			</div>
		</div>

	</div>
	</div>

</section>

<!-- ─── Ticker ────────────────────────────────────────────────── -->
{#if data.sports.length > 0}
<div class="ticker-wrap" aria-hidden="true">
	{#if data.sports.length <= 6}
		<!-- Poucos esportes: exibe centralizado sem scroll -->
		<div class="ticker-static">
			{#each data.sports as sport, i}
				<span class="t-item" class:t-accent={i % 3 === 2}>{sport}</span>
				{#if i < data.sports.length - 1}<span class="t-sep">×</span>{/if}
			{/each}
		</div>
	{:else}
		<div class="ticker-fade ticker-fade-l"></div>
		<div class="ticker-track">
			{#each Array(2) as _}
				{#each data.sports as sport, i}
					<span class="t-item" class:t-accent={i % 3 === 2}>{sport}</span>
					<span class="t-sep">×</span>
				{/each}
			{/each}
		</div>
		<div class="ticker-fade ticker-fade-r"></div>
	{/if}
</div>
{/if}

<!-- ─── Events ────────────────────────────────────────────────── -->
<section class="events-section" id="eventos">
	<div class="container">
		<div class="section-header">
			<div>
				<span class="s-label">Eventos</span>
				<h2 class="s-title">Galeria de eventos</h2>
			</div>

			{#if data.sports.length > 0}
				<div class="sport-filters">
					<button onclick={() => (activeSport = '')} class="filter-chip" class:active={!activeSport}>
						Todos
					</button>
					{#each data.sports as sport}
						<button
							onclick={() => (activeSport = activeSport === sport ? '' : sport)}
							class="filter-chip"
							class:active={activeSport === sport}
						>
							{sport}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		{#if filtered.length === 0}
			<div class="empty-state">
				<div class="empty-icon-wrap">
					<Icon icon="lucide:search-x" width="32" />
				</div>
				<h3>Nenhum evento encontrado</h3>
				<p>
					{data.query
						? `Não encontramos eventos para "${data.query}"`
						: 'Não há eventos disponíveis no momento.'}
				</p>
			</div>
		{:else}
			<div class="events-grid">
				{#each filtered as event (event.id)}
					<EventCard {event} />
				{/each}
			</div>
		{/if}
	</div>
</section>

<!-- ─── How It Works ──────────────────────────────────────────── -->
<section class="how-section">
	<div class="container">
		<div class="how-header">
			<span class="s-label">Como funciona</span>
			<h2>Em 3 passos simples</h2>
		</div>

		<div class="steps-row">
			<div class="step">
				<div class="step-num">01</div>
				<div class="step-icon-wrap">
					<Icon icon="lucide:search" width="20" />
				</div>
				<h3>Encontre seu evento</h3>
				<p>Busque pelo nome do evento, esporte ou cidade. Acesso instantâneo a todos os eventos da plataforma.</p>
			</div>

			<div class="step-arrow" aria-hidden="true">
				<Icon icon="lucide:move-right" width="18" />
			</div>

			<div class="step">
				<div class="step-num">02</div>
				<div class="step-icon-wrap">
					<Icon icon="lucide:camera" width="20" />
				</div>
				<h3>Veja suas fotos</h3>
				<p>Navegue pelas fotos com preview gratuito. Watermark removida automaticamente após a compra.</p>
			</div>

			<div class="step-arrow" aria-hidden="true">
				<Icon icon="lucide:move-right" width="18" />
			</div>

			<div class="step">
				<div class="step-num">03</div>
				<div class="step-icon-wrap">
					<Icon icon="lucide:download" width="20" />
				</div>
				<h3>Baixe em HD</h3>
				<p>Adquira as fotos que mais gostou em resolução máxima. Download em ZIP ou individual.</p>
			</div>
		</div>
	</div>
</section>

<style>
/* ─── Layout ─────────────────────────────────────── */
.container { max-width: 1320px; margin: 0 auto; }

/* ─── Hero ───────────────────────────────────────── */
.hero {
	position: relative;
	min-height: calc(88vh - var(--nav-height));
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80px 28px 60px;
	overflow: hidden;
}

.hero-body {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
}

/* Ambient orbs */
.orb {
	position: absolute;
	border-radius: 50%;
	pointer-events: none;
	filter: blur(80px);
}

.orb-1 {
	width: 700px; height: 700px;
	background: radial-gradient(circle, rgba(61,201,13,0.14) 0%, transparent 70%);
	top: -200px; right: 10%;
	animation: floatOrb 9s ease-in-out infinite;
}

.orb-2 {
	width: 350px; height: 350px;
	background: radial-gradient(circle, rgba(20,160,80,0.08) 0%, transparent 70%);
	bottom: 40px; left: 5%;
	animation: floatOrb 13s ease-in-out infinite reverse;
}

/* Dot grid */
.hero-grid {
	position: absolute;
	inset: 0;
	background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
	background-size: 40px 40px;
	mask-image: radial-gradient(ellipse 90% 70% at 50% 50%, black 20%, transparent 80%);
	pointer-events: none;
}

/* 2-column grid */
.hero-body { max-width: 1200px; }

.hero-inner {
	position: relative;
	z-index: 1;
	width: 100%;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 64px;
	align-items: center;
}

/* Left column */
.hero-content {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	padding-left: 28px;
	border-left: 3px solid var(--accent);
}

/* Badge */
.hero-badge {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-size: 0.72rem;
	font-weight: 600;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--text-muted);
	margin-bottom: 24px;
	padding: 5px 12px;
	border: 1px solid var(--border-color);
	border-radius: var(--radius-sm);
	background: var(--bg-glass);
	backdrop-filter: blur(12px);
}

.badge-dot {
	width: 6px; height: 6px;
	border-radius: 50%;
	background: var(--accent);
	animation: pulseGlow 2s ease-in-out infinite;
	flex-shrink: 0;
}

/* Title */
.hero-title {
	font-size: clamp(3.8rem, 7.5vw, 7rem);
	font-weight: 900;
	line-height: 0.9;
	letter-spacing: -0.055em;
	margin-bottom: 28px;
	font-family: var(--font-display);
}

.title-accent {
	font-style: italic;
	color: var(--accent);
	display: block;
}

/* Subtitle */
.hero-sub {
	font-size: 1rem;
	color: var(--text-secondary);
	line-height: 1.7;
	margin-bottom: 32px;
}

/* Search */
.hero-search { width: 100%; margin-bottom: 28px; }

/* Stats bar */
.hero-stats {
	display: inline-flex;
	align-items: center;
	background: var(--bg-glass);
	border: 1px solid var(--border-color);
	border-radius: var(--radius-sm);
	padding: 3px;
	backdrop-filter: blur(12px);
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1px;
	padding: 8px 22px;
}

.stat-item strong {
	font-size: 1.05rem;
	font-weight: 800;
	color: var(--text-primary);
	font-family: var(--font-display);
	letter-spacing: -0.02em;
}

.stat-item span {
	font-size: 0.65rem;
	color: var(--text-muted);
	white-space: nowrap;
}

.stat-div {
	width: 1px; height: 26px;
	background: var(--border-color);
	flex-shrink: 0;
}

/* Scroll hint */
@keyframes bounceDown {
	0%, 100% { transform: translateY(0); }
	50%       { transform: translateY(6px); }
}

.scroll-hint {
	position: fixed;
	bottom: 36px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 50;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	text-decoration: none;
	cursor: pointer;
}

.scroll-label {
	font-size: 0.65rem;
	font-weight: 700;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--text-secondary);
	transition: color var(--transition-fast);
}

.scroll-hint:hover .scroll-label { color: var(--accent); }

.scroll-arrow {
	width: 38px; height: 38px;
	border-radius: var(--radius-sm);
	border: 1px solid var(--border-accent);
	background: var(--accent-subtle);
	backdrop-filter: blur(12px);
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--accent);
	animation: bounceDown 1.8s ease-in-out infinite;
	transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
	box-shadow: 0 0 18px var(--accent-glow);
}

.scroll-hint:hover .scroll-arrow {
	background: var(--accent);
	color: #050507;
	box-shadow: 0 0 28px var(--accent-glow);
}

/* ─── Photo Stack ────────────────────────────────── */
.hero-visual {
	display: flex;
	justify-content: center;
	align-items: center;
}

.photo-stack {
	position: relative;
	width: 420px;
	height: 310px;
}

.ps-card {
	position: absolute;
	width: 370px;
	height: 278px;
	border-radius: var(--radius-md);
	overflow: hidden;
	border: 1.5px solid rgba(255,255,255,0.1);
	box-shadow: 0 24px 60px rgba(0,0,0,0.55);
}

.ps-back-2 {
	transform: rotate(-7deg) translate(-18px, 22px);
	opacity: 0.45;
	z-index: 1;
}

.ps-back-1 {
	transform: rotate(-3deg) translate(-6px, 8px);
	opacity: 0.7;
	z-index: 2;
}

.ps-front {
	transform: rotate(1.5deg);
	z-index: 3;
	top: 0;
	left: 22px;
	border-color: rgba(255,255,255,0.2);
}

/* Real photo image */
.ps-img {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

/* Slideshow crossfade */
.ps-slide {
	opacity: 0;
	transition: opacity 0.9s ease;
	position: absolute;
	inset: 0;
}
.ps-slide.active {
	opacity: 1;
}

/* Dark overlay so HUD text stays readable over real photos */
.ps-overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(
		to bottom,
		rgba(0,0,0,0.25) 0%,
		rgba(0,0,0,0.1) 50%,
		rgba(0,0,0,0.55) 100%
	);
	z-index: 1;
}

/* Ensure HUD elements sit above the overlay */
.ps-scan,
.vf-corner,
.vf-cross,
.cam-hud,
.ps-tag,
.ps-tag-front { z-index: 5; }

/* Photo backgrounds (fallback) */
.ps-bg {
	position: absolute;
	inset: 0;
}

.bg-running {
	background:
		linear-gradient(160deg, #0d1f3c 0%, #1a3a5c 38%, #0f2845 65%, #0a1a2e 100%);
}

.bg-running::before {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(45deg, transparent 38%, rgba(61,201,13,0.07) 55%, transparent 75%);
}

.bg-triathlon {
	background: linear-gradient(160deg, #16082a 0%, #31155c 38%, #200e42 65%, #110623 100%);
}

.bg-cycling {
	background: linear-gradient(160deg, #091509 0%, #123a1a 38%, #0a280d 65%, #050b05 100%);
}

/* Scanline sweep */
.ps-scan {
	position: absolute;
	left: 0; right: 0;
	height: 80px;
	background: linear-gradient(to bottom, transparent, rgba(61,201,13,0.05), transparent);
	animation: scanline 3.5s linear infinite;
	pointer-events: none;
	z-index: 10;
}

@keyframes scanline {
	0%   { top: -80px; }
	100% { top: 100%; }
}

/* Viewfinder corners */
.vf-corner {
	position: absolute;
	width: 18px; height: 18px;
	z-index: 5;
}

.vf-tl { top: 12px;    left: 12px;  border-top:    2px solid var(--accent); border-left:  2px solid var(--accent); }
.vf-tr { top: 12px;    right: 12px; border-top:    2px solid var(--accent); border-right: 2px solid var(--accent); }
.vf-bl { bottom: 36px; left: 12px;  border-bottom: 2px solid var(--accent); border-left:  2px solid var(--accent); }
.vf-br { bottom: 36px; right: 12px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }

/* Crosshair */
.vf-cross {
	position: absolute;
	width: 52px; height: 52px;
	top: 50%; left: 50%;
	transform: translate(-50%, -62%);
	z-index: 5;
}

.vf-h, .vf-v { position: absolute; background: rgba(61,201,13,0.35); }
.vf-h { width: 100%; height: 1px; top: 50%; }
.vf-v { height: 100%; width: 1px; left: 50%; top: 0; }

.vf-dot {
	position: absolute;
	width: 5px; height: 5px;
	border-radius: 50%;
	background: var(--accent);
	top: 50%; left: 50%;
	transform: translate(-50%, -50%);
	animation: pulseGlow 1.5s ease-in-out infinite;
}

/* Camera HUD */
.cam-hud {
	position: absolute;
	left: 12px; right: 12px;
	display: flex;
	gap: 10px;
	font-family: 'Courier New', monospace;
	font-size: 0.62rem;
	color: rgba(255,255,255,0.45);
	z-index: 5;
}

.cam-top  { top: 10px; }
.cam-bottom { bottom: 8px; justify-content: space-between; align-items: center; }

.rec-badge {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	color: var(--accent);
}

.rec-dot {
	width: 5px; height: 5px;
	border-radius: 50%;
	background: var(--accent);
	animation: pulseGlow 1s ease-in-out infinite;
}

.ps-tag {
	position: absolute;
	bottom: 8px; right: 10px;
	font-size: 0.58rem;
	color: rgba(255,255,255,0.28);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	z-index: 5;
}

.ps-tag-front {
	font-size: 0.62rem;
	color: rgba(255,255,255,0.4);
	text-transform: uppercase;
	letter-spacing: 0.1em;
}

/* ─── Ticker ─────────────────────────────────────── */
@keyframes tickerScroll {
	0%   { transform: translateX(0); }
	100% { transform: translateX(-50%); }
}

.ticker-wrap {
	position: relative;
	overflow: hidden;
	border-top: 1px solid var(--border-color);
	border-bottom: 1px solid var(--border-color);
	background: rgba(61,201,13,0.025);
	padding: 14px 0;
}

.ticker-track {
	display: flex;
	width: max-content;
	animation: tickerScroll 32s linear infinite;
	white-space: nowrap;
}

.ticker-static {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
	gap: 2px 0;
}

.t-item {
	font-size: 0.78rem;
	font-weight: 600;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--text-muted);
	padding: 0 22px;
}

.t-item.t-accent { color: var(--accent); }

.t-sep {
	color: var(--accent);
	opacity: 0.4;
	font-size: 0.72rem;
	display: flex;
	align-items: center;
}

.ticker-fade {
	position: absolute;
	top: 0; bottom: 0;
	width: 80px;
	z-index: 1;
	pointer-events: none;
}

.ticker-fade-l { left: 0;  background: linear-gradient(to right, var(--bg-base), transparent); }
.ticker-fade-r { right: 0; background: linear-gradient(to left,  var(--bg-base), transparent); }

/* ─── Events Section ─────────────────────────────── */
.events-section {
	padding: 80px 28px;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	flex-wrap: wrap;
	gap: 20px;
	margin-bottom: 40px;
}

.s-label {
	display: block;
	font-size: 0.68rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--accent);
	margin-bottom: 6px;
}

.s-title {
	font-size: clamp(1.6rem, 4vw, 2.4rem);
	font-weight: 800;
	letter-spacing: -0.03em;
	margin: 0;
	display: flex;
	align-items: center;
	gap: 12px;
}


.sport-filters { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }

.filter-chip {
	padding: 5px 14px;
	border-radius: var(--radius-sm);
	border: 1px solid var(--border-color);
	background: none;
	color: var(--text-secondary);
	font-size: 0.82rem;
	font-weight: 500;
	cursor: pointer;
	transition:
		background var(--transition-fast),
		border-color var(--transition-fast),
		color var(--transition-fast);
	font-family: var(--font-body);
}

.filter-chip:hover {
	border-color: var(--border-bright);
	color: var(--text-primary);
}

.filter-chip.active {
	background: var(--accent);
	border-color: var(--accent);
	color: #050507;
	font-weight: 700;
}

.events-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 20px;
}

.empty-state {
	text-align: center;
	padding: 80px 32px;
	color: var(--text-muted);
}

.empty-icon-wrap {
	width: 64px; height: 64px;
	border-radius: var(--radius-md);
	background: var(--bg-elevated);
	border: 1px solid var(--border-color);
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 20px;
	color: var(--text-muted);
}

.empty-state h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; color: var(--text-secondary); }
.empty-state p  { font-size: 0.9rem; line-height: 1.6; }

/* ─── How It Works ───────────────────────────────── */
.how-section {
	padding: 80px 28px 100px;
	border-top: 1px solid var(--border-color);
	position: relative;
	overflow: hidden;
}

.how-section::before {
	content: '';
	position: absolute;
	inset: 0;
	background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(61,201,13,0.04) 0%, transparent 70%);
	pointer-events: none;
}

.how-header {
	text-align: center;
	margin-bottom: 64px;
	position: relative;
}

.how-header h2 {
	font-size: clamp(1.6rem, 4vw, 2.6rem);
	font-weight: 800;
	letter-spacing: -0.03em;
	margin: 0;
}

.steps-row {
	display: flex;
	align-items: flex-start;
	max-width: 960px;
	margin: 0 auto;
	position: relative;
}

.step {
	flex: 1;
	padding: 0 40px;
}

.step:first-child { padding-left: 0; }
.step:last-child  { padding-right: 0; }

.step-num {
	font-family: var(--font-display);
	font-size: 4rem;
	font-weight: 900;
	color: var(--accent);
	opacity: 0.12;
	line-height: 1;
	margin-bottom: 16px;
	letter-spacing: -0.04em;
}

.step-icon-wrap {
	width: 44px; height: 44px;
	border-radius: var(--radius-sm);
	background: var(--accent-subtle);
	border: 1px solid var(--border-accent);
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--accent);
	margin-bottom: 18px;
}

.step h3 {
	font-size: 1.05rem;
	font-weight: 700;
	margin-bottom: 10px;
	color: var(--text-primary);
}

.step p {
	color: var(--text-secondary);
	font-size: 0.875rem;
	line-height: 1.65;
	margin: 0;
}

.step-arrow {
	flex-shrink: 0;
	color: var(--border-bright);
	padding-top: 72px;
	display: flex;
	align-items: center;
	padding-left: 4px;
	padding-right: 4px;
}

/* ─── Responsive ─────────────────────────────────── */
@media (max-width: 900px) {
	.hero-inner {
		grid-template-columns: 1fr;
		gap: 48px;
		text-align: center;
	}

	.hero-content {
		align-items: center;
		border-left: none;
		padding-left: 0;
		border-top: 3px solid var(--accent);
		padding-top: 24px;
	}

	.hero-sub br { display: none; }
	.hero-visual { display: none; }

	.steps-row {
		flex-direction: column;
		gap: 0;
	}

	.step {
		padding: 0 0 32px 24px;
		border-left: 2px solid var(--border-color);
	}

	.step:last-child { padding-bottom: 0; }
	.step:first-child { border-left-color: var(--accent); }

	.step-arrow { display: none; }
}

@media (max-width: 600px) {
	.hero { padding: 60px 20px 80px; }
	.events-section { padding: 60px 20px; }
	.how-section { padding: 60px 20px 80px; }
}
</style>
