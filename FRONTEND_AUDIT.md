# Auditoria do frontend SB100

Data da auditoria: 8 de outubro de 2026  
Escopo: estado do repositório no commit `3b6dee1` (`main`)  
Método: inspeção estática do código e das configurações, inventário de imports e execução dos comandos disponíveis sem instalar dependências.

## 1. Resumo executivo

O repositório contém uma SPA pequena para interação com o Agente SB100, com dois modos mantidos por estado local: chat individual e avaliação em lote. A implementação ativa usa React 18, TypeScript estrito, Vite 5 e Tailwind CSS 3. Os fluxos centrais são compreensíveis e os componentes principais estão separados, mas a camada de acesso à API, os tipos de contrato e os estados assíncronos permanecem dentro de componentes de tela.

O frontend não possui testes, lint, script de type-check, CI, lockfile ou documentação de operação. O build não pôde ser executado porque `node_modules` não existe e nenhuma instalação foi autorizada. O manifesto é suficiente para o grafo atualmente alcançado pelo Vite, mas não para verificar com `tsc` todos os 48 arquivos de `src/app/components/ui`: 31 pacotes importados por componentes vendorizados não estão declarados.

O achado mais grave é a montagem do relatório de impressão por interpolação de dados do usuário/servidor em uma string entregue a `document.write`, criando uma superfície comprovada de injeção de HTML e potencial XSS. Também merecem prioridade a ausência total de testes, a configuração de endpoint duplicada e divergente de `.env.example`, a exposição de mensagens brutas do backend e lacunas de acessibilidade nos controles e estados dinâmicos.

Nenhuma funcionalidade ou arquivo de frontend foi alterado nesta auditoria.

## 2. Stack tecnológica

| Tecnologia | Versão declarada | Finalidade | Evidência |
|---|---:|---|---|
| React | `^18.3.1` | Componentes, estado e efeitos | `package.json:20`; `src/main.tsx:1-9` |
| React DOM | `^18.3.1` | Montagem da SPA | `package.json:21`; `src/main.tsx:2-9` |
| TypeScript | `^5.6.2` | Tipagem do código React | `package.json:31`; `tsconfig.json:10-17` |
| Vite | `^5.4.1` | Dev server e bundle | `package.json:7-9,32`; `vite.config.ts:4-8` |
| Plugin React para Vite | `^4.3.1` | Transformação React/JSX | `package.json:27`; `vite.config.ts:1-5` |
| Tailwind CSS | `^3.4.4` | Estilos utilitários ativos | `package.json:30`; `src/styles/index.css:1-14`; `tailwind.config.js:1-7` |
| PostCSS / Autoprefixer | `^8.4.35` / `^10.4.19` | Pipeline CSS | `package.json:28-29`; `postcss.config.js:1-6` |
| Radix UI | Dialog `^1.1.15`, Separator `^1.1.8`, Slot `^1.2.4`, Tabs `^1.1.13`, Tooltip `^1.2.8` | Primitivos acessíveis e composição | `package.json:12-16`; uso ativo em `ChatMessage.tsx:3-12` e `EvaluatorChat.tsx:2-6` |
| Lucide React | `^1.14.0` | Ícones | `package.json:19`; `EvaluatorChat.tsx:7`; `Referencias.tsx:2` |
| CVA, clsx, tailwind-merge | `^0.7.1`, `^2.1.1`, `^3.5.0` | Variantes e composição de classes | `package.json:17-18,22`; `components/ui/button.tsx`; `components/ui/utils.ts` |
| Fetch API do navegador | nativa | Comunicação HTTP | `App.tsx:40,84`; `EvaluatorChat.tsx:40,72` |
| Node.js do ambiente | `v24.21.0` | Execução local observada | saída de `node --version`; não há `engines` no manifesto |

Gerenciador inferido: npm, pelos scripts e tentativa com `npm`; não existe lockfile. `package-lock.json` é explicitamente ignorado em `.gitignore:19`, portanto a resolução exata das versões transitivas não é reproduzível.

