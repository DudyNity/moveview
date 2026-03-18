import sharp from 'sharp';
import { WATERMARK_MAX_WIDTH } from '$lib/constants.js';

// Desativa cache do libvips para liberar memória entre processamentos
sharp.cache(false);
// Permite até 4 threads do libvips em paralelo
sharp.concurrency(4);

const BRAND = 'MOVE VIEW PHOTOS';
const SYMBOL = 'M\\'; // símbolo M\ — velocidade + inicial

/** Fast deterministic hash → seed */
function imageSeed(buf: Buffer): number {
	let h = 0xdeadbeef;
	for (let i = 0; i < Math.min(buf.length, 256); i++) {
		h = Math.imul(h ^ buf[i], 0x9e3779b9);
		h ^= h >>> 15;
	}
	return (h >>> 0) || 1;
}

/** Seeded PRNG (xorshift32) */
function prng(seed: number) {
	let s = seed >>> 0 || 1;
	return (): number => {
		s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
		return (s >>> 0) / 0xffffffff;
	};
}

/**
 * Apply structured pixel-level noise to raw RGBA buffer.
 * Each pixel gets a small deterministic perturbation based on its position + seed.
 * This makes inpainting impossible: the "clean" reference pixels aren't clean.
 */
function applyPixelNoise(data: Buffer, width: number, height: number, seed: number): void {
	const rand = prng(seed);
	// Pre-generate a 64×64 noise tile (reused via modulo — fast)
	const tileSize = 64;
	const tile = new Int8Array(tileSize * tileSize);
	for (let i = 0; i < tile.length; i++) {
		// ±6 noise: invisible to human eye, breaks AI context reconstruction
		tile[i] = Math.round((rand() - 0.5) * 12);
	}

	const channels = 4; // RGBA
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const px = (y * width + x) * channels;
			const noise = tile[(y % tileSize) * tileSize + (x % tileSize)];
			// Apply to R, G, B — leave A untouched
			data[px]     = Math.max(0, Math.min(255, data[px]     + noise));
			data[px + 1] = Math.max(0, Math.min(255, data[px + 1] + noise));
			data[px + 2] = Math.max(0, Math.min(255, data[px + 2] + noise));
		}
	}
}

