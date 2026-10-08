# Relatório da skill `frontend-specialist`

## 1. Objetivo

Fornecer ao Codex conhecimento incremental e verificável sobre o frontend SB100 para que futuras mudanças preservem contratos, arquitetura e identidade visual, adotem TDD e tratem UI/UX, WCAG 2.2 AA, performance e segurança desde o início.

## 2. Especializações incorporadas

- Engenharia React/TypeScript e arquitetura incremental.
- Integrações Fetch e validação de contratos não confiáveis.
- UI/UX responsiva alinhada à identidade SB100.
- Acessibilidade WCAG 2.2 AA.
- Performance orientada por métricas.
- Segurança frontend, com ênfase em injeção no relatório.
- TDD com evidência real de red/green/refactor e regressão.

## 3. Stack identificada

React 18.3, React DOM 18.3, TypeScript 5.6 estrito, Vite 5.4, Tailwind CSS 3.4, PostCSS/Autoprefixer, componentes Radix vendorizados, Lucide, CVA, clsx, tailwind-merge e Fetch API. Não foram adicionadas tecnologias não presentes; ferramentas de teste são mencionadas apenas como opções futuras que exigem autorização.

## 4. Estrutura criada

```text
.agents/skills/frontend-specialist/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── architecture.md
    ├── tech-stack.md
    ├── coding-standards.md
    ├── design-system.md
    ├── ui-ux-guidelines.md
    ├── components.md
    ├── api-integration.md
    ├── testing-strategy.md
    └── performance-security.md
```

Também foram criados `AGENTS.md`, `FRONTEND_AUDIT.md` e este relatório na raiz.

## 5. Como funciona

O Codex encontra skills locais em `.agents/skills/`. Na descoberta, `name` e `description` do frontmatter orientam o roteamento; o corpo de `SKILL.md` é carregado quando a skill é selecionada e as referências somente conforme a tarefa. `agents/openai.yaml` mantém `allow_implicit_invocation: true`.

O `AGENTS.md` da raiz adiciona uma regra condicional obrigatória para usar `$frontend-specialist` em tarefas que toquem frontend e a exclui de tarefas exclusivamente backend/infra. Essa combinação segue o padrão descrito pela [documentação oficial da OpenAI sobre skills locais e regras em AGENTS.md](https://developers.openai.com/blog/skills-agents-sdk) e o mecanismo de carregamento hierárquico descrito no [guia oficial de prompting do Codex](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide).

Como confirmar em uso: inicie uma nova sessão do Codex na raiz, solicite uma mudança em `src/` e verifique que `$frontend-specialist` aparece entre as skills disponíveis/selecionadas e que o agente lê `SKILL.md`. Nesta auditoria, uma sessão independente, efêmera e somente leitura confirmou `DISCOVERED=sim`, o caminho local correto e `AGENTS_TRIGGER=sim`.

## 6. Como utilizar

A invocação deve ocorrer implicitamente pelo escopo. Também é possível pedir explicitamente:

- “Use `$frontend-specialist` para melhorar o layout do avaliador em mobile.”
- “Use `$frontend-specialist` para extrair um componente reutilizável dos cards de resultado.”
- “Use `$frontend-specialist` para corrigir o foco e os labels do chat com TDD.”
- “Use `$frontend-specialist` para refatorar a configuração da API sem mudar contratos.”
- “Use `$frontend-specialist` para melhorar os estados de erro do formulário.”
- “Use `$frontend-specialist` para implementar uma funcionalidade no chat começando pelos testes.”
- “Use `$frontend-specialist` para auditar e corrigir acessibilidade WCAG 2.2 AA.”

## 7. Validações realizadas

- Estrutura e todos os caminhos de referência conferidos no workspace.
- Frontmatter contém os campos obrigatórios `name` e `description`; nome do diretório coincide com `name` e usa formato permitido.
- Descrição delimita gatilhos frontend e exclusão backend/infra.
- `openai.yaml` possui strings entre aspas, prompt com `$frontend-specialist` e invocação implícita habilitada.
- Referências cruzadas com `package.json`, configs e imports reais; nenhuma biblioteca de teste foi apresentada como instalada.
- TDD, UI/UX, WCAG, design system, integração, performance, segurança e checklist estão presentes.
- `AGENTS.md` não sobrescreveu instruções anteriores: não havia `AGENTS.md` nem skills locais no estado inicial.
- Uma sessão Codex independente (`codex exec --ephemeral -s read-only`) confirmou descoberta, caminho e gatilho de `AGENTS.md`, sem editar arquivos.
- O validador `quick_validate.py` da skill `skill-creator` não pôde ser executado porque `python.exe`/`py.exe` não estavam acessíveis no ambiente; foi feita validação estrutural alternativa após a criação.

## 8. Limitações

- A descoberta automática foi comprovada; não foi executado um cenário completo de implementação para avaliar decisões comportamentais da skill, pois isso alteraria ou duplicaria trabalho fora do escopo da auditoria.
- O validador Python oficial local ficou indisponível.
- A skill registra a ausência de testes e lockfile, mas não os cria porque esta etapa proíbe alterar o frontend/instalar dependências.