Não foram encontrados roteador, biblioteca de cache/server state, cliente HTTP externo, gerenciador global de estado, biblioteca de animação ativa, framework de testes, linter, formatter, container ou pipeline de deploy.

## 3. Arquitetura atual

```text
.
├── index.html                    # shell HTML e ponto de montagem
├── public/                       # favicon, ícones e backend_url.json em runtime
├── src/
│   ├── main.tsx                  # bootstrap React/StrictMode
│   ├── assets/                   # identidade visual raster
│   ├── styles/index.css          # único CSS importado pela aplicação
│   └── app/
│       ├── App.tsx               # composição, abas, chat e integração principal
│       ├── components/           # componentes funcionais e tela avaliadora
│       │   ├── ui/               # 48 wrappers/primitivos vendorizados
│       │   └── figma/            # fallback de imagem não referenciado
│       └── Template/             # template/JS legado e CSS usado na impressão
├── vite.config.ts
├── tsconfig*.json
├── tailwind.config.js
└── postcss.config.js
```

É uma SPA sem rotas. `App` controla `activeTab`, mensagens, loading e URL do backend (`App.tsx:32-36`). O modo avaliador é um componente de 344 linhas que concentra entrada, chamadas sequenciais, normalização parcial, apresentação e exportação (`EvaluatorChat.tsx`). Não há backend neste repositório; a fronteira é o endpoint externo `/perguntar`.

Arquivos efetivamente conectados ao bootstrap: `main.tsx` → `App.tsx` → `ChatHeader`, `ChatInput`, `ChatMessage`, `EvaluatorChat`, `Referencias` e sete módulos UI (`button`, `textarea`, `card`, `badge`, `separator`, `dialog`, `utils`). `ChunksModal`, `figma/ImageWithFallback`, `Template/template01.html`, `Template/relatorio.js`, `styles/theme.css`, `styles/tailwind.css` e `styles/fonts.css` não são referenciados pelo grafo ativo. `Template/template.css` é alcançado apenas pela exportação de `EvaluatorChat.tsx:10,148`.

## 4. Mapeamento de componentes

| Componente | Responsabilidade | Estado/reuso | Observações |
|---|---|---|---|
| `App` | Layout, troca de modo, chat e POST individual | Dono de `messages`, `isLoading`, `backendUrl`, `activeTab` | Concentra UI, contrato e transporte em 202 linhas |
| `ChatHeader` | Marca e status global | Apresentacional; aceita `children` | `children` não é usado pelo chamador atual |
| `ChatInput` | Entrada e submit de pergunta | Estado local do texto | Sem label acessível; limpa a entrada antes de confirmar sucesso |
| `ChatMessage` | Balões, flag, referências e chunks | Dialog local | Reutiliza Radix Dialog e `Referencias` |
| `Referencias` | Lista expansível de referências | Estado `showAll` | Reusado nos dois modos; chaves por índice |
| `EvaluatorChat` | Avaliação em lote, resultados e impressão | Seis responsabilidades no mesmo componente | Duplica descoberta de backend e normalização de resposta |
| `ChunksModal` | Modal manual de chunks | Não referenciado | Duplica parte do Dialog de `ChatMessage` sem semântica/foco equivalentes |
| `components/ui/*` | Primitivos vendorizados estilo shadcn/Radix | 48 arquivos; 7 alcançados pela aplicação | Os não alcançados não entram no bundle Vite, mas entram no escopo `include: ["src"]` do TypeScript |

## 5. Fluxos de dados

### Chat individual

1. `ChatInput` valida `trim`, chama `onSendMessage` e limpa o campo (`ChatInput.tsx:11-16`).
2. `App` adiciona a mensagem do usuário e ativa loading (`App.tsx:70-78`).
3. A base é lida de `/backend_url.json`; em falha, usa `http://localhost:8000` (`App.tsx:38-54,81`).
4. Envia `POST /perguntar` com `{ pergunta: text }` (`App.tsx:82-90`).
5. Normaliza `chunks`, referências e flag com coerções e `any` (`App.tsx:97-123`).
6. Acrescenta a resposta ou uma mensagem de erro ao histórico (`App.tsx:125-134`).

