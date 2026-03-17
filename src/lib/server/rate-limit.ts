/**
 * Rate limiter simples em memória usando sliding window.
 * Adequado para deployments de instância única (Node/Bun).
 * Para múltiplas instâncias, substituir pelo Redis.
 */

interface WindowEntry {
	timestamps: number[];
}

const store = new Map<string, WindowEntry>();

/** Limpa entradas expiradas periodicamente para evitar vazamento de memória */
setInterval(
	() => {
		const now = Date.now();
		for (const [key, entry] of store) {
			// Remove entradas sem timestamps recentes (janela de 30 min)
			if (entry.timestamps.length === 0 || now - entry.timestamps[entry.timestamps.length - 1] > 30 * 60_000) {
				store.delete(key);
			}
		}
	},
	5 * 60_000 // executa a cada 5 minutos
);

/**
 * Verifica se a chave ultrapassou o limite dentro da janela de tempo.
 *
 * @param key     Chave única (ex: `checkout:192.168.0.1`)
 * @param max     Número máximo de requisições permitidas
 * @param windowMs Duração da janela em milissegundos
 * @returns `true` se o limite foi atingido (deve bloquear), `false` caso contrário
 */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
	const now = Date.now();
	const cutoff = now - windowMs;

	let entry = store.get(key);
	if (!entry) {
		entry = { timestamps: [] };
		store.set(key, entry);
	}

	// Remove timestamps fora da janela
	entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

	if (entry.timestamps.length >= max) {
		return true;
	}

	entry.timestamps.push(now);
	return false;
}
