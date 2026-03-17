<script lang="ts">
	import { page } from '$app/stores';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	const resetSuccess = $derived($page.url.searchParams.get('reset') === '1');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		loading = false;

		if (res.ok) {
			const next = $page.url.searchParams.get('next') || '/';
			window.location.href = next;
		} else {
			const data = await res.json().catch(() => ({}));
			error = data.error || 'Erro ao fazer login';
		}
	}
</script>

<svelte:head>
	<title>Entrar — Move View Photos</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-ambient" aria-hidden="true"></div>

	<div class="auth-card">
		<div class="auth-header">
			<a href="/" class="auth-logo-link">
				<img src="/logo/logo.png" alt="Move View Photos" class="logo-img" />
			</a>
			<h1>Bem-vindo de volta</h1>
			<p>Entre na sua conta para acessar suas fotos</p>
		</div>

		<form onsubmit={handleSubmit} class="auth-form">
			{#if resetSuccess}
				<div class="alert alert-success">
					<span class="alert-icon">✓</span>
					Senha redefinida com sucesso! Entre com a nova senha.
				</div>
			{/if}
			{#if error}
				<div class="alert alert-error">
					<span class="alert-icon">!</span>
					{error}
				</div>
			{/if}

			<div class="form-group">
				<label for="email">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					autocomplete="email"
					placeholder="seu@email.com"
				/>
			</div>

			<div class="form-group">
				<div class="label-row">
					<label for="password">Senha</label>
					<a href="/recuperar-senha" class="forgot-link">Esqueceu a senha?</a>
				</div>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					autocomplete="current-password"
					placeholder="••••••••"
				/>
			</div>

			<button type="submit" disabled={loading} class="btn-submit">
				{#if loading}
					<span class="spinner"></span>
					Entrando...
				{:else}
					Entrar
				{/if}
			</button>
		</form>

		<div class="auth-divider"></div>

		<p class="auth-footer">
			Não tem conta?
			<a href="/cadastro">Criar conta grátis</a>
		</p>
	</div>
</div>

<style>
	.auth-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px 20px;
		position: relative;
	}

	.auth-ambient {
		position: fixed;
		inset: 0;
		background:
			radial-gradient(ellipse 70% 50% at 50% -10%, rgba(61, 201, 13, 0.07) 0%, transparent 60%);
		pointer-events: none;
		z-index: 0;
	}

	.auth-card {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 420px;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 14px;
		padding: 48px;
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.03) inset,
			0 32px 80px rgba(0, 0, 0, 0.5);
	}

	.auth-header {
		text-align: center;
		margin-bottom: 36px;
	}

	.auth-logo-link {
		display: inline-block;
		margin-bottom: 28px;
	}

	.logo-img {
		height: 36px;
		width: auto;
		object-fit: contain;
		display: block;
		margin: 0 auto;
	}

	.auth-header h1 {
		font-size: 1.4rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		margin-bottom: 8px;
		color: var(--text-primary);
	}

	.auth-header p {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0;
		line-height: 1.5;
	}

	/* ── Alerts ─────────────────────────────────── */
	.alert {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 8px;
		font-size: 0.875rem;
		line-height: 1.5;
		margin-bottom: 4px;
	}

	.alert-icon {
		font-size: 0.75rem;
		font-weight: 800;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.alert-error {
		background: rgba(255, 68, 68, 0.08);
		border: 1px solid rgba(255, 68, 68, 0.2);
		color: #ff8080;
	}

	.alert-error .alert-icon {
		background: rgba(255, 68, 68, 0.2);
		color: #ff6b6b;
	}

	.alert-success {
		background: rgba(61, 201, 13, 0.06);
		border: 1px solid rgba(61, 201, 13, 0.2);
		color: var(--accent);
	}

	.alert-success .alert-icon {
		background: rgba(61, 201, 13, 0.15);
		color: var(--accent);
	}

	/* ── Form ───────────────────────────────────── */
	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}

	.form-group label {
		font-size: 0.825rem;
		font-weight: 500;
		color: var(--text-secondary);
		letter-spacing: 0.01em;
	}

	.form-group input {
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 13px 16px;
		color: var(--text-primary);
		font-size: 0.95rem;
		outline: none;
		transition: border-color 0.18s, box-shadow 0.18s;
		width: 100%;
		box-sizing: border-box;
		font-family: var(--font-body);
	}

	.form-group input::placeholder {
		color: var(--text-muted);
		opacity: 0.6;
	}

	.form-group input:hover {
		border-color: var(--border-bright);
	}

	.form-group input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.forgot-link {
		font-size: 0.78rem;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.18s;
	}

	.forgot-link:hover {
		color: var(--accent);
	}

	/* ── Submit button ───────────────────────────── */
	.btn-submit {
		background: var(--accent);
		color: #050507;
		border: none;
		border-radius: 8px;
		padding: 14px 20px;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		width: 100%;
		font-family: var(--font-body);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 6px;
		transition: background 0.18s, box-shadow 0.18s, transform 0.15s;
		letter-spacing: -0.01em;
	}

	.btn-submit:hover:not(:disabled) {
		background: var(--accent-hover);
		box-shadow: 0 0 28px var(--accent-glow);
		transform: translateY(-1px);
	}

	.btn-submit:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-submit:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(5, 5, 7, 0.3);
		border-top-color: #050507;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	/* ── Footer ─────────────────────────────────── */
	.auth-divider {
		height: 1px;
		background: var(--border-color);
		margin: 28px 0 20px;
	}

	.auth-footer {
		text-align: center;
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.auth-footer a {
		color: var(--text-secondary);
		font-weight: 500;
		text-decoration: none;
		transition: color 0.18s;
	}

	.auth-footer a:hover {
		color: var(--accent);
	}

	@media (max-width: 480px) {
		.auth-card { padding: 36px 28px; }
	}
</style>