### Avaliação em lote

1. Perguntas e ground truths são separadas por `;` e apenas a igualdade de contagens é validada (`EvaluatorChat.tsx:54-61`).
2. Cada par é enviado sequencialmente ao mesmo `/perguntar`, agora como arrays (`EvaluatorChat.tsx:66-81`).
3. O código assume `data.resultados[0]`, normaliza referências/chunks e acumula resultados progressivos (`EvaluatorChat.tsx:87-120`).
4. Falhas viram cards de resultado; o processamento continua (`EvaluatorChat.tsx:121-133`).
5. A exportação abre nova janela, interpola resultados em HTML e chama impressão (`EvaluatorChat.tsx:136-213`).

Os dois formatos de request/response para o mesmo endpoint podem ser válidos no backend, mas isso não pôde ser confirmado sem código ou documentação do serviço.

## 6. Avaliação de UI/UX

### Padrão visual real

- Identidade: logotipo verde SB100; fundo `slate-50`; superfícies brancas; acentos `emerald-600/700/900` e hexadecimais `#059669`, `#4b633d`, `#3f5230`.
- Tipografia: `Inter, system-ui, sans-serif`, mas nenhuma fonte Inter é carregada (`index.css:5-7`); na prática haverá fallback quando Inter não existir no sistema.
- Formas: cards `rounded-2xl`, mensagens `rounded-3xl`, botões pill, bordas slate/gray e sombras leves.
- Espaçamento: majoritariamente escala Tailwind 2/3/4/5/6/8; há mistura de ordem de utilitários e paletas `gray`, `slate`, `green`, `emerald`.
- Breakpoints: `sm`, `md`, `lg` padrão do Tailwind. O avaliador muda para duas colunas em `md`; o shell vira duas colunas em `lg`.

Não há design system ativo formal: `tailwind.config.js` não estende tokens. `theme.css` contém tokens e sintaxe associada ao Tailwind 4 (`@custom-variant`, `@theme`), mas não é importado; `tailwind.css` também não é importado e referencia `tw-animate-css`, pacote ausente. Esses arquivos não devem ser tratados como fonte de verdade visual atual.

### Usabilidade e responsividade

Pontos positivos: hierarquia simples, dois modos explícitos, feedback de processamento, cards responsivos no avaliador e apresentação progressiva de resultados. O uso de Radix Dialog fornece uma base melhor para foco e teclado no modal ativo.

Problemas/riscos observados:

- Em telas abaixo de `lg`, o `main` recebe `order-1` e a navegação `order-2` (`App.tsx:142-165`); o usuário precisa passar pelo painel alto para trocar de modo.
- As áreas principais usam altura fixa `calc(100vh - 152px)` (`App.tsx:167,194`) embora o cabeçalho possa crescer em mobile (`ChatHeader.tsx:12`), criando risco de viewport apertada e rolagens aninhadas.
- Não há rolagem automática para a última mensagem nem estado vazio dedicado no avaliador.
- `w-35` no logo não pertence à escala padrão do Tailwind 3 (`ChatHeader.tsx:14`) e tende a ser ignorado.
- Erros técnicos do backend aparecem como mensagens de assistente, sem ação de retry e potencialmente com detalhes internos (`App.tsx:92-130`).
- A entrada do chat é limpa antes da confirmação e não preserva o texto para retry (`ChatInput.tsx:13-16`).

### Acessibilidade (inspeção estática)

- Positivo: `lang="pt-BR"`, headings e elementos nativos de botão/input; Dialog Radix no fluxo ativo.
- O input de chat tem apenas placeholder, sem `<label>` ou nome acessível adicional (`ChatInput.tsx:22-29`).
- `focus:outline-none` remove o indicador padrão do input e o substitui somente por mudança sutil de borda/fundo (`ChatInput.tsx:27`).
- Botões de modo não expõem `aria-pressed`, `aria-current` ou semântica de tabs (`App.tsx:149-161`).
- Status de loading e novas mensagens não estão em região `aria-live`/`role=status` (`App.tsx:181-185`; `ChatHeader.tsx:22-24`).
- A barra visual de score não possui nome/valor semântico de progressbar (`ChatMessage.tsx:89-95`).
- O modal legado `ChunksModal` não implementa papel de diálogo, foco, Escape ou rótulo do botão “×”; ele está inativo, mas não deve ser reintroduzido sem correção.
- Contraste não foi medido em navegador; requer validação WCAG 2.2 AA automatizada e manual.

