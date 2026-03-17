<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status === 404 ? 'Página não encontrada' : 'Erro'} — Move View Photos</title>
</svelte:head>

<div class="error-page">
	<div class="error-content">
		<div class="error-code">{$page.status}</div>
		<h1 class="error-title">
			{#if $page.status === 404}
				Página não encontrada
			{:else if $page.status === 403}
				Acesso negado
			{:else}
				Algo deu errado
			{/if}
		</h1>
		<p class="error-desc">
			{#if $page.status === 404}
				A página que você procura não existe ou foi removida.
			{:else if $page.status === 403}
				Você não tem permissão para acessar este recurso.
			{:else}
				{$page.error?.message || 'Ocorreu um erro inesperado. Tente novamente.'}
			{/if}
		</p>
		<div class="error-actions">
			<a href="/" class="btn-home">← Voltar ao início</a>
		</div>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		background: var(--bg-base, #050507);
	}

	.error-content {
		text-align: center;
		max-width: 480px;
	}

	.error-code {
		font-size: clamp(5rem, 18vw, 9rem);
		font-weight: 900;
		font-family: 'Space Grotesk', sans-serif;
		letter-spacing: -0.05em;
		line-height: 1;
		background: linear-gradient(135deg, #3DC90D 0%, rgba(61,201,13,0.3) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 12px;
	}

	.error-title {
		font-size: clamp(1.3rem, 4vw, 1.8rem);
		font-weight: 800;
		color: #eeeef2;
		margin-bottom: 12px;
		font-family: 'Space Grotesk', sans-serif;
	}

	.error-desc {
		color: #62627a;
		font-size: 1rem;
		line-height: 1.6;
		margin-bottom: 36px;
	}

	.btn-home {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: #3DC90D;
		color: #050507;
		text-decoration: none;
		padding: 12px 28px;
		border-radius: 7px;
		font-weight: 700;
		font-size: 0.95rem;
		transition: opacity 0.2s;
	}

	.btn-home:hover { opacity: 0.85; }
</style>
