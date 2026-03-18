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
	const cx = width  / 2;
	const cy = height / 2;

	// ── Micro-padrão M\ (fundo denso) ────────────────────────────────────────
	const mFs = Math.max(11, Math.round(minDim * 0.018));
	const mTW = Math.round(mFs * 3.0);
	const mTH = Math.round(mFs * 3.5);

	// ── Linha de símbolos M\ superior e inferior ──────────────────────────────
	const rowFs  = Math.max(16, Math.round(minDim * 0.028));
	const rowY1  = Math.round(height * 0.12);
	const rowY2  = Math.round(height * 0.88);
	const rowGap = Math.round(width  * 0.22);
	const rowPositions = [
		Math.round(width * 0.10),
		Math.round(width * 0.10) + rowGap,
		Math.round(width * 0.10) + rowGap * 2,
		Math.round(width * 0.10) + rowGap * 3,
	];

	// ── Caixa central ─────────────────────────────────────────────────────────
	const boxW  = Math.round(width  * 0.38);
	const boxH  = Math.round(minDim * 0.14);
	const boxX  = cx - boxW / 2;
	const boxY  = cy - boxH / 2;
	const bFont = Math.round(minDim * 0.038);
	const bSub  = Math.round(bFont  * 0.42);
	// bordas levemente orgânicas (imperfeitas — impossível de reconstruir por inpainting)
	const d = 1.2; // variação em px
	const boxPath = `M${boxX+d},${boxY-d} L${boxX+boxW+d},${boxY+d} L${boxX+boxW-d},${boxY+boxH+d} L${boxX-d},${boxY+boxH-d} Z`;

	// ── Barra inferior sólida ─────────────────────────────────────────────────
	const barH    = Math.round(minDim * 0.085);
	const barY    = height - barH;
	const barFont = Math.round(minDim * 0.022);
	const barSub  = Math.round(barFont * 0.50);

	// ── Linhas diagonais extras (anti-crop) ───────────────────────────────────
	const diagLen = Math.round(Math.sqrt(width * width + height * height));

	const rowSymbols = rowPositions.map(x =>
		`<text x="${x}" y="%Y" fill="white" fill-opacity="0.22"
		       font-size="${rowFs}" font-family="Arial,Helvetica,sans-serif"
		       font-weight="700" letter-spacing="2">${SYMBOL}</text>`
	).join('');

	return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="micro" x="0" y="0" width="${mTW}" height="${mTH}"
             patternUnits="userSpaceOnUse" patternTransform="rotate(-20) skewX(1.5)">
      <text x="1" y="${Math.round(mTH * 0.80)}"
            fill="white" fill-opacity="0.12"
            font-size="${mFs}" font-family="Arial,Helvetica,sans-serif"
            font-weight="700">${SYMBOL}</text>
    </pattern>
    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="black" stop-opacity="0"/>
      <stop offset="45%"  stop-color="black" stop-opacity="0.60"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.85"/>
    </linearGradient>
  </defs>

  <!-- CAMADA 1: micro-padrão M\ textura densa -->
  <rect width="${width}" height="${height}" fill="url(#micro)"/>

  <!-- CAMADA 2: linhas diagonais finas anti-crop -->
  <line x1="${cx - diagLen}" y1="${cy}" x2="${cx + diagLen}" y2="${cy}"
        stroke="white" stroke-opacity="0.06" stroke-width="0.8"
        transform="rotate(-30 ${cx} ${cy})"/>
  <line x1="${cx - diagLen}" y1="${cy}" x2="${cx + diagLen}" y2="${cy}"
        stroke="white" stroke-opacity="0.06" stroke-width="0.8"
        transform="rotate(30 ${cx} ${cy})"/>

  <!-- CAMADA 3: linha superior M\ M\ M\ M\ -->
  ${rowSymbols.replace(/%Y/g, String(rowY1))}

  <!-- CAMADA 4: caixa central com bordas orgânicas -->
  <path d="${boxPath}" fill="black" fill-opacity="0.42" stroke="white" stroke-opacity="0.30" stroke-width="0.8"/>
  <text x="${cx}" y="${cy - Math.round(bFont * 0.10)}"
        fill="white" fill-opacity="0.88"
        font-size="${bFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="800" text-anchor="middle" letter-spacing="6">MOVE VIEW</text>
  <text x="${cx}" y="${cy + Math.round(bFont * 0.95)}"
        fill="white" fill-opacity="0.65"
        font-size="${bSub}" font-family="Arial,Helvetica,sans-serif"
        font-weight="400" text-anchor="middle" letter-spacing="10">PHOTOS</text>

  <!-- CAMADA 5: linha inferior M\ M\ M\ M\ -->
  ${rowSymbols.replace(/%Y/g, String(rowY2))}

  <!-- CAMADA 6: barra inferior -->
  <rect x="0" y="${barY}" width="${width}" height="${barH}" fill="url(#barGrad)"/>
  <line x1="${Math.round(width*0.06)}" y1="${barY + Math.round(barH*0.28)}"
        x2="${Math.round(width*0.94)}" y2="${barY + Math.round(barH*0.28)}"
        stroke="white" stroke-opacity="0.15" stroke-width="0.5"/>
  <text x="${cx}" y="${barY + Math.round(barH*0.64)}"
        fill="white" fill-opacity="0.90"
        font-size="${barFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="700" text-anchor="middle" letter-spacing="8">${BRAND}</text>
  <text x="${cx}" y="${barY + Math.round(barH*0.88)}"
        fill="white" fill-opacity="0.40"
        font-size="${barSub}" font-family="Arial,Helvetica,sans-serif"
        font-weight="400" text-anchor="middle" letter-spacing="3">moveview.com.br</text>
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
