# Instruções do repositório

## Skill obrigatória para frontend

- Use `$frontend-specialist` em tarefas que auditem, planejem, implementem, revisem ou testem mudanças no frontend: arquivos em `src/`, `public/`, `index.html`, configurações Vite/TypeScript/Tailwind/PostCSS, dependências do cliente, UI/UX, acessibilidade, responsividade, integrações HTTP e performance no navegador.
- Não carregue a skill para tarefas exclusivamente de backend, dados ou infraestrutura sem impacto no cliente.
- Leia somente as referências indicadas pela skill para o tipo de trabalho atual.

## Regras operacionais

- Preserve os contratos atuais com `/perguntar` até que uma mudança de backend seja explicitamente autorizada e coordenada.
- Para comportamento verificável, siga o ciclo TDD definido pela skill. Não declare testes, lint, type-check ou build aprovados sem executá-los.
- Não execute `updateNgrokUrl.js` sem autorização explícita: o script grava `public/backend_url.json`, cria commit e envia para `origin/main`.
- Não exponha URLs privadas, tokens ou conteúdo sensível de respostas da API em logs ou relatórios.

## Comandos atualmente declarados

- Desenvolvimento: `npm run dev`
- Build de produção: `npm run build`
- Preview do build: `npm run preview`
- O repositório ainda não declara scripts de lint, type-check ou testes; consulte `$frontend-specialist` antes de introduzir essa infraestrutura.
