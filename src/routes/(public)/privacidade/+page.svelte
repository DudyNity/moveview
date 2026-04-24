<svelte:head>
	<title>Política de Privacidade — Move View Photos</title>
	<meta name="description" content="Política de privacidade da Move View Photos — como coletamos, usamos e protegemos seus dados." />
</svelte:head>

<div class="legal-page">
	<div class="legal-container">
		<h1>Política de Privacidade</h1>
		<p class="last-updated">Última atualização: Janeiro de 2025</p>

		<section>
			<h2>1. Informações que coletamos</h2>
			<p>
				Ao criar uma conta na Move View Photos, coletamos seu nome e endereço de e-mail. Ao realizar uma
				compra, os dados de pagamento são processados diretamente pelo Stripe — não armazenamos
				informações de cartão de crédito em nossos servidores.
			</p>
			<p>
				Registramos automaticamente dados de uso como endereço IP, tipo de navegador e páginas
				visitadas para fins de segurança e melhoria do serviço.
			</p>
		</section>

		<section>
			<h2>2. Como usamos suas informações</h2>
			<ul>
				<li>Para criar e gerenciar sua conta</li>
				<li>Para processar pedidos e liberar downloads das fotos adquiridas</li>
				<li>Para enviar confirmações de compra e links de download por e-mail</li>
				<li>Para prevenir fraudes e garantir a segurança da plataforma</li>
				<li>Para melhorar nossos serviços com base em dados de uso agregados</li>
			</ul>
		</section>

		<section>
			<h2>3. Compartilhamento de dados</h2>
			<p>
				Não vendemos nem compartilhamos seus dados pessoais com terceiros, exceto com prestadores de
				serviço essenciais para o funcionamento da plataforma:
			</p>
			<ul>
				<li><strong>Stripe</strong> — processamento de pagamentos</li>
				<li><strong>Resend</strong> — envio de e-mails transacionais</li>
				<li><strong>Cloudflare</strong> — armazenamento de imagens e CDN</li>
			</ul>
		</section>

		<section>
			<h2>4. Segurança das fotos</h2>
			<p>
				As fotos originais são armazenadas em bucket privado com acesso restrito. Downloads são
				realizados apenas via URLs assinadas com validade de 10 minutos, geradas exclusivamente para
				usuários que realizaram a compra. Registramos todos os downloads com timestamp e endereço IP
				para auditoria e controle de acesso.
			</p>
		</section>

		<section>
			<h2>5. Seus direitos</h2>
			<p>Você tem direito a:</p>
			<ul>
				<li>Acessar os dados pessoais que mantemos sobre você</li>
				<li>Corrigir dados incorretos ou desatualizados</li>
				<li>Solicitar a exclusão da sua conta e dados associados</li>
				<li>Exportar seus dados em formato portável</li>
			</ul>
			<p>Para exercer esses direitos, entre em contato pelo e-mail abaixo.</p>
		</section>

		<section>
			<h2>6. Cookies</h2>
			<p>
				Utilizamos apenas cookies essenciais para manter sua sessão autenticada. Não usamos cookies
				de rastreamento ou publicidade de terceiros.
			</p>
		</section>

		<section>
			<h2>7. Contato</h2>
			<p>
				Para dúvidas sobre esta política ou para exercer seus direitos, entre em contato:
				<strong>privacidade@moveview.com.br</strong>
			</p>
		</section>
	</div>
</div>

<style>
	.legal-page {
		padding: 48px 24px;
	}

	.legal-container {
		max-width: 760px;
		margin: 0 auto;
	}

	h1 {
		font-size: 2rem;
		font-weight: 800;
		margin-bottom: 8px;
	}

	.last-updated {
		color: var(--text-muted);
		font-size: 0.85rem;
		margin-bottom: 40px;
	}

	section {
		margin-bottom: 36px;
	}

	h2 {
		font-size: 1.1rem;
		font-weight: 700;
		margin-bottom: 12px;
		color: var(--text-primary);
	}

	p {
		color: var(--text-secondary);
		line-height: 1.7;
		margin-bottom: 12px;
	}

	ul {
		color: var(--text-secondary);
		line-height: 1.7;
		padding-left: 20px;
		margin-bottom: 12px;
	}

	li {
		margin-bottom: 6px;
	}

	strong {
		color: var(--text-primary);
		font-weight: 600;
	}
</style>
