<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '@iconify/svelte';
	import SportInput from '$lib/components/SportInput.svelte';
	import type { PageData, ActionData } from './$types.js';

	interface Props { data: PageData; form: ActionData; }
	let { data, form }: Props = $props();

	let loading = $state(false);
	let coverPreview = $state<string | null>(null);
	let isDragging = $state(false);
	let deleteError = $state('');

	function onCoverChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) { coverPreview = null; return; }
		const reader = new FileReader();
		reader.onload = () => { coverPreview = reader.result as string; };
		reader.readAsDataURL(file);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (!file || !file.type.startsWith('image/')) return;
		const input = document.getElementById('cover') as HTMLInputElement;
		const dt = new DataTransfer();
		dt.items.add(file);
		input.files = dt.files;
		const reader = new FileReader();
		reader.onload = () => { coverPreview = reader.result as string; };
		reader.readAsDataURL(file);
	}

	function toDateInput(date: Date | string): string {
		const d = new Date(date);
		return d.toISOString().slice(0, 10);
	}

	function formatPrice(cents: number | null) {
		if (!cents) return '';
		return (cents / 100).toFixed(2);
	}

	const event = $derived(data.event);
	const photos = $derived(data.photos);
	let sportValue = $state(data.event.sport);
</script>

<svelte:head>
	<title>Editar {data.event.name} — Move View Photos</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/fotografo/painel" class="back-link">
			<Icon icon="lucide:arrow-left" width="14" />
			Voltar ao painel
		</a>
		<div>
			<h1>Editar Evento</h1>
			<p>Atualize as informações do evento. As fotos não serão afetadas.</p>
		</div>
	</div>

	{#if form?.error}
		<div class="alert alert-error">
			<Icon icon="lucide:alert-circle" width="15" />
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="alert alert-success">
			<Icon icon="lucide:check-circle" width="15" />
			Evento atualizado com sucesso!
		</div>
	{/if}

	<div class="content-layout">

		<!-- Left: Form -->
		<form
			method="POST"
			action="?/updateEvent"
			enctype="multipart/form-data"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => { await update(); loading = false; };
			}}
			class="event-form"
		>
			<!-- Section: Informações básicas -->
			<section class="form-section">
				<div class="section-header">
					<div class="section-icon">
						<Icon icon="lucide:file-text" width="14" />
					</div>
					<div>
						<h2>Informações básicas</h2>
						<p>Dados gerais do evento</p>
					</div>
				</div>

				<div class="form-grid">
					<div class="field full-width">
						<label for="name">Nome do Evento <span class="required">*</span></label>
						<div class="input-wrap">
							<Icon icon="lucide:pencil" width="14" class="input-icon" />
							<input id="name" name="name" type="text" required value={event.name} />
						</div>
					</div>

					<div class="field">
						<label for="sport">Esporte <span class="required">*</span></label>
						<SportInput
							sports={data.sports}
							bind:value={sportValue}
							id="sport"
							name="sport"
							required
						/>
					</div>

					<div class="field">
						<label for="eventDate">Data do Evento <span class="required">*</span></label>
						<div class="input-wrap">
							<Icon icon="lucide:calendar" width="14" class="input-icon" />
							<input id="eventDate" name="eventDate" type="date" required value={toDateInput(event.eventDate)} />
						</div>
					</div>

					<div class="field">
						<label for="city">Cidade <span class="required">*</span></label>
						<div class="input-wrap">
							<Icon icon="lucide:map-pin" width="14" class="input-icon" />
							<input id="city" name="city" type="text" required value={event.city} />
						</div>
					</div>

					<div class="field">
						<label for="location">Local <span class="required">*</span></label>
						<div class="input-wrap">
							<Icon icon="lucide:landmark" width="14" class="input-icon" />
							<input id="location" name="location" type="text" required value={event.location} />
						</div>
					</div>

					<div class="field full-width">
						<label for="description">Descrição <span class="label-optional">Opcional</span></label>
						<textarea id="description" name="description" rows="3" placeholder="Descreva o evento...">{event.description ?? ''}</textarea>
					</div>
				</div>
			</section>

			<!-- Section: Preços -->
			<section class="form-section">
				<div class="section-header">
					<div class="section-icon">
						<Icon icon="lucide:tag" width="14" />
					</div>
					<div>
						<h2>Preços e visibilidade</h2>
						<p>Valores e estado de publicação</p>
					</div>
				</div>

				<div class="form-grid cols-3">
					<div class="field">
						<label for="photoPrice">Preço por Foto</label>
						<div class="input-wrap">
							<span class="input-prefix">R$</span>
							<input id="photoPrice" name="photoPrice" type="number" step="0.01" min="1" placeholder="29.00" value={formatPrice(event.photoPrice)} />
						</div>
					</div>

					<div class="field">
						<label for="packagePrice">Pacote Completo <span class="label-optional">Opcional</span></label>
						<div class="input-wrap">
							<span class="input-prefix">R$</span>
							<input id="packagePrice" name="packagePrice" type="number" step="0.01" min="0" placeholder="49.90" value={formatPrice(event.packagePrice)} />
						</div>
						<span class="field-hint"><Icon icon="lucide:info" width="11" /> Todas as fotos</span>
					</div>

					<div class="field">
						<label for="status">Visibilidade</label>
						<div class="input-wrap select-wrap">
							<Icon icon="lucide:eye" width="14" class="input-icon" />
							<select id="status" name="status">
								<option value="draft" selected={event.status === 'draft'}>Rascunho — privado</option>
								<option value="active" selected={event.status === 'active'}>Ativo — público</option>
								<option value="archived" selected={event.status === 'archived'}>Arquivado</option>
							</select>
						</div>
					</div>
				</div>
			</section>

			<!-- Section: Capa -->
			<section class="form-section">
				<div class="section-header">
					<div class="section-icon">
						<Icon icon="lucide:image" width="14" />
					</div>
					<div>
						<h2>Banner do Evento <span class="label-optional">Opcional</span></h2>
						<p>Deixe em branco para manter o banner atual.</p>
					</div>
				</div>

				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="cover-drop"
					class:has-preview={coverPreview || event.coverUrl}
					class:dragging={isDragging}
					onclick={() => (document.getElementById('cover') as HTMLInputElement)?.click()}
					ondragover={(e) => { e.preventDefault(); isDragging = true; }}
					ondragleave={() => isDragging = false}
					ondrop={onDrop}
				>
					{#if coverPreview}
						<img src={coverPreview} alt="Preview" class="cover-preview" />
						<div class="cover-overlay">
							<Icon icon="lucide:image-plus" width="20" />
							<span>Clique para trocar</span>
						</div>
					{:else if event.coverUrl}
						<img src={event.coverUrl} alt="Banner atual" class="cover-preview" />
						<div class="cover-overlay">
							<Icon icon="lucide:image-plus" width="20" />
							<span>Clique para trocar</span>
						</div>
					{:else}
						<div class="cover-empty">
							<div class="cover-empty-icon">
								<Icon icon="lucide:image-plus" width="24" />
							</div>
							<span>Arraste uma imagem ou clique para selecionar</span>
							<small>JPG, PNG ou WebP</small>
						</div>
					{/if}
				</div>
				<input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" onchange={onCoverChange} class="cover-input" />
			</section>

			<div class="form-footer">
				<a href="/fotografo/painel/evento/{event.id}/upload" class="btn-upload-link">
					<Icon icon="lucide:upload" width="14" />
					Upload de fotos
				</a>
				<div class="footer-right">
					<a href="/fotografo/painel" class="btn-cancel">Cancelar</a>
					<button type="submit" class="btn-submit" disabled={loading}>
						{#if loading}
							<span class="spinner"></span>
							Salvando...
						{:else}
							<Icon icon="lucide:check" width="15" />
							Salvar alterações
						{/if}
					</button>
				</div>
			</div>
		</form>

		<!-- Right: Photos sidebar -->
		<aside class="photos-sidebar">
			<div class="sidebar-header">
				<div class="sidebar-title">
					<Icon icon="lucide:images" width="15" />
					<h2>Fotos do evento</h2>
					{#if photos.length > 0}
						<span class="count">{photos.length}</span>
					{/if}
				</div>
				<a href="/fotografo/painel/evento/{event.id}/upload" class="btn-add-photos">
					<Icon icon="lucide:plus" width="12" />
					Adicionar
				</a>
			</div>

			{#if deleteError}
				<div class="alert alert-error small">{deleteError}</div>
			{/if}

			{#if photos.length === 0}
				<div class="no-photos">
					<div class="no-photos-icon">
						<Icon icon="lucide:image-off" width="22" />
					</div>
					<p>Nenhuma foto ainda</p>
					<a href="/fotografo/painel/evento/{event.id}/upload" class="btn-upload-cta">
						<Icon icon="lucide:upload" width="13" />
						Fazer upload
					</a>
				</div>
			{:else}
				<div class="photos-grid">
					{#each photos as photo (photo.id)}
						<div class="photo-card">
							<img src={photo.watermarkUrl} alt="Foto" class="photo-img" />
							<div class="photo-overlay">
								<form
									method="POST"
									action="?/deletePhoto"
									use:enhance={({ cancel }) => {
										if (!confirm('Remover esta foto? Esta ação não pode ser desfeita.')) {
											cancel();
											return;
										}
										deleteError = '';
										return async ({ result, update }) => {
											if (result.type === 'failure') {
												deleteError = (result.data?.error as string) ?? 'Erro ao remover foto';
											} else {
												await update();
											}
										};
									}}
								>
									<input type="hidden" name="photoId" value={photo.id} />
									<button type="submit" class="btn-delete-photo" title="Remover foto">
										<Icon icon="lucide:trash-2" width="13" />
									</button>
								</form>
							</div>
							{#if photo.bibNumbers?.length}
								<div class="bib-tag">{photo.bibNumbers.join(', ')}</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</aside>

	</div>
</div>

<style>
	.page { max-width: 1100px; }

	.content-layout {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: 20px;
		align-items: start;
	}

	.page-header { margin-bottom: 28px; }

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.82rem;
		margin-bottom: 14px;
		transition: color 0.2s;
	}
	.back-link:hover { color: var(--text-secondary); }

	.page-header h1 { font-size: 1.65rem; font-weight: 800; margin-bottom: 4px; }
	.page-header p { color: var(--text-muted); margin: 0; font-size: 0.875rem; }

	.alert {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		border-radius: var(--radius-sm);
		margin-bottom: 16px;
		font-size: 0.875rem;
	}
	.alert-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #f87171; }
	.alert-success { background: rgba(61,201,13,0.08); border: 1px solid rgba(61,201,13,0.25); color: var(--accent); }
	.alert.small { font-size: 0.8rem; padding: 9px 12px; margin-bottom: 12px; }

	/* Form */
	.event-form {
		display: flex;
		flex-direction: column;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.form-section {
		padding: 22px 26px;
		border-bottom: 1px solid var(--border-color);
	}
	.form-section:last-of-type { border-bottom: none; }

	.section-header {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 18px;
	}

	.section-icon {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-xs);
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent);
		flex-shrink: 0;
		margin-top: 2px;
	}

	.section-header h2 { font-size: 0.925rem; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
	.section-header p { font-size: 0.78rem; color: var(--text-muted); margin: 0; }

	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
	.form-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
	.field { display: flex; flex-direction: column; gap: 6px; }
	.full-width { grid-column: 1 / -1; }

	label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.required { color: var(--accent); font-weight: 700; }
	.label-optional { font-weight: 400; color: var(--text-muted); font-size: 0.75rem; }

	.input-wrap { position: relative; display: flex; align-items: center; }
	.input-wrap :global(.input-icon) {
		position: absolute;
		left: 11px;
		color: var(--text-muted);
		pointer-events: none;
		flex-shrink: 0;
	}
	.input-prefix {
		position: absolute;
		left: 12px;
		font-size: 0.82rem;
		color: var(--text-muted);
		font-weight: 600;
		pointer-events: none;
		user-select: none;
	}
	.input-wrap input, .input-wrap select { padding-left: 34px; }
	.input-wrap.select-wrap select { padding-left: 34px; appearance: none; }
	.input-wrap:has(.input-prefix) input { padding-left: 38px; }

	input, select, textarea {
		background: var(--bg-elevated, #1a1a1a);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xs);
		padding: 9px 12px;
		color: var(--text-primary);
		font-size: 0.875rem;
		font-family: inherit;
		transition: border-color 0.15s, box-shadow 0.15s;
		width: 100%;
		box-sizing: border-box;
	}
	input:focus, select:focus, textarea:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(61, 201, 13, 0.1);
	}
	input::placeholder, textarea::placeholder { color: var(--text-muted); opacity: 0.6; }
	select option { background: #1a1a1a; }
	textarea { resize: vertical; min-height: 80px; }

	.field-hint {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.74rem;
		color: var(--text-muted);
	}

	/* Cover */
	.cover-input { display: none; }
	.cover-drop {
		border: 1.5px dashed var(--border-color);
		border-radius: var(--radius-xs);
		cursor: pointer;
		overflow: hidden;
		transition: border-color 0.2s, background 0.2s;
		aspect-ratio: 16 / 5;
		background: var(--bg-elevated);
	}
	.cover-drop:hover, .cover-drop.dragging { border-color: var(--accent); background: rgba(61, 201, 13, 0.04); }
	.cover-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 100%;
		color: var(--text-muted);
	}
	.cover-empty-icon {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-xs);
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		opacity: 0.7;
	}
	.cover-empty span { font-size: 0.85rem; color: var(--text-secondary); }
	.cover-empty small { font-size: 0.75rem; color: var(--text-muted); opacity: 0.6; }
	.cover-drop.has-preview { position: relative; }
	.cover-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
	.cover-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,0.55);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: white;
		font-size: 0.85rem;
		font-weight: 600;
		opacity: 0;
		transition: opacity 0.2s;
	}
	.cover-drop.has-preview:hover .cover-overlay { opacity: 1; }

	/* Footer */
	.form-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 26px;
		background: var(--bg-elevated);
		border-top: 1px solid var(--border-color);
		gap: 12px;
		flex-wrap: wrap;
	}
	.footer-right { display: flex; gap: 10px; align-items: center; }

	.btn-upload-link {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.82rem;
		color: var(--accent);
		text-decoration: none;
		transition: opacity 0.2s;
	}
	.btn-upload-link:hover { opacity: 0.8; }

	.btn-cancel {
		padding: 9px 16px;
		border-radius: var(--radius-xs);
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 600;
		transition: color 0.15s, background 0.15s;
	}
	.btn-cancel:hover { color: var(--text-primary); background: var(--bg-glass-hover); }

	.btn-submit {
		display: flex;
		align-items: center;
		gap: 7px;
		background: var(--accent);
		color: #000;
		border: none;
		padding: 9px 20px;
		border-radius: var(--radius-xs);
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		transition: opacity 0.15s, transform 0.1s;
	}
	.btn-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
	.btn-submit:active:not(:disabled) { transform: translateY(0); }
	.btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }

	.spinner {
		width: 13px;
		height: 13px;
		border: 2px solid rgba(0,0,0,0.2);
		border-top-color: #000;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* Photos sidebar */
	.photos-sidebar {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		overflow: hidden;
		position: sticky;
		top: 24px;
		max-height: calc(100vh - 80px);
		display: flex;
		flex-direction: column;
	}

	.sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 18px;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-elevated);
		flex-shrink: 0;
	}

	.sidebar-title {
		display: flex;
		align-items: center;
		gap: 7px;
		color: var(--text-muted);
	}
	.sidebar-title h2 { font-size: 0.875rem; font-weight: 700; margin: 0; color: var(--text-primary); }
	.count {
		background: var(--bg-glass-hover);
		border: 1px solid var(--border-color);
		color: var(--text-muted);
		font-size: 0.72rem;
		font-weight: 600;
		padding: 1px 7px;
		border-radius: 10px;
	}

	.btn-add-photos {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.78rem;
		color: var(--accent);
		text-decoration: none;
		padding: 5px 10px;
		border: 1px solid rgba(61,201,13,0.3);
		border-radius: var(--radius-xs);
		white-space: nowrap;
		transition: background 0.2s;
	}
	.btn-add-photos:hover { background: rgba(61,201,13,0.08); }

	.no-photos {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 40px 20px;
		color: var(--text-muted);
		text-align: center;
	}
	.no-photos-icon {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-xs);
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		opacity: 0.5;
	}
	.no-photos p { font-size: 0.85rem; margin: 0; }

	.btn-upload-cta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.82rem;
		color: var(--accent);
		text-decoration: none;
		border: 1px solid rgba(61,201,13,0.3);
		padding: 7px 14px;
		border-radius: var(--radius-xs);
		transition: background 0.2s;
	}
	.btn-upload-cta:hover { background: rgba(61,201,13,0.08); }

	.photos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
		gap: 5px;
		padding: 14px;
		overflow-y: auto;
	}

	.photo-card {
		position: relative;
		border-radius: var(--radius-xs);
		overflow: hidden;
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		aspect-ratio: 4/3;
	}

	.photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }

	.photo-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,0);
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		padding: 5px;
		transition: background 0.2s;
	}
	.photo-card:hover .photo-overlay { background: rgba(0,0,0,0.35); }

	.btn-delete-photo {
		background: rgba(239,68,68,0.85);
		border: none;
		border-radius: var(--radius-xs);
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: white;
		opacity: 0;
		transition: opacity 0.2s;
	}
	.photo-card:hover .btn-delete-photo { opacity: 1; }
	.btn-delete-photo:hover { background: #ef4444; }

	.bib-tag {
		position: absolute;
		bottom: 4px;
		left: 4px;
		background: rgba(0,0,0,0.7);
		color: var(--accent);
		font-size: 0.62rem;
		font-weight: 700;
		padding: 2px 5px;
		border-radius: 3px;
	}

	@media (max-width: 960px) {
		.content-layout { grid-template-columns: 1fr; }
		.photos-sidebar { position: static; max-height: none; }
		.photos-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
	}

	@media (max-width: 600px) {
		.form-grid, .form-grid.cols-3 { grid-template-columns: 1fr; }
		.full-width { grid-column: 1; }
		.form-section { padding: 18px; }
		.form-footer { padding: 14px 18px; }
	}
</style>