## 7. Avaliação de performance

- O grafo ativo é pequeno e componentes UI não importados tendem a ser eliminados por não entrarem no grafo do Vite.
- Não há rotas nem `React.lazy`; `EvaluatorChat` e seus módulos entram no bundle inicial mesmo quando o usuário usa apenas o chat (`App.tsx:5,195`). O impacto não foi medido.
- As imagens raster somam cerca de 659 KiB no repositório, com duplicação de dois ícones entre `src/assets` e `public`; o logo ativo tem ~147 KiB. Não há `srcset`, WebP/AVIF ou dimensões explícitas.
- O histórico renderiza integralmente a cada atualização e não há virtualização; impacto apenas para conversas longas, ainda não medido.
- A avaliação é deliberadamente sequencial (`EvaluatorChat.tsx:69-70`), aumentando tempo total de lote, mas pode ser necessária para o backend; validar limites antes de paralelizar.
- Não há cache de dados nem timeout/AbortController. `/backend_url.json` pode ser buscado novamente em cada fluxo e a lógica é duplicada.
- Bundle, Lighthouse e profiling não puderam ser medidos porque as dependências não estão instaladas.

## 8. Avaliação de segurança

- **Injeção/XSS na impressão:** `result.pergunta`, `resposta`, `ground_truth` e referências são interpolados sem escaping em `reportHtml`, seguido de `document.write` (`EvaluatorChat.tsx:143-209`). Dados do usuário e do backend podem criar marcação/script na origem `about:blank` aberta pela aplicação.
- **Implementação legada equivalente:** `Template/relatorio.js:45-99` usa `innerHTML` com valores da API sem sanitização. Não está no fluxo ativo, mas é código executável se o template for servido.
- **Detalhes de erro:** o chat incorpora o corpo completo de respostas HTTP na exceção e o mostra ao usuário (`App.tsx:92-130`). Isso pode divulgar mensagens internas do backend.
- **Endpoint público mutável:** `public/backend_url.json` versiona uma URL ngrok. Não é segredo, mas acopla deploy a um endpoint efêmero. O fallback HTTP pode ser bloqueado como mixed content quando o frontend estiver em HTTPS.
- **Ambiente divergente:** `VITE_API_BASE_URL` é documentada em `.env.example`, porém não é lida por nenhum arquivo; o mecanismo real é JSON público + localhost.
- Não há autenticação, autorização ou armazenamento de tokens no frontend auditado. Não há `dangerouslySetInnerHTML` no grafo ativo; a ocorrência em `ui/chart.tsx` é de CSS gerado e o arquivo não é importado.
- Auditoria de vulnerabilidades de dependências não foi possível sem lockfile e instalação; versões declaradas não bastam para determinar a árvore transitiva.

## 9. Qualidade do código

Pontos positivos: TypeScript em modo `strict`, componentes funcionais, separação de componentes visuais principais, coerção defensiva de partes da resposta, tratamento `response.ok`, `StrictMode` e reutilização de `Referencias`/primitivos UI.

Débitos principais:

- Tipos `Chunk` são duplicados em três arquivos, com incompatibilidade `file` versus `titulo`.
- `fetchBackendUrl`, composição de URL, fetch e normalização estão duplicados entre `App` e `EvaluatorChat`.
- `any` domina a fronteira não confiável (`App.tsx:99,109,126`; `EvaluatorChat.tsx:91,102,121`), reduzindo o benefício de `strict`.
- `EvaluatorChat` concentra transporte, regras de lote, transformação, UI e impressão em 344 linhas.
- Há um catálogo UI muito maior que o uso real e artefatos legados/desconectados, aumentando manutenção e confundindo a fonte de verdade.
- `updateNgrokUrl.js` usa CommonJS (`require`) dentro de pacote `"type": "module"` (`package.json:5`; script linhas 1-4), portanto sua execução direta com Node é incompatível antes mesmo dos efeitos de commit/push.
- Não existe README nem convenção documentada de código; ponto e vírgula/aspas e ordenação de classes variam.

