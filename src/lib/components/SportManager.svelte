<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Sport {
		id: string;
		name: string;
	}

	interface Props {
		sports: Sport[];
		onchange?: (sports: Sport[]) => void;
	}

	let { sports = $bindable([]), onchange }: Props = $props();

	let newName = $state('');
	let adding = $state(false);
	let addError = $state('');

	// Inline edit state
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editError = $state('');
	let saving = $state(false);

	let deletingId = $state<string | null>(null);

	async function addSport() {
		const name = newName.trim();
		if (!name) return;
		adding = true;
		addError = '';
		try {
			const res = await fetch('/api/photographer/sports', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				addError = data.message ?? 'Erro ao adicionar';
				return;
			}
			const created: Sport = await res.json();
			sports = [...sports, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
			newName = '';
			onchange?.(sports);
		} finally {
			adding = false;
		}
	}

	function startEdit(sport: Sport) {
		editingId = sport.id;
		editName = sport.name;
		editError = '';
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
		editError = '';
	}

	async function saveEdit() {
		const name = editName.trim();
		if (!name || !editingId) return;
		saving = true;
		editError = '';
		try {
			const res = await fetch(`/api/photographer/sports/${editingId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				editError = data.message ?? 'Erro ao salvar';
				return;
			}
			const updated: Sport = await res.json();
			sports = sports
				.map((s) => (s.id === updated.id ? updated : s))
				.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
			editingId = null;
			onchange?.(sports);
		} finally {
			saving = false;
		}
	}

	async function deleteSport(id: string) {
		deletingId = id;
		try {
			const res = await fetch(`/api/photographer/sports/${id}`, { method: 'DELETE' });
			if (!res.ok) return;
			sports = sports.filter((s) => s.id !== id);
			onchange?.(sports);
		} finally {
			deletingId = null;
		}
	}

	function handleAddKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); addSport(); }
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
		if (e.key === 'Escape') cancelEdit();
	}
</script>

<div class="sport-manager">
	<p class="panel-label">Esportes</p>

	<!-- Add form -->
	<div class="add-row">
		<input
			type="text"
			bind:value={newName}
			placeholder="Novo esporte..."
			class="add-input"
			maxlength="60"
			onkeydown={handleAddKeydown}
			disabled={adding}
		/>
		<button
			onclick={addSport}
			class="add-btn"
			disabled={adding || !newName.trim()}
			aria-label="Adicionar esporte"
		>
			{#if adding}
				<div class="micro-spinner"></div>
			{:else}
				<Icon icon="lucide:plus" width="14" />
			{/if}
		</button>
	</div>
	{#if addError}
		<p class="field-error">{addError}</p>
	{/if}

	<!-- List -->
	{#if sports.length === 0}
		<p class="empty-hint">Nenhum esporte cadastrado.</p>
	{:else}
		<ul class="sports-list">
			{#each sports as sport (sport.id)}
				<li class="sport-item" class:is-editing={editingId === sport.id}>
					{#if editingId === sport.id}
						<input
							type="text"
							bind:value={editName}
							class="edit-input"
							maxlength="60"
							onkeydown={handleEditKeydown}
							disabled={saving}
							autofocus
						/>
						{#if editError}
							<span class="field-error inline-error">{editError}</span>
						{/if}
						<div class="item-actions">
							<button
								onclick={saveEdit}
								class="act-btn act-save"
								disabled={saving || !editName.trim()}
								aria-label="Salvar"
							>
								{#if saving}
									<div class="micro-spinner"></div>
								{:else}
									<Icon icon="lucide:check" width="13" />
								{/if}
							</button>
							<button onclick={cancelEdit} class="act-btn act-cancel" aria-label="Cancelar">
								<Icon icon="lucide:x" width="13" />
							</button>
						</div>
					{:else}
						<span class="sport-name">{sport.name}</span>
						<div class="item-actions">
							<button
								onclick={() => startEdit(sport)}
								class="act-btn act-edit"
								aria-label="Editar {sport.name}"
							>
								<Icon icon="lucide:pencil" width="12" />
							</button>
							<button
								onclick={() => deleteSport(sport.id)}
								class="act-btn act-delete"
								disabled={deletingId === sport.id}
								aria-label="Apagar {sport.name}"
							>
								{#if deletingId === sport.id}
									<div class="micro-spinner"></div>
								{:else}
									<Icon icon="lucide:trash-2" width="12" />
								{/if}
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.sport-manager { display: flex; flex-direction: column; gap: 10px; }

	.panel-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin: 0;
	}

	/* Add row */
	.add-row {
		display: flex;
		gap: 6px;
	}

	.add-input {
		flex: 1;
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xs);
		color: var(--text-primary);
		font-size: 0.82rem;
		padding: 7px 10px;
		font-family: var(--font-body);
		min-width: 0;
		transition: border-color var(--transition-fast);
	}

	.add-input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.add-input:disabled { opacity: 0.5; }

	.add-btn {
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		background: var(--accent);
		color: #050507;
		border: none;
		border-radius: var(--radius-xs);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background var(--transition-fast), opacity var(--transition-fast);
	}

	.add-btn:hover:not(:disabled) { background: var(--accent-hover); }
	.add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	/* List */
	.sports-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.sport-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 8px;
		border-radius: var(--radius-xs);
		border: 1px solid transparent;
		transition: background var(--transition-fast), border-color var(--transition-fast);
	}

	.sport-item:hover { background: var(--bg-glass-hover); }

	.sport-item.is-editing {
		background: var(--bg-elevated);
		border-color: var(--border-bright);
		flex-wrap: wrap;
	}

	.sport-name {
		flex: 1;
		font-size: 0.83rem;
		color: var(--text-secondary);
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.edit-input {
		flex: 1;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--accent);
		color: var(--text-primary);
		font-size: 0.83rem;
		padding: 2px 0;
		font-family: var(--font-body);
		outline: none;
		min-width: 0;
	}

	.item-actions {
		display: flex;
		gap: 2px;
		flex-shrink: 0;
		opacity: 0;
		transition: opacity var(--transition-fast);
	}

	.sport-item:hover .item-actions,
	.sport-item.is-editing .item-actions { opacity: 1; }

	.act-btn {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-xs);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.act-edit  { color: var(--text-muted); }
	.act-edit:hover  { background: var(--bg-glass-hover); color: var(--text-primary); }

	.act-save  { color: var(--accent); }
	.act-save:hover:not(:disabled)  { background: rgba(61,201,13,0.1); }
	.act-save:disabled { opacity: 0.4; cursor: not-allowed; }

	.act-cancel { color: var(--text-muted); }
	.act-cancel:hover { background: var(--bg-glass-hover); color: var(--text-primary); }

	.act-delete { color: var(--text-muted); }
	.act-delete:hover:not(:disabled) { background: rgba(248,113,113,0.1); color: #f87171; }
	.act-delete:disabled { opacity: 0.4; cursor: not-allowed; }

	.field-error {
		font-size: 0.72rem;
		color: #f87171;
		display: block;
	}

	.inline-error { width: 100%; }

	.empty-hint {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 0;
	}

	/* Spinner micro */
	.micro-spinner {
		width: 12px;
		height: 12px;
		border: 1.5px solid rgba(255,255,255,0.2);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }
</style>
