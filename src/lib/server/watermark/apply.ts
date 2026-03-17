import sharp from 'sharp';
import { WATERMARK_MAX_WIDTH } from '$lib/constants.js';

// Desativa cache do libvips para liberar memória entre processamentos
sharp.cache(false);
// Permite até 4 threads do libvips em paralelo
sharp.concurrency(4);

const BRAND = 'MOVE VIEW PHOTOS';

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

function buildWatermarkSvg(width: number, height: number, seed: number): Buffer {
	const rand = prng(seed ^ 0xabcdef);
	const cx = width / 2;
	const cy = height / 2;
	const minDim = Math.min(width, height);

	// ── Diagonal text grid (-30°) ─────────────────────────────────────────────
	const fs = Math.max(14, Math.round(minDim * 0.022));
	const tw = BRAND.length * fs * 0.62 + 48;
	const th = fs * 5.5;
	let tiles = '';
	for (let row = -4; row <= Math.ceil(height / th) + 4; row++) {
		for (let col = -4; col <= Math.ceil(width / tw) + 4; col++) {
			const x = col * tw + (row & 1 ? tw * 0.5 : 0);
			const y = row * th;
			const op = (0.22 + rand() * 0.06).toFixed(3);
			tiles += `<text x="${x}" y="${y}" opacity="${op}" fill="white" font-size="${fs}" font-family="Arial,sans-serif" font-weight="700" letter-spacing="3">${BRAND}</text>`;
		}
	}

	// ── Bottom bar ────────────────────────────────────────────────────────────
	const barH = Math.round(minDim * 0.055);
	const barY = height - barH;
	const barFont = Math.round(barH * 0.40);
	const bar = `
		<rect x="0" y="${barY}" width="${width}" height="${barH}" fill="black" opacity="0.50"/>
		<text x="${width/2}" y="${barY + barH*0.68}" fill="white" opacity="0.80" font-size="${barFont}"
		      font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" letter-spacing="6">${BRAND}</text>
	`;

	return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
		<g transform="rotate(-30,${cx},${cy})">${tiles}</g>
		${bar}
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
	const wmSvg = buildWatermarkSvg(info.width, info.height, seed);

	return sharp(data, {
		raw: { width: info.width, height: info.height, channels: 4 }
	})
		.removeAlpha()
		.composite([{ input: wmSvg, gravity: 'center', blend: 'over' }])
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

	// Comprime o original para JPEG 88% — reduz tamanho do upload sem perda visível.
	// Para TIFF/PNG/WebP converte também.
	const maxOriginalW = 3000; // cap de 3000px de largura para originais
	const needsResize = (meta.width ?? 0) > maxOriginalW;
	const originalPipeline = sharp(inputBuffer);
	if (needsResize) originalPipeline.resize(maxOriginalW, undefined, { fit: 'inside', withoutEnlargement: true });
	const original = await originalPipeline.jpeg({ quality: 88, progressive: true }).toBuffer();

	// Watermark sempre recalculado (resize para 900px — memória gerenciável)
	const watermarked = await generateWatermarkedVersion(inputBuffer);

	return { original, watermarked, width, height };
}