## 10. Testes e validações

| Verificação | Comando/checagem | Resultado real |
|---|---|---|
| Estado inicial | `git status --short` | Limpo |
| Runtime | `node --version` | `v24.21.0` |
| Dependências | existência de `node_modules` | Ausente |
| Build | `npm.cmd run build` | Não executado até o bundle: `'vite' não é reconhecido` porque dependências não estão instaladas |
| Lint | `npm.cmd run lint` | Falhou: script `lint` inexistente |
| Testes | `npm.cmd test` | Falhou: script `test` inexistente |
| Type-check | inspeção de scripts/comandos | Não há script e `tsc` não está instalado/localmente disponível |
| Inventário de imports | comparação estática imports × `package.json` | 42 pacotes importados em `src`; 31 não declarados, todos ligados ao catálogo UI não ativo |
| Auditoria visual | tentativa condicionada ao app executável | Não realizada; aplicação não pôde ser iniciada sem instalar dependências |
| Lighthouse/a11y/bundle | dependem de build/app em execução | Não realizados |
| Descoberta da skill | sessão Codex independente, efêmera e somente leitura | `DISCOVERED=sim`; caminho e gatilho de `AGENTS.md` reconhecidos |

Não foi executado `npm install`: a tarefa proíbe instalar dependências sem necessidade e autorização, e o objetivo era auditoria sem alteração funcional.

## 11. Problemas identificados

### FE-001 — HTML não confiável na exportação

- **Classificação:** problema comprovado
- **Gravidade:** alta
- **Local:** `src/app/components/EvaluatorChat.tsx:143-209`; legado em `src/app/Template/relatorio.js:45-99`
- **Evidência:** valores externos são interpolados em HTML e escritos com `document.write`/`innerHTML`, sem escaping.
- **Impacto:** injeção de marcação e potencial execução de script na janela de relatório; alteração fraudulenta do documento impresso.
- **Recomendação:** gerar nós com `textContent`/React ou aplicar escaping contextual robusto; definir política de conteúdo da janela e testes com payloads hostis.
- **Validação:** teste automatizado confirma que `<img onerror=...>` e tags similares aparecem como texto e não executam nem alteram DOM.

### FE-002 — Sem testes e gates de qualidade

- **Classificação:** problema comprovado
- **Gravidade:** alta
- **Local:** `package.json:6-10`; repositório inteiro
- **Evidência:** apenas `dev`, `build`, `preview`; não há arquivos de teste, lint, cobertura ou CI.
- **Impacto:** regressões em contratos, UI, acessibilidade e impressão não são detectadas automaticamente.
- **Recomendação:** introduzir, em tarefa autorizada, Vitest + Testing Library e E2E compatível; adicionar lint, type-check e CI, começando pelos fluxos críticos.
- **Validação:** scripts executáveis e CI cobrindo chat, lote, erros, relatório seguro e navegação por teclado.

### FE-003 — Manifesto incompleto para o escopo TypeScript

- **Classificação:** problema comprovado
- **Gravidade:** alta
- **Local:** `package.json:11-33`; `tsconfig.json:19`; `src/app/components/ui/*`
- **Evidência:** 31 pacotes importados nos arquivos incluídos por `src` não estão declarados, incluindo 21 módulos Radix e `react-hook-form`, `recharts`, `sonner`, entre outros.
- **Impacto:** um `tsc --noEmit` completo falhará na resolução desses módulos após instalar apenas o manifesto atual; componentes aparentemente disponíveis não podem ser usados de forma confiável.
- **Recomendação:** decidir quais componentes são suportados; remover artefatos não adotados ou declarar/versionar somente as dependências necessárias, acompanhadas de type-check.
- **Validação:** instalação reproduzível e `tsc --noEmit` passa sobre todo `src` sem módulos ausentes.

