<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '@iconify/svelte';
	import SportInput from '$lib/components/SportInput.svelte';
	import type { ActionData, PageData } from './$types.js';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let loading = $state(false);
	let coverPreview = $state<string | null>(null);
	let sportValue = $state(form?.values?.sport ?? '');
	let isDragging = $state(false);

	function maskCurrency(raw: string): string {
		const digits = raw.replace(/\D/g, '').replace(/^0+/, '') || '0';
		const padded = digits.padStart(3, '0');
		const reais = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
		const centavos = padded.slice(-2);
		return `${reais},${centavos}`;
	}

	function onPriceInput(e: Event) {
		const input = e.target as HTMLInputElement;
		input.value = maskCurrency(input.value);
	}

	const defaultPhotoPrice = maskCurrency(
		form?.values?.photoPrice ? String(Math.round(parseFloat(String(form.values.photoPrice).replace(',', '.')) * 100)) : '999'
	);
	const defaultPackagePrice = form?.values?.packagePrice
		? maskCurrency(String(Math.round(parseFloat(String(form.values.packagePrice).replace(',', '.')) * 100)))
		: '';

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
</script>

<svelte:head>
	<title>Novo Evento — Move View Photos</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/fotografo/painel" class="back-link">
			<Icon icon="lucide:arrow-left" width="14" />
			Voltar ao painel
		</a>
		<div>
			<h1>Criar Novo Evento</h1>
			<p>Preencha as informações do evento. Após criar, você poderá fazer upload das fotos.</p>
		</div>
	</div>

	{#if form?.error}
		<div class="alert-error">
			<Icon icon="lucide:alert-circle" width="15" />
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
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
					<p>Dados gerais que identificam o evento</p>
				</div>
			</div>

			<div class="form-grid">
				<div class="field full-width">
					<label for="name">Nome do Evento <span class="required">*</span></label>
					<div class="input-wrap">
						<Icon icon="lucide:pencil" width="14" class="input-icon" />
						<input
							id="name"
							name="name"
							type="text"
							placeholder="Ex: Maratona São Paulo 2025"
							required
							value={form?.values?.name ?? ''}
						/>
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
					{#if data.sports.length === 0}
						<span class="field-hint">
							<Icon icon="lucide:info" width="11" />
							<a href="/fotografo/painel/esportes">Cadastre esportes</a> para sugestões automáticas.
						</span>
					{/if}
				</div>

				<div class="field">
					<label for="eventDate">Data do Evento <span class="required">*</span></label>
					<div class="input-wrap">
						<Icon icon="lucide:calendar" width="14" class="input-icon" />
						<input
							id="eventDate"
							name="eventDate"
							type="date"
							required
							value={form?.values?.eventDate ?? ''}
						/>
					</div>
				</div>

				<div class="field">
					<label for="city">Cidade <span class="required">*</span></label>
					<div class="input-wrap">
						<Icon icon="lucide:map-pin" width="14" class="input-icon" />
						<input
							id="city"
							name="city"
							type="text"
							placeholder="São Paulo"
							required
							value={form?.values?.city ?? ''}
						/>
					</div>
				</div>

				<div class="field">
					<label for="location">Local <span class="required">*</span></label>
					<div class="input-wrap">
						<Icon icon="lucide:landmark" width="14" class="input-icon" />
						<input
							id="location"
							name="location"
							type="text"
							placeholder="Parque Ibirapuera"
							required
							value={form?.values?.location ?? ''}
						/>
					</div>
				</div>

				<div class="field full-width">
					<label for="description">Descrição <span class="label-optional">Opcional</span></label>
					<textarea
						id="description"
						name="description"
						rows="3"
						placeholder="Descreva o evento, percurso, categorias..."
					>{form?.values?.description ?? ''}</textarea>
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
					<h2>Preços</h2>
					<p>Defina os valores para compra de fotos</p>
				</div>
			</div>

			<div class="form-grid cols-3">
				<div class="field">
					<label for="photoPrice">Preço por Foto</label>
					<div class="input-wrap">
						<span class="input-prefix">R$</span>
						<input
							id="photoPrice"
							name="photoPrice"
							type="text"
							inputmode="numeric"
							placeholder="9,99"
							value={defaultPhotoPrice}
							oninput={onPriceInput}
						/>
					</div>
				</div>

				<div class="field">
					<label for="packagePrice">
						Pacote Completo
						<span class="label-optional">Opcional</span>
					</label>
					<div class="input-wrap">
						<span class="input-prefix">R$</span>
						<input
							id="packagePrice"
							name="packagePrice"
							type="text"
							inputmode="numeric"
							placeholder="49,90"
							value={defaultPackagePrice}
							oninput={onPriceInput}
						/>
					</div>
					<span class="field-hint"><Icon icon="lucide:info" width="11" /> Todas as fotos do evento</span>
				</div>

				<div class="field">
					<label for="status">Visibilidade</label>
					<div class="input-wrap select-wrap">
						<Icon icon="lucide:eye" width="14" class="input-icon" />
						<select id="status" name="status">
							<option value="draft" selected={!form?.values?.status || form?.values?.status === 'draft'}>
								Rascunho — privado
							</option>
							<option value="active" selected={form?.values?.status === 'active'}>
								Ativo — público
							</option>
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
					<p>Imagem de capa exibida na listagem pública. Recomendado 1400×560 px.</p>
				</div>
			</div>

			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="cover-drop"
				class:has-preview={coverPreview}
				class:dragging={isDragging}
				onclick={() => (document.getElementById('cover') as HTMLInputElement)?.click()}
				ondragover={(e) => { e.preventDefault(); isDragging = true; }}
				ondragleave={() => isDragging = false}
				ondrop={onDrop}
			>
				{#if coverPreview}
					<img src={coverPreview} alt="Preview do banner" class="cover-preview" />
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
			<input
				id="cover"
				name="cover"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onchange={onCoverChange}
				class="cover-input"
			/>
		</section>

		<div class="form-footer">
			<a href="/fotografo/painel" class="btn-cancel">Cancelar</a>
			<button type="submit" class="btn-submit" disabled={loading}>
				{#if loading}
					<span class="spinner"></span>
					Criando evento...
				{:else}
					Criar e ir para Upload
					<Icon icon="lucide:arrow-right" width="15" />
				{/if}
			</button>
		</div>
	</form>
</div>

<style>
	.page { max-width: 760px; }

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

	.alert-error {
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(239,68,68,0.08);
		border: 1px solid rgba(239,68,68,0.25);
		color: #f87171;
		padding: 12px 16px;
		border-radius: var(--radius-sm);
		margin-bottom: 20px;
		font-size: 0.875rem;
	}

	/* Form card */
	.event-form {
		display: flex;
		flex-direction: column;
		gap: 0;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	/* Sections */
	.form-section {
		padding: 24px 28px;
		border-bottom: 1px solid var(--border-color);
	}
	.form-section:last-of-type { border-bottom: none; }

	.section-header {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 20px;
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

	.section-header h2 {
		font-size: 0.925rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 2px;
	}
	.section-header p {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 0;
	}

	/* Grid */
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
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

	/* Input wrapper with icon */
	.input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

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

	.input-wrap input,
	.input-wrap select {
		padding-left: 34px;
	}

	.input-wrap.select-wrap select {
		padding-left: 34px;
		appearance: none;
	}

	/* For prefix (R$) inputs */
	.input-wrap:has(.input-prefix) input {
		padding-left: 38px;
	}

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
	}

	input:focus, select:focus, textarea:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(61, 201, 13, 0.1);
	}

	input::placeholder, textarea::placeholder { color: var(--text-muted); opacity: 0.6; }

	.field-hint {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.74rem;
		color: var(--text-muted);
	}
	.field-hint a { color: var(--accent); text-decoration: none; }
	.field-hint a:hover { text-decoration: underline; }

	select option { background: #1a1a1a; }
	textarea { resize: vertical; min-height: 80px; }

	/* Cover upload */
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

	.cover-drop:hover,
	.cover-drop.dragging { border-color: var(--accent); background: rgba(61, 201, 13, 0.04); }

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

	.cover-preview {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

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
		justify-content: flex-end;
		align-items: center;
		gap: 10px;
		padding: 18px 28px;
		background: var(--bg-elevated);
		border-top: 1px solid var(--border-color);
	}

	.btn-cancel {
		padding: 9px 18px;
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
		gap: 8px;
		background: var(--accent);
		color: #000;
		border: none;
		padding: 9px 22px;
		border-radius: var(--radius-xs);
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.15s, transform 0.1s;
	}

	.btn-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
	.btn-submit:active:not(:disabled) { transform: translateY(0); }
	.btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(0,0,0,0.2);
		border-top-color: #000;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	@media (max-width: 640px) {
		.form-section { padding: 20px; }
		.form-grid, .form-grid.cols-3 { grid-template-columns: 1fr; }
		.full-width { grid-column: 1; }
		.form-footer { padding: 16px 20px; }
	}
</style>
