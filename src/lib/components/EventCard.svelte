<script lang="ts">
	import type { EventPublic } from '$lib/types.js';
	import { formatPrice } from '$lib/stores/cart.js';
	import Icon from '@iconify/svelte';

	interface Props {
		event: EventPublic;
	}

	let { event }: Props = $props();

	const sportIconMap: Record<string, string> = {
		triathlon:  'lucide:waves',
		corrida:    'lucide:footprints',
		ciclismo:   'lucide:bike',
		natação:    'lucide:waves',
		atletismo:  'lucide:footprints',
		futebol:    'lucide:circle-dot',
		default:    'lucide:trophy'
	};

	function sportIcon(sport: string): string {
		const key = sport.toLowerCase();
		for (const [k, v] of Object.entries(sportIconMap)) {
			if (key.includes(k)) return v;
		}
		return sportIconMap.default;
	}

	function parseLocalDate(date: Date | string): Date {
		const str = typeof date === 'string' ? date : date.toISOString();
		return new Date(str.slice(0, 10) + 'T00:00:00');
	}

	function formatDate(date: Date | string): string {
		return parseLocalDate(date).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	const isFuture = $derived(event.isFuture ?? false);
</script>

<a href="/evento/{event.slug}" class="event-card">
	<!-- Visual area -->
	<div class="cover-wrap">

		<!-- Sport header -->
		<div class="sport-header">
			<div class="sport-header-icon">
				<Icon icon={sportIcon(event.sport)} width="13" />
			</div>
			<span class="sport-title">{event.sport}</span>
		</div>

		<!-- Banner / placeholder -->
		{#if event.coverUrl}
			<img src={event.coverUrl} alt={event.name} class="cover-img" loading="lazy" />
		{:else}
			<div class="cover-placeholder">
				<div class="placeholder-icon">
					<Icon icon={sportIcon(event.sport)} width="40" />
				</div>
				<div class="placeholder-pattern" aria-hidden="true"></div>
			</div>
		{/if}

		<!-- Gradient overlay -->
		<div class="cover-overlay"></div>

		<!-- Badge -->
		{#if isFuture}
			<div class="badge future-badge">
				<Icon icon="lucide:calendar-clock" width="12" />
				Em breve
			</div>
		{:else if event.photoCount !== undefined && event.photoCount > 0}
			<div class="badge count-badge">
				<Icon icon="lucide:images" width="12" />
				{event.photoCount}
			</div>
		{/if}
	</div>

	<!-- Card body -->
	<div class="card-body">
		<h3 class="event-name">{event.name}</h3>

		<div class="event-meta">
			<span class="meta-item">
				<Icon icon="lucide:map-pin" width="12" />
				{event.city}
			</span>
			<span class="meta-item">
				<Icon icon="lucide:calendar" width="12" />
				{formatDate(event.eventDate)}
			</span>
		</div>

		<div class="card-footer">
			{#if event.packagePrice}
				<div class="price-info">
					<span class="price-label">Pacote</span>
					<strong class="price-value">{formatPrice(event.packagePrice)}</strong>
				</div>
			{:else}
				<span></span>
			{/if}
			<span class="cta-arrow">
				<Icon icon="lucide:arrow-right" width="16" />
			</span>
		</div>
	</div>
</a>

<style>
	.event-card {
		display: flex;
		flex-direction: column;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		overflow: hidden;
		text-decoration: none;
		transition:
			transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
			border-color 0.28s ease,
			box-shadow 0.28s ease;
		position: relative;
	}

	.event-card:hover {
		transform: translateY(-4px);
		border-color: rgba(61, 201, 13, 0.28);
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45), 0 0 32px rgba(61, 201, 13, 0.08);
	}

	/* ── Visual area ──────────────────────────────────── */
	.cover-wrap {
		position: relative;
		aspect-ratio: 16 / 10;
		overflow: hidden;
		background: var(--bg-elevated);
		flex-shrink: 0;
	}

	.cover-overlay {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 42%),
			linear-gradient(to top,    rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 40%);
		z-index: 2;
		pointer-events: none;
	}

	/* ── Sport header ─────────────────────────────────── */
	.sport-header {
		position: absolute;
		top: 0; left: 0; right: 0;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 16px 10px;
	}

	.sport-header-icon {
		width: 26px; height: 26px;
		border-radius: 6px;
		background: rgba(61, 201, 13, 0.18);
		border: 1px solid rgba(61, 201, 13, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent);
		flex-shrink: 0;
	}

	.sport-title {
		font-size: 0.875rem;
		font-weight: 700;
		color: #fff;
		text-transform: capitalize;
		letter-spacing: 0.01em;
		text-shadow: 0 1px 6px rgba(0,0,0,0.6);
		font-family: var(--font-display);
	}

	/* ── Cover image ──────────────────────────────────── */
	.cover-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.event-card:hover .cover-img { transform: scale(1.06); }

	/* ── Placeholder ──────────────────────────────────── */
	.cover-placeholder {
		width: 100%; height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #0e0e14, #1a1a24);
		position: relative;
	}
	.placeholder-icon {
		color: rgba(255,255,255,0.1);
		position: relative;
		z-index: 1;
	}
	.placeholder-pattern {
		position: absolute;
		inset: 0;
		background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
		background-size: 28px 28px;
	}

	/* ── Badges ───────────────────────────────────────── */
	.badge {
		position: absolute;
		bottom: 10px; right: 12px;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.72rem;
		font-weight: 600;
		border-radius: 100px;
		padding: 4px 10px;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.count-badge {
		background: rgba(61, 201, 13, 0.18);
		border: 1px solid rgba(61, 201, 13, 0.35);
		color: var(--accent);
	}

	.future-badge {
		background: rgba(255, 193, 7, 0.15);
		border: 1px solid rgba(255, 193, 7, 0.40);
		color: #ffc107;
	}

	/* ── Card body ────────────────────────────────────── */
	.card-body {
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		flex: 1;
	}

	.event-name {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.4;
		font-family: var(--font-display);
		letter-spacing: -0.02em;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.event-meta {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.775rem;
		color: var(--text-muted);
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
		padding-top: 10px;
	}

	.price-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.price-label {
		font-size: 0.68rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.price-value {
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary);
		font-family: var(--font-display);
		letter-spacing: -0.02em;
	}

	.cta-arrow {
		width: 30px; height: 30px;
		border-radius: 6px;
		background: var(--accent-subtle);
		border: 1px solid rgba(61, 201, 13, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent);
		transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
		flex-shrink: 0;
	}

	.event-card:hover .cta-arrow {
		background: var(--accent);
		color: #050507;
		border-color: var(--accent);
		transform: translateX(3px);
	}
</style>
