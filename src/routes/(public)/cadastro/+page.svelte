<script lang="ts">
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		const name = `${firstName.trim()} ${lastName.trim()}`;

		const res = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, email, password })
		});

		loading = false;

		if (res.ok) {
			window.location.href = '/';
		} else {
			const data = await res.json().catch(() => ({}));
			error = data.error || 'Erro ao criar conta';
		}
	}
</script>

<svelte:head>
	<title>Criar Conta — Move View Photos</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-ambient" aria-hidden="true"></div>

	<div class="auth-card">
		<div class="auth-header">
			<a href="/" class="auth-logo-link">
				<img src="/logo/logo.png" alt="Move View Photos" class="logo-img" />
			</a>
			<h1>Criar conta grátis</h1>
			<p>Encontre e salve suas fotos esportivas</p>
		</div>

		<form onsubmit={handleSubmit} class="auth-form">
			{#if error}
				<div class="alert alert-error">
					<span class="alert-icon">!</span>
					{error}
				</div>
			{/if}

			<div class="name-row">
				<div class="form-group">
					<label for="firstName">Nome</label>
					<input
						id="firstName"
						type="text"
						bind:value={firstName}
						required
						autocomplete="given-name"
						placeholder="João"
					/>
				</div>
				<div class="form-group">
					<label for="lastName">Sobrenome</label>
					<input
						id="lastName"
						type="text"
						bind:value={lastName}
						required
						autocomplete="family-name"
						placeholder="Silva"
					/>
				</div>
			</div>

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
				<label for="password">
					Senha
					<span class="label-hint">mín. 8 caracteres</span>
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					minlength="8"
					autocomplete="new-password"
					placeholder="••••••••"
				/>
			</div>

			<button type="submit" disabled={loading} class="btn-submit">
				{#if loading}
					<span class="spinner"></span>
					Criando conta...
				{:else}
					Criar conta
				{/if}
			</button>

			<p class="terms-note">
				Ao criar uma conta, você concorda com nossos
				<a href="/termos">Termos de Uso</a> e
				<a href="/privacidade">Política de Privacidade</a>.
			</p>
		</form>

		<div class="auth-divider"></div>

		<p class="auth-footer">
			Já tem conta?
			<a href="/login">Entrar</a>
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
		max-width: 440px;
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
	}

	/* ── Alert ───────────────────────────────────── */
	.alert {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 8px;
		font-size: 0.875rem;
		line-height: 1.5;
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

	/* ── Form ───────────────────────────────────── */
	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.name-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
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
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.label-hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-weight: 400;
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

	/* ── Submit ─────────────────────────────────── */
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
		margin-top: 2px;
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

	.terms-note {
		font-size: 0.775rem;
		color: var(--text-muted);
		text-align: center;
		line-height: 1.6;
		margin: 0;
	}

	.terms-note a {
		color: var(--text-secondary);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.18s;
	}

	.terms-note a:hover {
		color: var(--accent);
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
		.name-row { grid-template-columns: 1fr; gap: 18px; }
	}
</style>
