// ─── Preços (em centavos) ──────────────────────────────────────────────────
/** Preço padrão por foto individual: R$29,00 */
export const DEFAULT_PHOTO_PRICE = 2900;

// ─── Imagens ───────────────────────────────────────────────────────────────
/** Largura máxima da versão com marca d'água (preview) */
export const WATERMARK_MAX_WIDTH = 900;

/** Tamanho máximo de upload de foto (50 MB) */
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

// ─── Paginação ────────────────────────────────────────────────────────────
/** Quantidade de fotos carregadas na primeira renderização de um evento */
export const PHOTOS_INITIAL_LIMIT = 48;

/** Quantidade de fotos carregadas por página nas chamadas subsequentes */
export const PHOTOS_PAGE_LIMIT = 48;

// ─── Rate limiting ────────────────────────────────────────────────────────
/** Máximo de tentativas de checkout por IP em 1 minuto */
export const RATE_LIMIT_CHECKOUT_MAX = 10;
export const RATE_LIMIT_CHECKOUT_WINDOW_MS = 60_000;

/** Máximo de tentativas de login/registro por IP em 15 minutos */
export const RATE_LIMIT_AUTH_MAX = 20;
export const RATE_LIMIT_AUTH_WINDOW_MS = 15 * 60_000;

/** Máximo de uploads por IP em 10 minutos */
export const RATE_LIMIT_UPLOAD_MAX = 300;
export const RATE_LIMIT_UPLOAD_WINDOW_MS = 10 * 60_000;

/** Máximo de downloads por usuário em 1 minuto */
export const RATE_LIMIT_DOWNLOAD_MAX = 60;
export const RATE_LIMIT_DOWNLOAD_WINDOW_MS = 60_000;
