<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';

	let query = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (query.trim()) {
			goto(`/?q=${encodeURIComponent(query.trim())}`);
		}
	}

	function clearQuery() {
		query = '';
	}
</script>

<form onsubmit={handleSubmit} class="search-form">
	<div class="search-wrapper">
		<span class="search-icon">
			<Icon icon="lucide:search" width="17" />
		</span>
		<input
			type="text"
			bind:value={query}
			placeholder="Evento, esporte ou cidade..."
			class="search-input"
			autocomplete="off"
			spellcheck="false"
		/>
		{#if query}
			<button type="button" onclick={clearQuery} class="clear-btn" aria-label="Limpar busca">
				<Icon icon="lucide:x" width="14" />
			</button>
		{/if}
		<button type="submit" class="search-btn">
			Buscar
		</button>
	</div>
</form>

<style>
	.search-form { width: 100%; }

	.search-wrapper {
		display: flex;
		align-items: center;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--border-bright);
		border-radius: 10px;
		padding: 6px 6px 6px 18px;
		gap: 10px;
		transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
	}

	.search-wrapper:focus-within {
		border-color: var(--accent);
		background: rgba(61, 201, 13, 0.03);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	.search-icon {
		color: var(--text-muted);
		display: flex;
		flex-shrink: 0;
		transition: color var(--transition-fast);
	}

	.search-wrapper:focus-within .search-icon { color: var(--accent); }

	.search-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: var(--text-primary);
		font-size: 0.95rem;
		padding: 10px 0;
		font-family: var(--font-body);
		min-width: 0;
	}

	.search-input::placeholder { color: var(--text-muted); }

	.clear-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		width: 28px;
		height: 28px;
		border-radius: var(--radius-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.clear-btn:hover {
		color: var(--text-secondary);
		background: var(--bg-glass-hover);
	}

	.search-btn {
		background: var(--accent);
		color: #050507;
		border: none;
		border-radius: 7px;
		padding: 10px 22px;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.18s, box-shadow 0.18s, transform 0.15s;
		font-family: var(--font-body);
		flex-shrink: 0;
		letter-spacing: -0.01em;
	}

	.search-btn:hover {
		background: var(--accent-hover);
		box-shadow: 0 0 20px var(--accent-glow);
		transform: translateY(-1px);
	}

	.search-btn:active {
		transform: translateY(0);
	}
</style>