function buildWatermarkSvg(width: number, height: number): Buffer {
	const minDim = Math.min(width, height);

	// ── Camada 1: micro-padrão M\ diagonal (quase textura) ───────────────────
	const microFs  = Math.max(10, Math.round(minDim * 0.016));
	const microTileW = Math.round(microFs * 3.2);
	const microTileH = Math.round(microFs * 3.8);

	// ── Camada 2: barra inferior com gradiente ────────────────────────────────
	const barH    = Math.round(minDim * 0.095);
	const barY    = height - barH;
	const barFont = Math.round(minDim * 0.024);
	const subFont = Math.round(barFont * 0.52);
	const lineY   = barY + Math.round(barH * 0.28); // linha decorativa fina

	// ── Camada 3: assinatura canto superior direito ───────────────────────────
	const sigFont = Math.round(minDim * 0.030);
	const sigX    = width  - Math.round(minDim * 0.04);
	const sigY    = Math.round(minDim * 0.06);
	const lineLen = Math.round(sigFont * 1.1);

	return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <!-- Micro-padrão M\ diagonal -->
    <pattern id="micro" x="0" y="0" width="${microTileW}" height="${microTileH}"
             patternUnits="userSpaceOnUse" patternTransform="rotate(-22) skewX(2)">
      <text x="2" y="${Math.round(microTileH * 0.78)}"
            fill="white" fill-opacity="0.10"
            font-size="${microFs}" font-family="Arial,Helvetica,sans-serif"
            font-weight="700">${SYMBOL}</text>
    </pattern>
    <!-- Gradiente barra inferior -->
    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="black" stop-opacity="0"/>
      <stop offset="55%"  stop-color="black" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.78"/>
    </linearGradient>
  </defs>

  <!-- CAMADA 1: micro-padrão textura M\ -->
  <rect width="${width}" height="${height}" fill="url(#micro)"/>

  <!-- CAMADA 2: gradiente + barra inferior -->
  <rect x="0" y="${barY}" width="${width}" height="${barH}" fill="url(#barGrad)"/>

  <!-- linha decorativa fina acima do texto -->
  <line x1="${Math.round(width * 0.08)}" y1="${lineY}"
        x2="${Math.round(width * 0.92)}" y2="${lineY}"
        stroke="white" stroke-opacity="0.20" stroke-width="0.5"/>

  <!-- nome da marca -->
  <text x="${width / 2}" y="${barY + Math.round(barH * 0.60)}"
        fill="white" fill-opacity="0.92"
        font-size="${barFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="700" text-anchor="middle" letter-spacing="10">${BRAND}</text>

  <!-- url abaixo -->
  <text x="${width / 2}" y="${barY + Math.round(barH * 0.84)}"
        fill="white" fill-opacity="0.45"
        font-size="${subFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="400" text-anchor="middle" letter-spacing="2">moveview.com.br</text>

  <!-- CAMADA 3: assinatura M\ canto superior direito -->
  <text x="${sigX}" y="${sigY}"
        fill="white" fill-opacity="0.28"
        font-size="${sigFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="700" text-anchor="end">${SYMBOL}</text>
  <!-- linha fina abaixo do símbolo -->
  <line x1="${sigX - lineLen}" y1="${sigY + Math.round(sigFont * 0.18)}"
        x2="${sigX}"           y2="${sigY + Math.round(sigFont * 0.18)}"
        stroke="white" stroke-opacity="0.18" stroke-width="0.8"/>
</svg>`);
}

async function _generateWatermarkedVersion(inputBuffer: Buffer): Promise<Buffer> {
	const meta   = await sharp(inputBuffer).metadata();
	const origW  = meta.width  ?? 1200;
	const origH  = meta.height ?? 900;

	// ── Hard cap — inutilizável para impressão mesmo sem marca d'água ─────────
	const targetW = Math.min(origW, WATERMARK_MAX_WIDTH);
	const targetH = Math.round((origH / origW) * targetW);

	const seed = imageSeed(inputBuffer);

	// ── Step 1: resize to preview dimensions ─────────────────────────────────
	const resized = await sharp(inputBuffer)
		.resize(targetW, targetH, { fit: 'inside' })
		.toBuffer();

	// ── Step 2: apply pixel-level noise to the raw buffer ────────────────────
	const { data, info } = await sharp(resized)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	applyPixelNoise(data, info.width, info.height, seed);

	// ── Step 3: composite SVG watermark layers ────────────────────────────────
	// Feed raw noised data directly into the composite pipeline (no intermediate toBuffer)
	const wmSvg = buildWatermarkSvg(info.width, info.height);

	return sharp(data, {
		raw: { width: info.width, height: info.height, channels: 4 }
	})
		.removeAlpha()
		.composite([{ input: wmSvg, gravity: 'center', blend: 'soft-light' }])
		.jpeg({ quality: 60, progressive: true })
		.toBuffer();
}

export function generateWatermarkedVersion(inputBuffer: Buffer): Promise<Buffer> {
	return _generateWatermarkedVersion(inputBuffer);
}

export async function processUploadedPhoto(inputBuffer: Buffer): Promise<{
	original: Buffer;
	watermarked: Buffer;
	width: number;
	height: number;
}> {
	const meta   = await sharp(inputBuffer).metadata();
	const width  = meta.width  ?? 0;
	const height = meta.height ?? 0;

	// Imagem já chegou comprimida pelo browser — só converte se não for JPEG
	const original = meta.format === 'jpeg'
		? inputBuffer
		: await sharp(inputBuffer).jpeg({ quality: 88 }).toBuffer();

	// Watermark sempre recalculado (resize para 900px — memória gerenciável)
	const watermarked = await generateWatermarkedVersion(inputBuffer);

	return { original, watermarked, width, height };
}
