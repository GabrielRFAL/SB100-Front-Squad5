# Sandbox Web do SB100

## Introdução

O sandbox é uma interface de desenvolvimento independente do chat principal. Ele permite testar perguntas na API existente, acompanhar o streaming, variar `temperature` e guardar amostras somente na memória da sessão.

## Arquitetura

A rota `/sandbox` monta `SandboxApp`. O cliente envia `POST /perguntar/stream` diretamente para a base configurada, consome texto incrementalmente e gera logs JSON locais. O chat principal continua montado em todas as outras rotas.

## Pré-requisitos e instalação

É necessário Node.js compatível com o projeto e npm. Na raiz do repositório:

```bash
npm install
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste, se necessário:

```env
VITE_ENABLE_SANDBOX=true
```

`VITE_ENABLE_SANDBOX` habilita a rota em deployments não locais. Em local, o sandbox fica habilitado automaticamente. A URL da API é resolvida pelo mesmo mecanismo usado pelo chat principal: `public/backend_url.json`, com fallback para `http://localhost:8000`. Variáveis `VITE_*` são públicas no navegador; não coloque credenciais nelas.

## Como executar e acessar

```bash
npm run dev
```

Abra `http://localhost:4173/sandbox`. A rota é uma ferramenta de desenvolvimento e não é adicionada ao menu do produto. Em produção, ela não deve ser publicada sem proteção de ambiente e autorização adequada.

## Como utilizar

1. Escreva uma pergunta e selecione o perfil.
2. Ajuste `temperature`, timeout e limite de tentativas.
3. Clique em **Gerar resposta** para acompanhar tokens em streaming.
4. Use **Cancelar** para interromper. Texto parcial e status ficam registrados.
5. Copie a resposta ou exporte os logs JSON.
6. Selecione uma amostra do histórico para comparar perguntas e temperaturas.

## Parâmetros

`temperature` começa em `0.1` e aceita valores de `0` a `2`; a faixa é uma validação básica porque o limite oficial não foi documentado pela API. `top_p` não é suportado e nunca é enviado. `top_k` aparece como recuperação RAG declarada com padrão `20`, sem edição e sem envio ao endpoint. O modelo `llama3.1:8b` é informação declarada pelo backend, não confirmação retornada por cada resposta.

## Metadados e logs

Cada execução recebe um `sample_id`, timestamp, parâmetros enviados, tentativas, latência, status e HTTP status quando disponível. Eventos como `generation_started`, `request_sent`, `stream_started`, `retry_scheduled`, `generation_completed`, `request_timeout`, `request_cancelled` e `generation_failed` aparecem como objetos JSON. Perguntas e respostas completas não são colocadas automaticamente nos eventos.

## Retry e timeout

Falhas de rede, timeout e HTTP `429`, `502`, `503` e `504` podem ser repetidos com backoff exponencial, jitter e limite de tentativas. Erros `400`, cancelamentos e falhas após tokens parciais não são repetidos. Um timeout pode ocorrer sem confirmação de processamento no servidor; por isso uma nova tentativa pode duplicar processamento no backend.

## Histórico

O histórico existe apenas enquanto a página está aberta. Ele pode ser selecionado para consulta e limpo pelo botão **Limpar histórico**. Não há gravação automática em `localStorage` ou banco.

## Testes e validação

```bash
npm test
npm run type-check
npm run build
```

Os testes unitários usam `fetch` simulado e não dependem do ngrok. Não há teste real contra a API externa incluído.

## Deploy na Vercel

O arquivo `vercel.json` configura o rewrite necessário para que `/sandbox` funcione ao ser acessado diretamente.

Passo a passo:

1. Crie uma branch, por exemplo `sandbox-vercel`, e envie-a para o repositório.
2. Na Vercel, abra **Settings → Environment Variables**.
3. Cadastre `VITE_ENABLE_SANDBOX=true` somente no ambiente **Preview**.
4. Crie um deployment da branch ou abra um pull request.
5. Acesse `https://URL-DO-PREVIEW.vercel.app/sandbox`.
6. Em **Settings → Deployment Protection**, habilite **Vercel Authentication** para proteger os deployments de Preview.
7. Teste a aplicação principal e o sandbox antes do merge.

Depois do merge na `main`, se `VITE_ENABLE_SANDBOX` não estiver configurada em **Production**, a rota de produção exibirá a mensagem de sandbox indisponível. Para publicar também no domínio de produção, configure essa variável em **Production** conscientemente e mantenha a proteção de acesso adequada.

As variáveis da Vercel só entram em novos deployments. Depois de alterar uma variável, faça um novo deploy.

## Segurança e limitações conhecidas

Não há autenticação ou correlation ID no backend atual. O sandbox não armazena segredos, não registra automaticamente o conteúdo integral de perguntas e respostas nos logs e não altera o contrato do chat. A API precisa aceitar CORS para chamadas diretas do navegador; não foi criado proxy para contornar essa política. O formato de stream é tratado como linhas de texto, SSE simples ou eventos NDJSON conhecidos, sem assumir metadados adicionais.
