import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';
import { WATERMARK_MAX_WIDTH } from '$lib/constants.js';

// Desativa cache do libvips para liberar memória entre processamentos
sharp.cache(false);
// Permite até 4 threads do libvips em paralelo
sharp.concurrency(4);

// Logo embeded as base64 (carregado uma vez no startup)
let LOGO_B64 = '';
try {
	const logoPath = join(process.cwd(), 'static', 'logo', 'logo.png');
	LOGO_B64 = readFileSync(logoPath).toString('base64');
} catch {
	// logo não encontrada — watermark continua sem ela
}

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

	// ── Dimensões base ────────────────────────────────────────────────────────
	const margin  = Math.round(minDim * 0.04);   // margem das bordas
	const corner  = Math.round(minDim * 0.07);   // tamanho do L de canto
	const stroke  = Math.max(1.5, minDim * 0.002);

	// ── Fontes ────────────────────────────────────────────────────────────────
	const urlFont    = Math.max(13, Math.round(minDim * 0.022));
	const sideFont   = Math.max(11, Math.round(minDim * 0.018));
	const badgeSize  = Math.round(minDim * 0.08);
	const legalFont  = Math.max(10, Math.round(minDim * 0.016));

	// ── Logo + texto legal (canto inferior esquerdo) ─────────────────────────
	const badgeX  = Math.round(width  * 0.05);
	const badgeY  = Math.round(height * 0.74);
	// Logo proporção 266:184 ≈ 1.446:1
	const logoH   = Math.round(badgeSize * 1.2);
	const logoW   = Math.round(logoH * 266 / 184);
	const legalX  = badgeX + logoW + Math.round(minDim * 0.02);
	const legalLH = Math.round(legalFont * 1.5);

	// ── Texto lateral (vertical) ──────────────────────────────────────────────
	const sideY  = Math.round(height * 0.5);
	const sideXL = Math.round(width  * 0.025);
	const sideXR = Math.round(width  * 0.975);

	return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">

  <!-- ── CANTOS: marcas de recorte ── -->
  <!-- topo esquerdo -->
  <line x1="${margin}" y1="${margin}" x2="${margin + corner}" y2="${margin}"
        stroke="white" stroke-opacity="0.70" stroke-width="${stroke}"/>
  <line x1="${margin}" y1="${margin}" x2="${margin}" y2="${margin + corner}"
        stroke="white" stroke-opacity="0.70" stroke-width="${stroke}"/>
  <!-- topo direito -->
  <line x1="${width - margin}" y1="${margin}" x2="${width - margin - corner}" y2="${margin}"
        stroke="white" stroke-opacity="0.70" stroke-width="${stroke}"/>
  <line x1="${width - margin}" y1="${margin}" x2="${width - margin}" y2="${margin + corner}"
        stroke="white" stroke-opacity="0.70" stroke-width="${stroke}"/>
  <!-- baixo esquerdo -->
  <line x1="${margin}" y1="${height - margin}" x2="${margin + corner}" y2="${height - margin}"
        stroke="white" stroke-opacity="0.70" stroke-width="${stroke}"/>
  <line x1="${margin}" y1="${height - margin}" x2="${margin}" y2="${height - margin - corner}"
        stroke="white" stroke-opacity="0.70" stroke-width="${stroke}"/>
  <!-- baixo direito -->
  <line x1="${width - margin}" y1="${height - margin}" x2="${width - margin - corner}" y2="${height - margin}"
        stroke="white" stroke-opacity="0.70" stroke-width="${stroke}"/>
  <line x1="${width - margin}" y1="${height - margin}" x2="${width - margin}" y2="${height - margin - corner}"
        stroke="white" stroke-opacity="0.70" stroke-width="${stroke}"/>

  <!-- ── URL TOPO ── -->
  <text x="${cx}" y="${margin + Math.round(urlFont * 1.2)}"
        fill="white" fill-opacity="0.65"
        font-size="${urlFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="600" text-anchor="middle" letter-spacing="3">moveview.com.br</text>

  <!-- ── TEXTO LATERAL ESQUERDO (vertical) ── -->
  <text transform="translate(${sideXL},${sideY}) rotate(-90)"
        fill="white" fill-opacity="0.30"
        font-size="${sideFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="700" text-anchor="middle" letter-spacing="4">MOVE VIEW PHOTOS</text>

  <!-- ── TEXTO LATERAL DIREITO (vertical) ── -->
  <text transform="translate(${sideXR},${sideY}) rotate(90)"
        fill="white" fill-opacity="0.30"
        font-size="${sideFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="700" text-anchor="middle" letter-spacing="4">moveview.com.br</text>

  <!-- ── LOGO ── -->
  ${LOGO_B64 ? `<image href="data:image/png;base64,${LOGO_B64}"
        x="${badgeX}" y="${badgeY}" width="${logoW}" height="${logoH}"
        preserveAspectRatio="xMidYMid meet" opacity="0.90"/>` : ''}

  <!-- ── TEXTO LEGAL ao lado da logo ── -->
  <text x="${legalX}" y="${badgeY + legalLH * 1}"
        fill="white" fill-opacity="0.80"
        font-size="${legalFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="700">PROTEGIDA PELA LEI</text>
  <text x="${legalX}" y="${badgeY + legalLH * 2}"
        fill="white" fill-opacity="0.80"
        font-size="${legalFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="700">DE DIREITOS AUTORAIS:</text>
  <text x="${legalX}" y="${badgeY + legalLH * 3}"
        fill="white" fill-opacity="0.80"
        font-size="${legalFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="700">PROIBIDA A REPRODUCAO</text>
  <text x="${legalX}" y="${badgeY + legalLH * 4}"
        fill="#4ade80" fill-opacity="0.90"
        font-size="${legalFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="700">MOVEVIEW.COM.BR</text>

  <!-- ── URL RODAPÉ ── -->
  <text x="${cx}" y="${height - margin - Math.round(urlFont * 0.3)}"
        fill="white" fill-opacity="0.65"
        font-size="${urlFont}" font-family="Arial,Helvetica,sans-serif"
        font-weight="600" text-anchor="middle" letter-spacing="3">moveview.com.br</text>

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
	const wmSvg = buildWatermarkSvg(info.width, info.height);

	try {
		return await sharp(data, {
			raw: { width: info.width, height: info.height, channels: 4 }
		})
			.removeAlpha()
			.composite([{ input: wmSvg, gravity: 'center', blend: 'over' }])
			.jpeg({ quality: 60, progressive: true })
			.toBuffer();
	} catch (e) {
		console.error('[Watermark] SVG composite failed:', e);
		// fallback: retorna sem marca d'água mas não quebra o upload
		return sharp(data, {
			raw: { width: info.width, height: info.height, channels: 4 }
		})
			.removeAlpha()
			.jpeg({ quality: 60, progressive: true })
			.toBuffer();
	}
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
