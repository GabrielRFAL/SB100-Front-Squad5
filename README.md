# SB100 Frontend

Interface web do Agente SB100, construída como uma SPA em React e TypeScript. A aplicação oferece um chat científico, um modo de avaliação em lote e uma classificação local do perfil do usuário no primeiro acesso.

## Como o frontend funciona

- `src/main.tsx` inicializa a aplicação e o provider de perfil.
- `src/app/App.tsx` organiza o cabeçalho, a navegação e os modos Chat padrão e Chat avaliador.
- O Chat padrão envia uma pergunta ao endpoint `POST /perguntar` e apresenta resposta, referências e indicadores retornados pelo backend.
- O Chat avaliador envia perguntas e respostas esperadas em lote para o mesmo endpoint.
- No primeiro acesso, `src/app/user-profile/` identifica o perfil por uma árvore de decisão. O resultado fica no `localStorage`, na chave `user_profile`, e pode ser alterado pela opção **Alterar meu perfil**.
- A URL base do backend é lida em runtime de `public/backend_url.json`. Se o arquivo estiver ausente ou inválido, o frontend tenta `http://localhost:8000`.

O projeto não possui roteador nem backend próprio. A comunicação HTTP usa a Fetch API e mantém os contratos atuais de `/perguntar`.

## Tecnologias principais

- React 18 e TypeScript
- Vite 5
- Tailwind CSS 3
- Radix UI
- Lucide React

## Pré-requisitos

- Node.js e npm instalados. O projeto não fixa uma versão em `engines`; o ambiente atual foi validado com Node.js 24.
- Backend compatível com o endpoint `/perguntar`, caso queira usar os chats.

## Executar localmente

Instale as dependências:

```bash
npm install
```

Configure `public/backend_url.json` com a URL base do backend, sem incluir `/perguntar`:

```json
{
  "backend_url": "http://localhost:8000"
}
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação ficará disponível em [http://localhost:4173](http://localhost:4173).

> A variável `VITE_API_BASE_URL` presente em `.env.example` ainda não é consumida pelo código. Atualmente, a configuração efetiva é `public/backend_url.json`.

## Build de produção

```bash
npm run build
npm run preview
```

O build é gerado em `dist/`, e o preview também usa a porta 4173 por padrão.

## Verificações

```bash
npm test
npm run type-check
npm run build
```

- `npm test`: testes unitários da árvore de decisão e da persistência do perfil.
- `npm run type-check`: verificação TypeScript do grafo ativo da aplicação.
- O projeto não possui script de lint.

### Teste E2E do perfil

O E2E usa Chrome DevTools sem dependências adicionais. Com a aplicação rodando em `127.0.0.1:4173`, inicie o Chrome headless com depuração na porta 9222 e execute:

```bash
npm run test:e2e
```

O script valida primeiro acesso, persistência, Visitante, reclassificação, dados inválidos, foco e viewport móvel. Por padrão, ele espera a aplicação em `http://127.0.0.1:4173/` e o Chrome DevTools em `http://127.0.0.1:9222`.

## Estrutura resumida

```text
src/
├── app/
│   ├── components/       # Chat, avaliador e componentes de interface
│   ├── user-profile/     # Árvore, persistência, contexto e modal de perfil
│   └── App.tsx           # Shell principal
├── assets/               # Imagens da marca
├── styles/index.css      # Tailwind e estilos globais ativos
└── main.tsx              # Entrada da aplicação
public/
└── backend_url.json      # URL do backend em runtime
```

Mais detalhes sobre a classificação estão em `USER_PROFILE_CLASSIFICATION_REPORT.md`.
