<script lang="ts">
	import type { PageData } from './$types.js';
	import { invalidateAll } from '$app/navigation';
	import Icon from '@iconify/svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	interface UploadFile {
		id: string;
		file: File;
		status: 'pending' | 'uploading' | 'done' | 'error';
		// Preenchido após upload bem-sucedido — não geramos preview local
		// para evitar que o browser decodifique centenas de imagens ao mesmo tempo
		watermarkUrl?: string;
		errorMsg?: string;
	}

	let uploadQueue = $state<UploadFile[]>([]);
	let isDragging = $state(false);
	let isUploading = $state(false);

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function onDragLeave() {
		isDragging = false;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const files = Array.from(e.dataTransfer?.files ?? []);
		addFiles(files);
	}

	function onFileInput(e: Event) {
		const files = Array.from((e.target as HTMLInputElement).files ?? []);
		addFiles(files);
		(e.target as HTMLInputElement).value = '';
	}

	/** Comprime imagem no browser antes de enviar — reduz 10MB→1-2MB */
	async function compressImage(file: File): Promise<File> {
		return new Promise((resolve) => {
			const img = new Image();
			const url = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(url);
				const MAX_W = 2400;
				const scale = Math.min(1, MAX_W / img.width);
				const w = Math.round(img.width * scale);
				const h = Math.round(img.height * scale);
				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
				canvas.toBlob(
					(blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file),
					'image/jpeg',
					0.88
				);
			};
			img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
			img.src = url;
		});
	}

	function addFiles(files: File[]) {
		const images = files.filter((f) => f.type.startsWith('image/'));
		const newItems: UploadFile[] = images.map((f) => ({
			id: Math.random().toString(36).slice(2),
			file: f,
			status: 'pending'
		}));
		uploadQueue = [...uploadQueue, ...newItems];
	}

	function removeFile(id: string) {
		uploadQueue = uploadQueue.filter((f) => f.id !== id);
	}

	/** Atualiza um item por índice — mais rápido que .map() sobre toda a lista */
	function patchItem(id: string, patch: Partial<UploadFile>) {
		const idx = uploadQueue.findIndex((f) => f.id === id);
		if (idx !== -1) {
			uploadQueue[idx] = { ...uploadQueue[idx], ...patch };
			// eslint-disable-next-line no-self-assign
			uploadQueue = uploadQueue;
		}
	}

	// 5 uploads simultâneos
	const CONCURRENCY = 5;

	async function uploadOne(item: UploadFile) {
		patchItem(item.id, { status: 'uploading' });

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 3 * 60_000);

		try {
			// 1. Pede presigned URL para enviar original direto ao R2
			let originalKey: string | null = null;
			const presignRes = await fetch('/api/upload/presign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					eventId: data.event.id,
					filename: item.file.name,
					contentType: item.file.type || 'image/jpeg'
				}),
				signal: controller.signal
			});

			if (presignRes.ok) {
				const { uploadUrl, key } = await presignRes.json();
				if (uploadUrl) {
					// 2. Upload do original COMPLETO direto ao R2 (sem passar pelo servidor)
					await fetch(uploadUrl, {
						method: 'PUT',
						body: item.file,
						headers: { 'Content-Type': item.file.type || 'image/jpeg' },
						signal: controller.signal
					});
					originalKey = key;
				}
			}

			// 3. Envia versão comprimida ao servidor só para criar marca d'água
			const compressed = await compressImage(item.file);
			const formData = new FormData();
			formData.append('file', compressed);
			formData.append('eventId', data.event.id);
			formData.append('price', String(data.event.photoPrice));
			if (originalKey) formData.append('originalKey', originalKey);

			const res = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
				signal: controller.signal
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message ?? body.error ?? `Erro ${res.status}`);
			}

			const result = await res.json();
			patchItem(item.id, { status: 'done', watermarkUrl: result.watermarkUrl });
		} catch (err: unknown) {
			const msg = err instanceof DOMException && err.name === 'AbortError'
				? 'Tempo limite excedido — tente novamente'
				: (err as Error).message ?? 'Erro de rede';
			patchItem(item.id, { status: 'error', errorMsg: msg });
		} finally {
			clearTimeout(timeout);
		}
	}

	async function uploadAll() {
		const pending = uploadQueue.filter((f) => f.status === 'pending');
		if (pending.length === 0) return;

		isUploading = true;

		// Pool concorrente: mantém até CONCURRENCY uploads rodando ao mesmo tempo
		const pool = new Set<Promise<void>>();
		for (const item of pending) {
			const p: Promise<void> = uploadOne(item).then(() => { pool.delete(p); });
			pool.add(p);
			if (pool.size >= CONCURRENCY) await Promise.race(pool);
		}
		await Promise.all(pool);

		isUploading = false;

		if (uploadQueue.some((f) => f.status === 'done')) {
			await invalidateAll();
		}
	}

	function clearDone() {
		uploadQueue = uploadQueue.filter((f) => f.status !== 'done');
	}

	const pendingCount = $derived(uploadQueue.filter((f) => f.status === 'pending').length);
	const uploadingCount = $derived(uploadQueue.filter((f) => f.status === 'uploading').length);
	const doneCount = $derived(uploadQueue.filter((f) => f.status === 'done').length);
	const errorCount = $derived(uploadQueue.filter((f) => f.status === 'error').length);
