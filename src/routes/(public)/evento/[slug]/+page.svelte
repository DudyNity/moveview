<script lang="ts">
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import { cart, formatPrice } from '$lib/stores/cart.js';
	import type { PageData } from './$types.js';
	import Icon from '@iconify/svelte';
	import { env as pubEnv } from '$env/dynamic/public';
	const PUBLIC_APP_URL = pubEnv.PUBLIC_APP_URL;
	const PUBLIC_APP_NAME = pubEnv.PUBLIC_APP_NAME;

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
		const minPhotos = data.event.packageMinPhotos;
		const unpurchased = allPhotos.filter(
			(photo) => !photo.isPurchased && !$cart.some((i) => i.photoId === photo.id)
		);
		const toAdd = minPhotos ? unpurchased.slice(0, minPhotos) : unpurchased;
		toAdd.forEach((photo) => {
			cart.addToCart({
				photoId: photo.id,
				eventName: data.event.name,
				watermarkUrl: photo.watermarkUrl,
				price: photo.price
			});
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

	// Face search
	let faceInfoOpen = $state(false);
	let faceConsentOpen = $state(false);
	let faceCameraOpen = $state(false);
	let faceSearching = $state(false);
	let faceResults = $state<typeof allPhotos | null>(null);
	let faceError = $state('');

	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let mediaStream = $state<MediaStream | null>(null);
	let cameraError = $state('');
	let torchOn = $state(false);
	let torchSupported = $state(false);

	function openFaceConsent() {
		faceConsentOpen = true;
	}

	async function acceptFaceConsent() {
		faceConsentOpen = false;
		cameraError = '';
		faceCameraOpen = true;
		await startCamera();
	}

	async function startCamera() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }
			});
			mediaStream = stream;
			if (videoEl) {
				videoEl.srcObject = stream;
				videoEl.play();
			}
			// Verifica suporte ao flash
			const track = stream.getVideoTracks()[0];
			const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
			torchSupported = !!caps?.torch;
			torchOn = false;
		} catch {
			cameraError = 'Não foi possível acessar a câmera. Verifique as permissões do navegador.';
		}
	}

	async function toggleTorch() {
		if (!mediaStream || !torchSupported) return;
		const track = mediaStream.getVideoTracks()[0];
		torchOn = !torchOn;
		try {
			await track.applyConstraints({ advanced: [{ torch: torchOn } as MediaTrackConstraintSet] });
		} catch {
			torchOn = false;
		}
	}

	function stopCamera() {
		if (mediaStream) {
			const track = mediaStream.getVideoTracks()[0];
			try { track.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] }); } catch {}
			mediaStream.getTracks().forEach((t) => t.stop());
		}
		mediaStream = null;
		faceCameraOpen = false;
		cameraError = '';
		torchOn = false;
	}

	async function captureAndSearch() {
		if (!videoEl || !canvasEl) return;
		const size = Math.min(videoEl.videoWidth, videoEl.videoHeight);
		const offsetX = (videoEl.videoWidth - size) / 2;
		const offsetY = (videoEl.videoHeight - size) / 2;
		canvasEl.width = size;
		canvasEl.height = size;
		const ctx = canvasEl.getContext('2d')!;
		ctx.drawImage(videoEl, offsetX, offsetY, size, size, 0, 0, size, size);
		stopCamera();

		faceSearching = true;
		faceError = '';
		faceResults = null;

		try {
			const blob = await new Promise<Blob>((res) =>
				canvasEl!.toBlob((b) => res(b!), 'image/jpeg', 0.85)
			);
			const buffer = await blob.arrayBuffer();
			const bytes = new Uint8Array(buffer);
			let binary = '';
			const chunk = 8192;
			for (let i = 0; i < bytes.length; i += chunk) {
				binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
			}
			const base64 = btoa(binary);
			const res = await fetch('/api/face', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId: data.event.id, selfieBase64: base64 })
			});
			if (!res.ok) throw new Error((await res.json()).message ?? 'Erro na busca');
			const json = await res.json();
			faceResults = json.photos;
		} catch (err: unknown) {
			faceError = (err as Error).message ?? 'Erro ao buscar fotos';
		} finally {
			faceSearching = false;
		}
	}

	async function searchByFace(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		faceSearching = true;
		faceError = '';
		faceResults = null;
		try {
			const buffer = await file.arrayBuffer();
			const bytes = new Uint8Array(buffer);
			let binary = '';
			const chunk = 8192;
			for (let i = 0; i < bytes.length; i += chunk) {
				binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
			}
			const base64 = btoa(binary);
			const res = await fetch('/api/face', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId: data.event.id, selfieBase64: base64 })
			});
			if (!res.ok) throw new Error((await res.json()).message ?? 'Erro na busca');
			const json = await res.json();
			faceResults = json.photos;
		} catch (err: unknown) {
			faceError = (err as Error).message ?? 'Erro ao buscar fotos';
		} finally {
			faceSearching = false;
			input.value = '';
		}
	}

	// Pricing comparison — use event-level photoPrice
	const photoPrice = $derived(data.event.photoPrice ?? 2900);
	const packagePrice = $derived(data.event.packagePrice);
	const packageMinPhotos = $derived(data.event.packageMinPhotos);
	const packagePhotoCount = $derived(
		packageMinPhotos ? Math.min(packageMinPhotos, data.totalPhotos) : data.totalPhotos
	);
	const totalIndividual = $derived(packagePhotoCount * photoPrice);
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
								<span class="stat-pkg-label">{data.event.packageMinPhotos ? `pacote mín. ${data.event.packageMinPhotos} fotos` : 'pacote completo'}</span>
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

			<div class="face-btn-wrap">
				{#if faceSearching}
					<button class="face-btn" disabled>
						<span class="face-spinner"></span> Buscando...
					</button>
				{:else}
					<button class="face-btn" onclick={openFaceConsent}>
						<Icon icon="lucide:scan-face" width="16" /> Minhas fotos
					</button>
				{/if}
				<button class="face-info-btn" onclick={() => faceInfoOpen = !faceInfoOpen} aria-label="Como funciona">
					<Icon icon="lucide:info" width="14" />
				</button>
			</div>

			{#if packagePrice}
				<button onclick={addPackageToCart} class="pkg-btn">
					<Icon icon="lucide:package" width="16" />
					{packageMinPhotos ? `Pacote (mín. ${packageMinPhotos} fotos)` : 'Pacote completo'} — {formatPrice(packagePrice)}
				</button>
			{/if}
		</div>
	</div>

	<!-- Info panel reconhecimento facial -->
	{#if faceInfoOpen}
		<div class="face-info-panel">
			<div class="face-info-inner">
				<Icon icon="lucide:scan-face" width="22" />
				<div class="face-info-text">
					<strong>Como encontrar suas fotos</strong>
					<p>Clique em <b>Minhas fotos</b>, tire uma selfie ou escolha uma foto do seu rosto. O sistema encontra automaticamente todas as fotos em que você aparece.</p>
					<span class="face-info-tip">💡 Funciona melhor com rosto bem iluminado e centralizado</span>
				</div>
				<button class="face-info-close" onclick={() => faceInfoOpen = false}>
					<Icon icon="lucide:x" width="14" />
				</button>
			</div>
		</div>
	{/if}

	<!-- Resultados do reconhecimento facial -->
	{#if faceError}
		<div class="face-error">
			<Icon icon="lucide:alert-circle" width="14" /> {faceError}
		</div>
	{/if}

	{#if faceResults !== null}
		<div class="face-results">
			<div class="face-results-header">
				<Icon icon="lucide:scan-face" width="16" />
				{#if faceResults.length === 0}
					<span>Nenhuma foto encontrada com seu rosto neste evento.</span>
				{:else}
					<span>{faceResults.length} foto{faceResults.length !== 1 ? 's' : ''} encontrada{faceResults.length !== 1 ? 's' : ''} com seu rosto</span>
				{/if}
				<button class="face-close" onclick={() => faceResults = null}>
					<Icon icon="lucide:x" width="14" />
				</button>
			</div>
			{#if faceResults.length > 0}
				<div class="face-grid">
					{#each faceResults as photo (photo.id)}
						<div class="face-photo-wrap">
							<img src={photo.watermarkUrl} alt="Sua foto" class="face-photo" />
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

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
						<span class="pricing-label">{packageMinPhotos ? `Pacote (mín. ${packageMinPhotos} fotos)` : 'Pacote completo'}</span>
						<span class="pricing-value accent">{formatPrice(packagePrice)}<span class="pricing-unit"> tudo</span></span>
						<span class="pricing-sub">
							{packageMinPhotos ? `mín. ${packageMinPhotos}` : data.totalPhotos} fotos em alta resolução
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

<!-- Modal câmera com guia de enquadramento -->
{#if faceCameraOpen}
	<div class="camera-backdrop">
		<video bind:this={videoEl} autoplay playsinline muted class="camera-video"></video>
		<canvas bind:this={canvasEl} style="display:none"></canvas>

		<!-- Overlay escuro com recorte oval via CSS -->
		<div class="camera-overlay"></div>
		<div class="camera-oval-border"></div>

		<!-- UI por cima do overlay -->
		<div class="camera-ui">
			<div class="camera-top-bar">
				<div class="camera-title">
					<Icon icon="lucide:scan-face" width="16" />
					Posicione seu rosto
				</div>
				<button class="camera-close" onclick={stopCamera}>
					<Icon icon="lucide:x" width="16" />
				</button>
			</div>

			<div class="camera-middle">
				{#if cameraError}
					<div class="camera-error-msg">
						<Icon icon="lucide:camera-off" width="24" />
						<span>{cameraError}</span>
					</div>
				{/if}
			</div>

			<div class="camera-bottom">
				{#if torchSupported}
					<button class="camera-torch" onclick={toggleTorch} class:torch-on={torchOn}>
						<Icon icon={torchOn ? 'lucide:zap' : 'lucide:zap-off'} width="20" />
					</button>
				{:else}
					<div style="width:48px"></div>
				{/if}
				<button class="camera-capture" onclick={captureAndSearch} disabled={!!cameraError}>
					<span class="camera-capture-ring">
						<span class="camera-capture-inner"></span>
					</span>
				</button>
				<div style="width:48px"></div>
			</div>
		</div>
	</div>
{/if}

<!-- Modal de consentimento facial -->
{#if faceConsentOpen}
	<div class="consent-backdrop" onclick={() => faceConsentOpen = false}>
		<div class="consent-modal" onclick={(e) => e.stopPropagation()}>
			<div class="consent-icon">
				<Icon icon="lucide:shield-check" width="28" />
			</div>
			<h3>Uso de reconhecimento facial</h3>
			<p class="consent-desc">
				Para encontrar suas fotos, precisamos analisar o rosto na imagem que você enviar.
			</p>
			<ul class="consent-list">
				<li><Icon icon="lucide:check" width="13" /> A imagem é usada apenas para busca neste evento</li>
				<li><Icon icon="lucide:check" width="13" /> Não armazenamos sua selfie</li>
				<li><Icon icon="lucide:check" width="13" /> Os dados são processados de forma segura</li>
				<li><Icon icon="lucide:check" width="13" /> Você pode recusar e buscar as fotos manualmente</li>
			</ul>
			<p class="consent-legal">
				Ao continuar, você consente com o processamento da sua imagem facial conforme nossa
				<a href="/privacidade" target="_blank">Política de Privacidade</a> e a LGPD.
			</p>
			<div class="consent-actions">
				<button class="consent-btn-cancel" onclick={() => faceConsentOpen = false}>
					Recusar
				</button>
				<button class="consent-btn-accept" onclick={acceptFaceConsent}>
					<Icon icon="lucide:scan-face" width="15" /> Aceitar e continuar
				</button>
			</div>
		</div>
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
		z-index: 40;
		padding: 10px 16px;
	}

	.toolbar-inner {
		max-width: 1280px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.toolbar-left {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		flex: 1;
		min-width: 0;
	}

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
		.toolbar { padding: 8px 12px; top: 56px; }
		.toolbar-inner { gap: 6px; }
		.pkg-btn { padding: 8px 12px; font-size: 0.8rem; }
		.face-btn { padding: 8px 12px; font-size: 0.8rem; }
		.face-info-panel { padding: 10px 12px; }
		.photo-count { font-size: 0.82rem; }

		.hero-body { flex-direction: column; align-items: flex-start; gap: 20px; }
		.hero-stat-card { width: 100%; }
		.event-hero-overlay { padding: 20px 20px 28px; }
	}

	@media (max-width: 640px) {
		.pricing-inner { flex-direction: column; align-items: stretch; gap: 8px; }
		.pricing-divider { text-align: center; padding: 4px 0; }
	}

	/* Modal câmera */
	.camera-backdrop {
		position: fixed;
		inset: 0;
		background: #000;
		z-index: 300;
		overflow: hidden;
	}

	.camera-video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transform: scaleX(-1);
	}

	.camera-overlay {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 58% 28% at 50% 38%,
			transparent 99%,
			rgba(0,0,0,0.68) 100%
		);
		pointer-events: none;
	}

	.camera-oval-border {
		position: absolute;
		left: 21%;
		right: 21%;
		top: 18%;
		bottom: 42%;
		border-radius: 50%;
		border: 2px solid rgba(61,201,13,0.85);
		pointer-events: none;
		box-shadow: 0 0 0 1px rgba(61,201,13,0.12);
	}

	.camera-ui {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.camera-top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 52px 24px 16px;
	}

	.camera-title {
		display: flex;
		align-items: center;
		gap: 8px;
		color: white;
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		text-shadow: 0 1px 4px rgba(0,0,0,0.5);
	}

	.camera-close {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: none;
		background: rgba(0,0,0,0.45);
		backdrop-filter: blur(8px);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.camera-middle {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.camera-error-msg {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		background: rgba(0,0,0,0.7);
		backdrop-filter: blur(8px);
		color: #f87171;
		font-size: 0.875rem;
		text-align: center;
		padding: 24px 32px;
		border-radius: var(--radius-md);
	}

	.camera-bottom {
		padding: 0 32px 48px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.camera-hint {
		color: rgba(255,255,255,0.65);
		font-size: 0.75rem;
		text-align: center;
		width: 80px;
		line-height: 1.4;
		text-shadow: 0 1px 3px rgba(0,0,0,0.6);
	}

	.camera-capture {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: transform 0.12s;
	}

	.camera-capture:active { transform: scale(0.92); }
	.camera-capture:disabled { opacity: 0.4; cursor: not-allowed; }

	.camera-capture-ring {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 76px;
		height: 76px;
		border-radius: 50%;
		border: 3px solid rgba(255,255,255,0.9);
		transition: border-color 0.15s;
	}

	.camera-capture:active .camera-capture-ring { border-color: var(--accent); }

	.camera-capture-inner {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: white;
		display: block;
		transition: background 0.12s, transform 0.12s;
	}

	.camera-capture:active .camera-capture-inner {
		background: var(--accent);
		transform: scale(0.88);
	}

	.camera-torch {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: none;
		background: rgba(0,0,0,0.45);
		backdrop-filter: blur(8px);
		color: rgba(255,255,255,0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.camera-torch.torch-on {
		background: rgba(251,191,36,0.25);
		color: #fbbf24;
		box-shadow: 0 0 12px rgba(251,191,36,0.4);
	}

	/* Modal consentimento facial */
	.consent-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		padding: 20px;
	}

	.consent-modal {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 28px 24px;
		max-width: 420px;
		width: 100%;
	}

	.consent-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(61,201,13,0.1);
		border: 1px solid rgba(61,201,13,0.25);
		color: var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16px;
	}

	.consent-modal h3 {
		font-size: 1.1rem;
		font-weight: 700;
		text-align: center;
		margin-bottom: 10px;
	}

	.consent-desc {
		color: var(--text-muted);
		font-size: 0.875rem;
		text-align: center;
		margin-bottom: 16px;
		line-height: 1.5;
	}

	.consent-list {
		list-style: none;
		padding: 0;
		margin: 0 0 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.consent-list li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.82rem;
		color: var(--text-secondary);
	}

	.consent-list li :global(svg) { color: var(--accent); flex-shrink: 0; }

	.consent-legal {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-align: center;
		margin-bottom: 20px;
		line-height: 1.5;
		padding: 10px;
		background: var(--bg-elevated);
		border-radius: var(--radius-sm);
	}

	.consent-legal a { color: var(--accent); text-decoration: none; }
	.consent-legal a:hover { text-decoration: underline; }

	.consent-actions {
		display: flex;
		gap: 10px;
	}

	.consent-btn-cancel {
		flex: 1;
		padding: 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-color);
		background: none;
		color: var(--text-muted);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.consent-btn-cancel:hover { background: var(--bg-elevated); color: var(--text-secondary); }

	.consent-btn-accept {
		flex: 2;
		padding: 10px;
		border-radius: var(--radius-sm);
		border: none;
		background: var(--accent);
		color: #050507;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		transition: opacity 0.2s;
	}

	.consent-btn-accept:hover { opacity: 0.85; }

	/* Face search */
	.face-btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.face-btn:hover { border-color: var(--accent); color: var(--accent); }

	.face-btn-wrap {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.face-info-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		transition: color 0.2s;
	}

	.face-info-btn:hover { color: var(--text-secondary); }

	.face-info-panel {
		background: rgba(61,201,13,0.05);
		border-bottom: 1px solid rgba(61,201,13,0.15);
		padding: 12px 24px;
	}

	.face-info-inner {
		max-width: 1280px;
		margin: 0 auto;
		display: flex;
		align-items: flex-start;
		gap: 12px;
		color: var(--accent);
	}

	.face-info-text {
		flex: 1;
		font-size: 0.85rem;
	}

	.face-info-text strong {
		display: block;
		color: var(--text-primary);
		margin-bottom: 4px;
		font-size: 0.875rem;
	}

	.face-info-text p {
		color: var(--text-muted);
		margin: 0 0 8px;
		line-height: 1.5;
	}

	.face-info-tip {
		display: inline-block;
		font-size: 0.78rem;
		color: var(--text-muted);
		background: var(--bg-elevated);
		border-radius: var(--radius-xs);
		padding: 4px 8px;
	}

	.face-info-close {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 2px;
		display: flex;
		flex-shrink: 0;
	}

	.face-spinner {
		width: 13px;
		height: 13px;
		border: 2px solid var(--border-color);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		display: inline-block;
	}

	.face-error {
		max-width: 1280px;
		margin: 0 auto;
		padding: 10px 24px;
		color: #f87171;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.face-results {
		max-width: 1280px;
		margin: 0 auto 8px;
		padding: 0 24px;
	}

	.face-results-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		background: rgba(61,201,13,0.07);
		border: 1px solid rgba(61,201,13,0.2);
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		color: var(--accent);
		margin-bottom: 12px;
	}

	.face-close {
		margin-left: auto;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 2px;
		display: flex;
	}

	.face-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 8px;
	}

	.face-photo-wrap {
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 1px solid var(--accent);
	}

	.face-photo { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; }
</style>