### FE-004 — Configuração de API divergente e duplicada

- **Classificação:** problema comprovado
- **Gravidade:** média
- **Local:** `.env.example:1-3`; `public/backend_url.json`; `App.tsx:38-54`; `EvaluatorChat.tsx:38-52`
- **Evidência:** `VITE_API_BASE_URL` nunca é lida; dois componentes repetem JSON público + fallback hardcoded.
- **Impacto:** configuração enganosa, comportamento diferente entre ambientes e manutenção duplicada.
- **Recomendação:** definir uma única precedência documentada e um módulo tipado de configuração/cliente.
- **Validação:** testes de configuração cobrem env, arquivo, whitespace, falha e fallback; ambos os fluxos usam o mesmo módulo.

### FE-005 — Acessibilidade dos controles e feedback

- **Classificação:** problema comprovado
- **Gravidade:** média
- **Local:** `ChatInput.tsx:22-33`; `App.tsx:149-185`; `ChatMessage.tsx:89-95`
- **Evidência:** input sem label, foco padrão removido, seleção sem estado ARIA e loading/mensagens sem anúncio.
- **Impacto:** usuários de teclado e tecnologias assistivas perdem contexto, foco e feedback.
- **Recomendação:** nome acessível, foco visível AA, padrão tabs ou `aria-pressed`, regiões live moderadas e progressbar semântica.
- **Validação:** testes axe/Testing Library, navegação manual por teclado e leitor de tela nos fluxos críticos.

### FE-006 — Erro do backend exposto ao usuário

- **Classificação:** problema comprovado
- **Gravidade:** média
- **Local:** `App.tsx:92-130`
- **Evidência:** corpo integral da resposta é incluído no `Error` e renderizado no chat.
- **Impacto:** vazamento de detalhes internos e mensagem pouco acionável.
- **Recomendação:** mapear erros a mensagens seguras, manter detalhe apenas em telemetria controlada e oferecer retry.
- **Validação:** resposta 4xx/5xx com conteúdo sensível nunca aparece na UI; mensagem e retry são verificados.

### FE-007 — Ferramental não reproduzível

- **Classificação:** problema comprovado
- **Gravidade:** média
- **Local:** `.gitignore:19`; ausência de lockfile/README/CI; `updateNgrokUrl.js:1-4`
- **Evidência:** lockfile ignorado, nenhuma versão de Node declarada e script CommonJS em pacote ESM.
- **Impacto:** instalações variam; onboarding e automação são frágeis; atualização de URL não inicia diretamente.
- **Recomendação:** escolher/pinar gerenciador e Node, versionar lockfile, documentar comandos e corrigir explicitamente o formato do script em tarefa separada.
- **Validação:** checkout limpo instala de modo determinístico, builda e executa o utilitário em teste seguro sem push real.

### FE-008 — Responsividade com ordem e altura rígidas

- **Classificação:** risco potencial
- **Gravidade:** média
- **Local:** `App.tsx:142-167,194`; `ChatHeader.tsx:12`
- **Evidência:** navegação vem após conteúdo no mobile; painel usa cálculo fixo apesar de cabeçalho responsivo.
- **Impacto:** descoberta ruim de modo e rolagens aninhadas/corte em viewports pequenas.
- **Recomendação:** validar em 320/375/768 px e reorganizar controles/altura com viewport dinâmica somente após reproduzir.
- **Validação:** E2E visual e manual sem overflow horizontal, conteúdo cortado ou navegação fora do primeiro viewport.

### FE-009 — Fronteira de API sem validação de schema

