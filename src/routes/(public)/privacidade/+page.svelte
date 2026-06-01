<svelte:head>
	<title>Política de Privacidade — Move View Photos</title>
	<meta name="description" content="Política de privacidade da Move View Photos — como coletamos, usamos e protegemos seus dados." />
</svelte:head>

<div class="legal-page">
	<div class="legal-container">
		<h1>Política de Privacidade</h1>
		<p class="last-updated">Última atualização: Junho de 2025</p>

		<p class="intro">
			A Move View Photos está comprometida com a proteção dos seus dados pessoais e com o cumprimento
			da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Esta política descreve quais
			dados coletamos, como os utilizamos e quais são os seus direitos.
		</p>

		<section>
			<h2>1. Dados que coletamos</h2>
			<p>
				Ao criar uma conta, coletamos seu nome e endereço de e-mail. Ao realizar uma compra, os dados
				de pagamento são processados diretamente pelo <strong>Mercado Pago</strong> — não armazenamos
				informações de cartão de crédito ou dados bancários em nossos servidores.
			</p>
			<p>
				Registramos automaticamente dados técnicos como endereço IP e tipo de navegador para fins de
				segurança e prevenção de fraudes.
			</p>
		</section>

		<section>
			<h2>2. Compartilhamento de dados</h2>
			<p>
				Não vendemos nem compartilhamos seus dados pessoais com terceiros, exceto com os seguintes
				prestadores de serviço essenciais para o funcionamento da plataforma, cada um sujeito à sua
				própria política de privacidade:
			</p>
			<ul>
				<li><strong>Mercado Pago</strong> — processamento seguro de pagamentos</li>
				<li><strong>Resend</strong> — envio de e-mails transacionais (confirmações de compra e downloads)</li>
				<li><strong>Cloudflare R2</strong> — armazenamento seguro de imagens</li>
			</ul>
		</section>

		<section>
			<h2>3. Reconhecimento facial</h2>
			<p>
				A Move View Photos oferece, de forma opcional, um recurso de busca por reconhecimento facial
				que permite ao usuário encontrar suas fotos em um evento enviando uma selfie.
			</p>
			<p>
				O uso deste recurso depende de <strong>consentimento explícito</strong>, solicitado antes de
				qualquer processamento. Ao aceitar:
			</p>
			<ul>
				<li>A imagem enviada é usada exclusivamente para comparação com as fotos do evento selecionado</li>
				<li>A selfie não é armazenada em nossos servidores após a busca</li>
				<li>Os vetores biométricos gerados são descartados ao final da sessão</li>
				<li>O processamento ocorre de forma segura em servidores próprios, sem repasse a terceiros</li>
			</ul>
			<p>
				Você pode recusar o uso deste recurso e buscar suas fotos manualmente a qualquer momento.
				O consentimento pode ser revogado simplesmente não utilizando o recurso em sessões futuras.
			</p>
		</section>

		<section>
			<h2>4. Segurança das fotos</h2>
			<p>
				As fotos originais adquiridas são armazenadas em ambiente privado com acesso restrito.
				O download é liberado exclusivamente para usuários que realizaram a compra, mediante
				verificação de pedido. Todos os downloads são registrados com data, hora e endereço IP
				para fins de auditoria e controle de acesso.
			</p>
		</section>

		<section>
			<h2>5. Seus direitos (LGPD)</h2>
			<p>Nos termos da LGPD, você tem direito a:</p>
			<ul>
				<li>Confirmar a existência de tratamento dos seus dados pessoais</li>
				<li>Acessar os dados que mantemos sobre você</li>
				<li>Corrigir dados incorretos ou desatualizados</li>
				<li>Solicitar a anonimização, bloqueio ou eliminação dos seus dados</li>
				<li>Revogar o consentimento a qualquer momento</li>
				<li>Solicitar a exclusão da sua conta e de todos os dados associados</li>
			</ul>
			<p>Para exercer qualquer um desses direitos, entre em contato pelo e-mail abaixo.</p>
		</section>

		<section>
			<h2>6. Cookies</h2>
			<p>
				Utilizamos apenas cookies estritamente necessários para manter sua sessão autenticada.
				Não utilizamos cookies de rastreamento, publicidade ou análise comportamental de terceiros.
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
		margin-bottom: 20px;
	}

	.intro {
		color: var(--text-muted);
		font-size: 0.925rem;
		line-height: 1.7;
		margin-bottom: 36px;
		padding: 16px 20px;
		background: var(--bg-elevated);
		border-left: 3px solid var(--accent);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	section {
		margin-bottom: 36px;
	}

	h2 {
		font-size: 1.05rem;
		font-weight: 700;
		margin-bottom: 12px;
		color: var(--text-primary);
	}

	p {
		color: var(--text-secondary);
		line-height: 1.7;
		margin-bottom: 12px;
		font-size: 0.925rem;
	}

	ul {
		color: var(--text-secondary);
		line-height: 1.7;
		padding-left: 20px;
		margin-bottom: 12px;
		font-size: 0.925rem;
	}

	li {
		margin-bottom: 6px;
	}

	strong {
		color: var(--text-primary);
		font-weight: 600;
	}
</style>
