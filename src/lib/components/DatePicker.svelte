<script lang="ts">
	interface Props {
		id?: string;
		name: string;
		value?: string;
		required?: boolean;
	}

	let { id, name, value = $bindable(''), required = false }: Props = $props();

	const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
	const DAYS   = ['D','S','T','Q','Q','S','S'];

	let open      = $state(false);
	let viewYear  = $state(new Date().getFullYear());
	let viewMonth = $state(new Date().getMonth());

	// Parsed selected date
	let selected = $derived(value ? new Date(value + 'T12:00:00') : null);

	function displayValue(): string {
		if (!selected) return '';
		return selected.toLocaleDateString('pt-BR');
	}

	function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
	function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

	function selectDay(day: number) {
		const m = String(viewMonth + 1).padStart(2, '0');
		const d = String(day).padStart(2, '0');
		value = `${viewYear}-${m}-${d}`;
		open = false;
	}

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear--; }
		else viewMonth--;
	}

	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear++; }
		else viewMonth++;
	}

	function isSelected(day: number): boolean {
		if (!selected) return false;
		return selected.getFullYear() === viewYear &&
		       selected.getMonth()    === viewMonth &&
		       selected.getDate()     === day;
	}

	function isToday(day: number): boolean {
		const t = new Date();
		return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day;
	}

	// Open calendar showing selected month if there's a value
	function toggleOpen() {
		if (!open && selected) {
			viewYear  = selected.getFullYear();
			viewMonth = selected.getMonth();
		}
		open = !open;
	}

	// Grid: empty slots + day numbers
	let grid = $derived.by(() => {
		const blanks = firstDayOfMonth(viewYear, viewMonth);
		const total  = daysInMonth(viewYear, viewMonth);
		return [...Array(blanks).fill(0), ...Array.from({ length: total }, (_, i) => i + 1)];
	});
</script>

<!-- Hidden input keeps the value for form submission -->
<input type="hidden" {name} {value} {required} />

<div class="dp-wrap">
	<!-- Trigger -->
	<button type="button" class="dp-trigger" {id} onclick={toggleOpen} aria-expanded={open}>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
		</svg>
		<span class:placeholder={!value}>{value ? displayValue() : 'Selecione a data'}</span>
	</button>

	<!-- Calendar dropdown -->
	{#if open}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="dp-backdrop" onclick={() => (open = false)}></div>

		<div class="dp-calendar">
			<!-- Header: month/year navigation -->
			<div class="dp-header">
				<button type="button" class="dp-nav" onclick={prevMonth} aria-label="Mês anterior">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
				</button>
				<span class="dp-month-label">{MONTHS[viewMonth]} {viewYear}</span>
				<button type="button" class="dp-nav" onclick={nextMonth} aria-label="Próximo mês">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
				</button>
			</div>

			<!-- Weekday labels -->
			<div class="dp-grid dp-weekdays">
				{#each DAYS as d}
					<span>{d}</span>
				{/each}
			</div>

			<!-- Days grid -->
			<div class="dp-grid dp-days">
				{#each grid as cell}
					{#if cell === 0}
						<span></span>
					{:else}
						<button
							type="button"
							class="dp-day"
							class:selected={isSelected(cell)}
							class:today={isToday(cell) && !isSelected(cell)}
							onclick={() => selectDay(cell)}
						>{cell}</button>
					{/if}
				{/each}
			</div>

			<!-- Footer -->
			<div class="dp-footer">
				<button type="button" class="dp-clear" onclick={() => { value = ''; open = false; }}>Limpar</button>
				<button type="button" class="dp-today" onclick={() => {
					const t = new Date();
					viewYear = t.getFullYear(); viewMonth = t.getMonth();
					selectDay(t.getDate());
				}}>Hoje</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.dp-wrap { position: relative; }

	.dp-trigger {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 9px;
		background: var(--bg-elevated, #1a1a1a);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xs);
		padding: 9px 12px;
		color: var(--text-primary);
		font-size: 0.875rem;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.15s, box-shadow 0.15s;
		text-align: left;
	}

	.dp-trigger:hover  { border-color: rgba(255,255,255,0.2); }
	.dp-trigger[aria-expanded="true"] {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(61,201,13,0.10);
	}

	.dp-trigger svg { color: var(--text-muted); flex-shrink: 0; }
	.dp-trigger .placeholder { color: var(--text-muted); opacity: 0.6; }

	.dp-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
	}

	.dp-calendar {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 41;
		background: var(--bg-card, #111);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md, 8px);
		padding: 16px;
		min-width: 280px;
		box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04) inset;
	}

	/* Header */
	.dp-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
	}

	.dp-month-label {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: 0.02em;
	}

	.dp-nav {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xs);
		color: var(--text-muted);
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}
	.dp-nav:hover { background: var(--bg-elevated); color: var(--text-primary); border-color: rgba(255,255,255,0.15); }

	/* Grid */
	.dp-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}

	.dp-weekdays {
		margin-bottom: 6px;
	}
	.dp-weekdays span {
		text-align: center;
		font-size: 0.70rem;
		font-weight: 600;
		color: var(--text-muted);
		padding: 4px 0;
		letter-spacing: 0.05em;
	}

	.dp-day {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: var(--radius-xs);
		font-size: 0.82rem;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.12s, color 0.12s;
		font-family: inherit;
		font-weight: 500;
	}

	.dp-day:hover { background: var(--bg-elevated); color: var(--text-primary); }

	.dp-day.today {
		color: var(--accent);
		font-weight: 700;
		border: 1px solid rgba(61,201,13,0.30);
	}

	.dp-day.selected {
		background: var(--accent);
		color: #050507;
		font-weight: 800;
	}
	.dp-day.selected:hover { background: var(--accent); opacity: 0.9; }

	/* Footer */
	.dp-footer {
		display: flex;
		justify-content: space-between;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--border-color);
	}

	.dp-clear, .dp-today {
		background: none;
		border: none;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 4px;
		transition: background 0.15s;
		font-family: inherit;
	}

	.dp-clear { color: var(--text-muted); }
	.dp-clear:hover { background: var(--bg-elevated); color: var(--text-secondary); }

	.dp-today { color: var(--accent); }
	.dp-today:hover { background: rgba(61,201,13,0.08); }
</style>
