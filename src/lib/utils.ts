/**
 * Capitaliza a primeira letra de cada palavra no nome.
 * Ex: "joão da silva" → "João Da Silva"
 */
export function capitalizeName(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}