</script>

<svelte:head>
	<title>Upload — {data.event.name} — Move View Photos</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/fotografo/painel" class="back-link">← Voltar ao painel</a>
		<div class="header-info">
			<h1>{data.event.name}</h1>
			<div class="header-meta">
				<span>{data.event.sport}</span>
				<span class="dot">·</span>
				<span>{data.event.photoCount} foto{data.event.photoCount !== 1 ? 's' : ''} já enviadas</span>
				<span class="dot">·</span>
				<a href="/evento/{data.event.slug}" target="_blank" class="view-link">Ver evento →</a>
			</div>
		</div>
	</div>

	<!-- Drop zone -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="drop-zone"
		class:dragging={isDragging}
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
	>
		<div class="drop-content">
			<div class="drop-icon">📁</div>
			<p class="drop-title">Arraste fotos aqui ou clique para selecionar</p>
			<p class="drop-hint">JPEG, PNG, WEBP — múltiplos arquivos permitidos</p>
			<label class="btn-select">
				Selecionar Arquivos
				<input
					type="file"
					accept="image/*"
					multiple
					style="display:none"
					onchange={onFileInput}
				/>
			</label>
		</div>
	</div>

	<!-- Upload queue -->
	{#if uploadQueue.length > 0}
		<div class="queue-section">
			<div class="queue-header">
				<div class="queue-counts">
					{#if pendingCount > 0}<span class="count-pending">{pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>{/if}
					{#if uploadingCount > 0}<span class="count-uploading">{uploadingCount} enviando…</span>{/if}
					{#if doneCount > 0}<span class="count-done">{doneCount} concluída{doneCount !== 1 ? 's' : ''}</span>{/if}
					{#if errorCount > 0}<span class="count-error">{errorCount} erro{errorCount !== 1 ? 's' : ''}</span>{/if}
				</div>
				<div class="queue-actions">
					{#if doneCount > 0}
						<button onclick={clearDone} class="btn-ghost">Limpar concluídas</button>
					{/if}
					{#if pendingCount > 0}
						<button onclick={uploadAll} class="btn-upload" disabled={isUploading}>
							{isUploading ? 'Enviando...' : `Enviar ${pendingCount} foto${pendingCount !== 1 ? 's' : ''}`}
						</button>
					{/if}
				</div>
			</div>

			<div class="queue-grid">
				{#each uploadQueue as item (item.id)}
					<div
						class="queue-item"
						class:item-uploading={item.status === 'uploading'}
						class:item-done={item.status === 'done'}
						class:item-error={item.status === 'error'}
					>
						<div class="item-preview">
							{#if item.status === 'done' && item.watermarkUrl}
								<!-- Imagem carregada do servidor após upload — pequena e lazy -->
								<img src={item.watermarkUrl} alt={item.file.name} loading="lazy" />
								<div class="done-overlay">
									<Icon icon="lucide:check" width="20" />
								</div>
							{:else if item.status === 'uploading'}
								<div class="placeholder-icon">
									<div class="spinner"></div>
								</div>
							{:else if item.status === 'error'}
								<div class="placeholder-icon error-icon">
									<Icon icon="lucide:x-circle" width="24" />
								</div>
							{:else}
								<div class="placeholder-icon">
									<Icon icon="lucide:image" width="24" />
								</div>
							{/if}
						</div>

						<div class="item-info">
							<span class="item-name">{item.file.name}</span>
							<span class="item-size">{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
							{#if item.errorMsg}
								<span class="item-error-msg">{item.errorMsg}</span>
							{/if}
						</div>

						{#if item.status === 'pending' || item.status === 'error'}
							<button onclick={() => removeFile(item.id)} class="item-remove" aria-label="Remover">
								<Icon icon="lucide:x" width="12" />
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Already uploaded photos preview -->
	{#if data.photos.length > 0}
		<div class="existing-section">
			<h2>Fotos já enviadas ({data.photos.length})</h2>
			<div class="existing-grid">
				{#each data.photos as photo (photo.id)}
					<div class="existing-photo">
						<img src={photo.watermarkUrl} alt="Foto enviada" />
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.page { max-width: 960px; }

	.page-header { margin-bottom: 24px; }

	.back-link {
		display: inline-block;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.85rem;
		margin-bottom: 10px;
		transition: color 0.2s;
	}

	.back-link:hover { color: var(--text-secondary); }

	.header-info h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 6px; }

	.header-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-muted);
		font-size: 0.85rem;
		flex-wrap: wrap;
	}

	.dot { opacity: 0.4; }
	.view-link { color: var(--accent); text-decoration: none; }
	.view-link:hover { text-decoration: underline; }

	.drop-zone {
		border: 2px dashed var(--border-color);
		border-radius: 8px;
		padding: 48px 24px;
		text-align: center;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
		margin-bottom: 28px;
	}

	.drop-zone.dragging {
		border-color: var(--accent);
		background: var(--accent-subtle);
	}

	.drop-icon { font-size: 3rem; margin-bottom: 12px; }
	.drop-title { font-size: 1rem; font-weight: 600; margin-bottom: 6px; }
	.drop-hint { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px; }

	.btn-select {
		display: inline-block;
		background: var(--accent);
		color: white;
		padding: 8px 20px;
		border-radius: 4px;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.btn-select:hover { opacity: 0.85; }

	.queue-section { margin-bottom: 40px; }

	.queue-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.queue-counts { display: flex; gap: 12px; flex-wrap: wrap; }

	.count-pending { color: var(--text-secondary); font-size: 0.85rem; }
	.count-uploading { color: var(--accent); font-size: 0.85rem; }
	.count-done { color: #4ade80; font-size: 0.85rem; }
	.count-error { color: #f87171; font-size: 0.85rem; }

	.queue-actions { display: flex; gap: 10px; align-items: center; }

	.btn-ghost {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 7px 14px;
		border-radius: 4px;
		font-size: 0.85rem;
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
	}

	.btn-ghost:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.2); }

	.btn-upload {
		background: var(--accent);
		color: white;
		border: none;
		padding: 8px 20px;
		border-radius: 4px;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.btn-upload:hover:not(:disabled) { opacity: 0.85; }
	.btn-upload:disabled { opacity: 0.5; cursor: not-allowed; }

	.queue-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 12px;
	}

	.queue-item {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 5px;
		overflow: hidden;
		position: relative;
		transition: border-color 0.2s;
	}

	.item-uploading { border-color: rgba(61,201,13,0.3); }
	.item-done      { border-color: rgba(74,222,128,0.3); }
	.item-error     { border-color: rgba(248,113,113,0.3); }

	.item-preview {
		aspect-ratio: 4/3;
		background: var(--bg-elevated);
		position: relative;
		overflow: hidden;
	}

	.item-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Placeholder quando não há preview (pending / uploading / error) */
	.placeholder-icon {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
	}

	.error-icon { color: #f87171; }

	.done-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(34, 197, 94, 0.25);
		color: #4ade80;
	}

	.spinner {
		width: 28px;
		height: 28px;
		border: 3px solid rgba(255,255,255,0.2);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	.item-info {
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.item-name {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-size      { font-size: 0.7rem; color: var(--text-muted); }
	.item-error-msg { font-size: 0.7rem; color: #f87171; }

	.item-remove {
		position: absolute;
		top: 4px;
		right: 4px;
		background: rgba(0,0,0,0.6);
		border: none;
		color: white;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.item-remove:hover { background: rgba(239,68,68,0.8); }

	.existing-section { margin-top: 32px; }

	.existing-section h2 { font-size: 1rem; font-weight: 700; margin-bottom: 14px; color: var(--text-secondary); }

	.existing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 8px;
	}

	.existing-photo {
		aspect-ratio: 4/3;
		border-radius: 4px;
		overflow: hidden;
		background: #111;
	}

	.existing-photo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
