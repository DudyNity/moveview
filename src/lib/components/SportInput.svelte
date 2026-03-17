<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		sports: { id: string; name: string }[];
		value?: string;
		name?: string;
		id?: string;
		required?: boolean;
		placeholder?: string;
	}

	let {
		sports,
		value = $bindable(''),
		name = 'sport',
		id = 'sport',
		required = false,
		placeholder = 'Ex: Corrida, Triathlon...'
	}: Props = $props();

	let open = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLElement | null>(null);
	let activeIndex = $state(-1);

	const filtered = $derived(
		sports.filter((s) => s.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
	);

	function select(name: string) {
		value = name;
		open = false;
		activeIndex = -1;
	}

	function onInput() {
		open = true;
		activeIndex = -1;
	}

	function onFocus() {
		open = true;
	}

	function onBlur(e: FocusEvent) {
		// Close only if focus left both input and list
		if (!listEl?.contains(e.relatedTarget as Node)) {
			open = false;
			activeIndex = -1;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') open = true; return; }
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, -1);
		} else if (e.key === 'Enter' && activeIndex >= 0) {
			e.preventDefault();
			select(filtered[activeIndex].name);
		} else if (e.key === 'Escape') {
			open = false;
			activeIndex = -1;
		}
	}
</script>

<div class="sport-input-root">
	<div class="input-wrap" class:focused={open}>
		<Icon icon="lucide:trophy" width="14" class="input-icon" />
		<input
			bind:this={inputEl}
			bind:value
			{id}
			{name}
			{required}
			{placeholder}
			type="text"
			autocomplete="off"
			role="combobox"
			aria-expanded={open}
			aria-autocomplete="list"
			aria-haspopup="listbox"
			oninput={onInput}
			onfocus={onFocus}
			onblur={onBlur}
			onkeydown={onKeydown}
		/>
		<button
			type="button"
			class="chevron"
			class:open
			tabindex="-1"
			onclick={() => { open = !open; inputEl?.focus(); }}
			aria-label="Abrir lista"
		>
			<Icon icon="lucide:chevron-down" width="14" />
		</button>
	</div>

	{#if open && sports.length > 0}
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			class="dropdown"
			role="listbox"
			bind:this={listEl}
			onmousedown={(e) => e.preventDefault()}
		>
			{#if filtered.length === 0}
				<div class="empty-option">
					<Icon icon="lucide:search-x" width="13" />
					Nenhum esporte encontrado — pressione Enter para usar "<strong>{value}</strong>"
				</div>
			{:else}
				{#each filtered as sport, i (sport.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="option"
						class:active={i === activeIndex}
						role="option"
						aria-selected={value === sport.name}
						onclick={() => select(sport.name)}
					>
						<span class="option-icon">
							<Icon icon="lucide:trophy" width="12" />
						</span>
						{sport.name}
						{#if value === sport.name}
							<Icon icon="lucide:check" width="13" class="check-icon" />
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.sport-input-root {
		position: relative;
	}

	/* Input area */
	.input-wrap {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--bg-elevated, #1a1a1a);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xs);
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.input-wrap.focused {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(61, 201, 13, 0.1);
	}

	.input-wrap :global(.input-icon) {
		position: absolute;
		left: 11px;
		color: var(--text-muted);
		pointer-events: none;
		flex-shrink: 0;
	}

	.input-wrap input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		padding: 9px 36px 9px 34px;
		color: var(--text-primary);
		font-size: 0.875rem;
		font-family: inherit;
		width: 100%;
		box-shadow: none !important;
	}

	.input-wrap input::placeholder { color: var(--text-muted); opacity: 0.6; }

	.chevron {
		position: absolute;
		right: 8px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border-radius: 4px;
		transition: color 0.15s, transform 0.2s;
	}
	.chevron:hover { color: var(--text-secondary); }
	.chevron.open { transform: rotate(180deg); color: var(--accent); }

	/* Dropdown */
	.dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xs);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
		z-index: 50;
		overflow: hidden;
		animation: dropdown-in 0.12s ease;
	}

	@keyframes dropdown-in {
		from { opacity: 0; transform: translateY(-4px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.option {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 9px 12px;
		font-size: 0.875rem;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.1s, color 0.1s;
		border-bottom: 1px solid var(--border-color);
	}
	.option:last-child { border-bottom: none; }

	.option:hover,
	.option.active {
		background: var(--bg-elevated);
		color: var(--text-primary);
	}

	.option-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 4px;
		background: rgba(61, 201, 13, 0.08);
		border: 1px solid rgba(61, 201, 13, 0.15);
		color: var(--accent);
		flex-shrink: 0;
	}

	.option :global(.check-icon) {
		margin-left: auto;
		color: var(--accent);
		flex-shrink: 0;
	}

	.empty-option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.empty-option strong { color: var(--text-primary); }
</style>
