import { RESEND_API_KEY, EMAIL_FROM } from '$env/static/private';
import { PUBLIC_APP_URL, PUBLIC_APP_NAME } from '$env/static/public';

const ACCENT = '#3DC90D';
const BG = '#0a0a0f';
const CARD = '#121218';
const TEXT = '#e0e0ee';
const MUTED = '#888899';

function emailLayout(appName: string, bodyHtml: string): string {
	return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;color:${TEXT}; }
    a { color:${ACCENT}; }
    .wrap { max-width:580px;margin:0 auto;padding:32px 16px; }
    .card { background:${CARD};border-radius:12px;overflow:hidden;border:1px solid #1e1e2a; }
    .header { background:linear-gradient(135deg,#0d1a0a 0%,#0e200a 100%);border-bottom:1px solid ${ACCENT}22;padding:24px 32px; }
    .logo-text { font-size:19px;font-weight:900;letter-spacing:-0.5px; }
    .logo-move { color:#c0c0d0; }
    .logo-view { color:${ACCENT}; }
    .body { padding:32px; }
    .body h2 { color:#fff;margin:0 0 12px;font-size:19px; }
    .body p { color:${MUTED};line-height:1.65;margin:0 0 14px;font-size:14px; }
    .body p strong { color:${TEXT}; }
    .btn { display:inline-block;background:${ACCENT};color:#050507 !important;text-decoration:none;padding:13px 28px;border-radius:7px;font-weight:700;font-size:15px;margin:8px 0 20px; }
    .divider { height:1px;background:#1e1e2a;margin:20px 0; }
    .footer { padding:16px 32px;text-align:center; }
    .footer p { color:#555566;font-size:11px;margin:0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <span class="logo-text"><span class="logo-move">MOVE</span> <span class="logo-view">VIEW</span></span>
      </div>
      <div class="body">${bodyHtml}</div>
      <div class="footer"><p>${appName} — Fotografias esportivas profissionais</p></div>
    </div>
  </div>
</body>
</html>`;
}

function isMockMode(): boolean {
	return !RESEND_API_KEY || RESEND_API_KEY === 'resend_placeholder';
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
	if (isMockMode()) {
		console.log(`[Email] Mock: to=${to} | subject="${subject}"`);
		return;
	}

	const { Resend } = await import('resend');
	const resend = new Resend(RESEND_API_KEY);

	const from = EMAIL_FROM || 'Move View Photos <noreply@resend.dev>';

	const { error } = await resend.emails.send({ from, to, subject, html });

	if (error) {
		console.error('[Email] Resend error:', error);
		throw new Error(`Falha ao enviar email: ${error.message}`);
	}
}

export async function sendPasswordResetEmail(
	name: string,
	email: string,
	resetUrl: string,
	appName: string
): Promise<void> {
	const body = `
    <h2>Redefinir sua senha</h2>
    <p>Olá, <strong>${name}</strong>!</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
    <a href="${resetUrl}" class="btn">Redefinir senha</a>
    <div class="divider"></div>
    <p>Este link é válido por <strong>1 hora</strong>. Se você não solicitou esta ação, ignore este e-mail — sua conta está segura.</p>
  `;

	await sendEmail(email, `Redefinir senha — ${appName}`, emailLayout(appName, body));
}

export async function sendDownloadEmail(userId: string, orderId: string): Promise<void> {
	const appName = PUBLIC_APP_NAME || 'Move View Photos';
	const appUrl = PUBLIC_APP_URL || 'http://localhost:5173';

	const { db, schema } = await import('../db/index.js');
	const { eq } = await import('drizzle-orm');

	const user = await db
		.select({ name: schema.users.name, email: schema.users.email })
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.limit(1)
		.then((r) => r[0]);

	if (!user) return;

	const body = `
    <h2>Pagamento confirmado, ${user.name}!</h2>
    <p>Seu pedido <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> foi processado com sucesso. Suas fotos já estão disponíveis para download em alta resolução.</p>
    <a href="${appUrl}/minhas-fotos" class="btn">Ver Minhas Fotos</a>
    <div class="divider"></div>
    <p>As fotos originais ficam disponíveis indefinidamente na sua conta.</p>
  `;

	await sendEmail(user.email, `Suas fotos estão prontas — ${appName}`, emailLayout(appName, body));
}

export async function sendWelcomeEmail(name: string, email: string): Promise<void> {
	const appName = PUBLIC_APP_NAME || 'Move View Photos';
	const appUrl = PUBLIC_APP_URL || 'http://localhost:5173';

	const body = `
    <h2>Bem-vindo, ${name}!</h2>
    <p>Sua conta no <strong>${appName}</strong> foi criada com sucesso. Agora você pode encontrar e comprar suas fotos de eventos esportivos.</p>
    <a href="${appUrl}" class="btn">Explorar eventos</a>
    <div class="divider"></div>
    <p>Com sua conta você pode comprar fotos em alta resolução e acessá-las a qualquer momento em "Minhas Fotos".</p>
  `;

	await sendEmail(email, `Bem-vindo ao ${appName}!`, emailLayout(appName, body));
}