- **Classificação:** risco potencial
- **Gravidade:** média
- **Local:** `App.tsx:97-126`; `EvaluatorChat.tsx:87-129`
- **Evidência:** JSON é tratado como `any`; avaliador assume `resultados[0]`.
- **Impacto:** mudanças ou respostas parciais geram falhas degradadas e inconsistências silenciosas.
- **Recomendação:** tipos compartilhados e validação runtime leve no boundary, sem alterar contrato.
- **Validação:** testes para payload válido, campos ausentes, tipos incorretos e resposta vazia.

### FE-010 — Código e estilos desconectados

- **Classificação:** oportunidade de melhoria
- **Gravidade:** baixa
- **Local:** `components/ui/*`, `ChunksModal.tsx`, `Template/*`, `styles/theme.css`, `styles/tailwind.css`, `styles/fonts.css`
- **Evidência:** arquivos não têm caminho de import a partir de `main.tsx` (exceto `template.css`).
- **Impacto:** confusão arquitetural, type-check oneroso e risco de padrões visuais conflitantes.
- **Recomendação:** inventariar com o time o que é reserva intencional e remover/arquivar apenas em tarefa autorizada com validação.
- **Validação:** grafo documentado, type-check limpo e ausência de regressão visual/funcional.

### FE-011 — Ausência de lazy loading e otimização de mídia

- **Classificação:** oportunidade de melhoria
- **Gravidade:** baixa
- **Local:** `App.tsx:5`; `src/assets`; `public`
- **Evidência:** avaliador importado estaticamente; imagens raster duplicadas e sem variantes responsivas.
- **Impacto:** bundle e transferência inicial potencialmente maiores; não medidos.
- **Recomendação:** medir antes; considerar lazy loading do avaliador e otimização/deduplicação dos ativos.
- **Validação:** comparação de bundle/Lighthouse antes/depois sem regressão visual.

## 12. Melhorias recomendadas

1. **Segurança imediata:** eliminar interpolação HTML não confiável e não expor corpos de erro.
2. **Rede de segurança:** criar infraestrutura de testes, type-check e lint com lockfile reproduzível; cobrir os dois contratos `/perguntar`.
3. **Fronteira HTTP:** centralizar configuração/cliente e validar payloads, mantendo os contratos atuais.
4. **Acessibilidade/responsividade:** corrigir nomes, foco, anúncios, semântica de seleção e validar viewports reais.
5. **Arquitetura:** extrair lógica de avaliação/impressão de `EvaluatorChat` e consolidar tipos após testes.
6. **Higiene do catálogo:** decidir componentes/artefatos suportados e alinhar manifesto, TypeScript e estilos.
7. **Performance medida:** gerar bundle e Lighthouse antes de lazy loading, mídia responsiva ou virtualização.

## 13. Roadmap sugerido

- **Fase 0 — baseline reproduzível:** Node/package manager/lockfile, scripts `typecheck`, `lint`, `test`, build e CI.
- **Fase 1 — segurança com TDD:** casos de injeção no relatório e sanitização estrutural; mensagens seguras de erro.
- **Fase 2 — contratos e resiliência:** cliente/configuração única, tipos/validação, timeout/cancelamento e retry.
- **Fase 3 — WCAG e mobile:** auditoria automatizada + manual, foco, live regions, controle de modo e viewports.
- **Fase 4 — componentização:** reduzir responsabilidades do avaliador e consolidar modelos/componentes duplicados.
- **Fase 5 — performance:** bundle analyzer/Lighthouse, lazy loading do modo avaliador e otimização de ativos baseada em métricas.

## 14. Limitações da auditoria

- Dependências não instaladas; não foi permitido instalar ou alterar o manifesto nesta etapa.
- Build, type-check, aplicação em navegador, Lighthouse, axe e testes visuais não puderam ser executados.
- Não há backend, documentação de API, ambiente autenticado ou evidência de deploy; CORS, formatos reais e limites não foram confirmados.
- Não há lockfile; vulnerabilidades transitivas e tamanhos reais do bundle não foram determinados.
- A interface foi avaliada por código e ativos, não por interação renderizada em múltiplas resoluções.
- A descoberta e o gatilho da nova skill foram confirmados em sessão independente; um cenário completo de implementação com a skill não foi executado para preservar o escopo sem alterações funcionais.
