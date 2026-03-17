<script lang="ts">
	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let errorMsg = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		errorMsg = '';

		const res = await fetch('/api/auth/reset-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'request', email })
		});

		loading = false;

		if (res.ok) {
			sent = true;
		} else {
			const data = await res.json().catch(() => ({}));
			errorMsg = data.message || 'Erro ao enviar email';
		}
	}
</script>

<svelte:head>
	<title>Recuperar senha — Move View Photos</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-ambient" aria-hidden="true"></div>

	<div class="auth-card">
		<div class="auth-header">
			<a href="/" class="auth-logo-link">
				<img src="/logo/logo.png" alt="Move View Photos" class="logo-img" />
			</a>
			<h1>Recuperar senha</h1>
			<p>Enviaremos um link para redefinir sua senha</p>
		</div>

		{#if sent}
			<div class="success-state">
				<div class="success-icon">
					<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
						<path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
					</svg>
				</div>
				<h2>Verifique seu email</h2>
				<p>Se <strong>{email}</strong> estiver cadastrado, você receberá o link em instantes.</p>
				<p class="hint">Verifique também a caixa de spam.</p>
				<a href="/login" class="btn-back">Voltar ao login</a>
			</div>
		{:else}
			<form onsubmit={handleSubmit} class="auth-form">
				{#if errorMsg}
					<div class="alert alert-error">
						<span class="alert-icon">!</span>
						{errorMsg}
					</div>
				{/if}

				<div class="form-group">
					<label for="email">Email da conta</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						placeholder="seu@email.com"
					/>
				</div>

				<button type="submit" disabled={loading} class="btn-submit">
					{#if loading}
						<span class="spinner"></span>
						Enviando...
					{:else}
						Enviar link de recuperação
					{/if}
				</button>
			</form>

			<div class="auth-divider"></div>
			<p class="auth-footer">Lembrou a senha? <a href="/login">Entrar</a></p>
		{/if}
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
		background: radial-gradient(ellipse 70% 50% at 50% -10%, rgba(61,201,13,0.07) 0%, transparent 60%);
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
		box-shadow: 0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 80px rgba(0,0,0,0.5);
	}
	.auth-header { text-align: center; margin-bottom: 36px; }
	.auth-logo-link { display: inline-block; margin-bottom: 28px; }
	.logo-img { height: 36px; width: auto; object-fit: contain; display: block; margin: 0 auto; }
	.auth-header h1 { font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; color: var(--text-primary); }
	.auth-header p { color: var(--text-muted); font-size: 0.875rem; margin: 0; line-height: 1.5; }

	.auth-form { display: flex; flex-direction: column; gap: 18px; }
	.form-group { display: flex; flex-direction: column; gap: 7px; }
	.form-group label { font-size: 0.825rem; font-weight: 500; color: var(--text-secondary); }
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
	.form-group input::placeholder { color: var(--text-muted); opacity: 0.6; }
	.form-group input:hover { border-color: var(--border-bright); }
	.form-group input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }

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
	}
	.btn-submit:hover:not(:disabled) { background: var(--accent-hover); box-shadow: 0 0 28px var(--accent-glow); transform: translateY(-1px); }
	.btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }
	.spinner { width: 14px; height: 14px; border: 2px solid rgba(5,5,7,0.3); border-top-color: #050507; border-radius: 50%; animation: spin 0.7s linear infinite; }

	.alert { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 0.875rem; line-height: 1.5; }
	.alert-icon { font-size: 0.75rem; font-weight: 800; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
	.alert-error { background: rgba(255,68,68,0.08); border: 1px solid rgba(255,68,68,0.2); color: #ff8080; }
	.alert-error .alert-icon { background: rgba(255,68,68,0.2); color: #ff6b6b; }

	.success-state { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
	.success-icon {
		width: 64px; height: 64px;
		border-radius: 50%;
		background: rgba(61,201,13,0.08);
		border: 1px solid rgba(61,201,13,0.22);
		display: flex; align-items: center; justify-content: center;
		color: var(--accent);
		margin-bottom: 4px;
	}
	.success-state h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
	.success-state p { color: var(--text-muted); font-size: 0.875rem; line-height: 1.6; margin: 0; }
	.success-state p strong { color: var(--text-primary); }
	.hint { opacity: 0.7; }
	.btn-back {
		display: inline-block;
		margin-top: 6px;
		padding: 12px 28px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: border-color 0.18s, color 0.18s;
	}
	.btn-back:hover { border-color: var(--border-bright); color: var(--text-primary); }

	.auth-divider { height: 1px; background: var(--border-color); margin: 28px 0 20px; }
	.auth-footer { text-align: center; color: var(--text-muted); font-size: 0.875rem; margin: 0; }
	.auth-footer a { color: var(--text-secondary); font-weight: 500; text-decoration: none; transition: color 0.18s; }
	.auth-footer a:hover { color: var(--accent); }

	@media (max-width: 480px) { .auth-card { padding: 36px 28px; } }
</style>
