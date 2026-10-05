# Auditoria técnica do Patota CCC

Revisão estática do frontend React, integração Supabase, PWA, scripts SQL e
documentação. O projeto já possui bons avanços em code splitting, cache, RLS e
responsividade, mas ainda há riscos importantes de instalação, integridade de
dados e manutenção.

## Resumo executivo

| Prioridade | Área | Situação | Próxima ação |
|---|---|---|---|
| P0 | Instalação/segurança | O README mandava executar apenas o schema inicial, que mantém policies históricas permissivas | Aplicar todas as migrações e automatizá-las com Supabase CLI |
| P0 | Integridade financeira | Operações relacionadas usam várias escritas independentes | Criar RPCs transacionais para pagamentos, multas e placares |
| P1 | Qualidade | Não existem testes, lint ou CI | Adicionar Vitest, Testing Library, ESLint e workflow de CI |
| P1 | Banco | Há 13 scripts manuais incrementais e parcialmente sobrepostos | Consolidar um baseline e versionar `supabase/migrations/` |
| P1 | UX/erros | Há muitos `alert()` e mensagens apenas no console | Adotar toasts, estados de erro e opção de tentar novamente |
| P1 | Observabilidade | Falhas de produção não são agregadas | Integrar monitoramento de erros e logs de ações críticas |
| P2 | Frontend | Páginas grandes misturam consulta, regra e apresentação | Extrair hooks/componentes e padronizar cache de servidor |
| P2 | Acessibilidade | Não há validação automatizada de teclado, foco e contraste | Incluir axe e testes de navegação por teclado |

## Achados detalhados

### 1. Segurança e instalação

- **Corrigido nesta revisão:** a documentação expunha uma chave anon real e
  recomendava uma senha fixa de banco. Mesmo sendo pública por design, publicar
  uma credencial de um projeto real aumenta a exposição e confunde a instalação.
- **Corrigido nesta revisão:** a configuração ensinava Storage público, em
  conflito com o hardening que exige buckets privados e URLs assinadas.
- O controle visual da rota admin não é uma fronteira de segurança. Toda escrita
  privilegiada deve permanecer protegida por RLS ou RPC no banco.
- O cache local de `isAdmin` melhora disponibilidade, mas pode exibir a rota
  temporariamente após revogação. Isso só é seguro porque o banco deve rejeitar
  operações não autorizadas; a interface deve tratar o `403` claramente.
- Recomenda-se rotacionar a anon key antes documentada e revisar as policies do
  projeto implantado.

### 2. Banco e integridade

- Confirmação de pagamento, lançamento em caixa e atualização da pendência não
  devem ser escritas independentes. Uma falha intermediária causa divergência.
  Implemente uma função PostgreSQL transacional, idempotente e protegida por
  `public.is_admin()`.
- A mesma regra vale para finalizar placar, distribuir pontos e registrar
  presença/multas.
- Adicione chaves de idempotência ou constraints únicas para impedir duplo clique
  e repetição de requisições mobile.
- Migre os scripts incrementais para a Supabase CLI, gere um baseline e valide
  `db reset` em CI.
- Crie testes SQL de RLS para anônimo, membro inativo, membro ativo e admin.

### 3. Testes e entrega contínua

Hoje `package.json` oferece apenas `dev`, `build` e `preview`. A cobertura mínima
recomendada é:

1. **Unitários:** equilíbrio de times, datas-limite, somatórios e helpers de Storage.
2. **Componentes:** login, guardas de rota, estados vazio/erro e formulários admin.
3. **Integração:** services com Supabase simulado, incluindo timeout e sessão expirada.
4. **E2E:** login, RSVP, envio/validação de comprovante e fechamento do placar.
5. **CI:** `npm ci`, lint, testes, build e validação das migrações em cada PR.

Defina uma política de atualização periódica das dependências. O build local
alertou que a base Browserslist está desatualizada.

### 4. Arquitetura e desempenho

- O lazy loading por rota e a separação de vendors são bons. Meça com Lighthouse
  e Web Vitals antes de acrescentar mais otimizações.
- `AdminEvents.jsx`, `Home.jsx`, `finance.js` e `teams.js` concentram muitas
  responsabilidades. Divida por caso de uso e extraia hooks (`useEvents`,
  `usePayments`) para reduzir regressões.
- Um cache de servidor como TanStack Query pode eliminar refetch duplicado, mas
  deve ser adotado gradualmente e com invalidação explícita.
- Como fotos e comprovantes são privados, a regra PWA atual para URLs `/public/`
  não os acelera. Avalie cache de URLs assinadas considerando expiração e
  privacidade no dispositivo.

### 5. UX, acessibilidade e operação

- Substitua `alert()` por notificações não bloqueantes com região `aria-live`.
- Formulários destrutivos precisam de estado ocupado, prevenção de duplo envio e
  confirmação acessível.
- Padronize telas de loading, vazio, offline e erro recuperável.
- Adicione Error Boundary no topo e uma página 404 explícita.
- Documente backup/restauração, rotação de credenciais, retenção de comprovantes e
  resposta a incidentes.

## Plano sugerido

### Sprint 1 — risco imediato

- Aplicar e verificar a ordem de migrações no ambiente real.
- Rotacionar a chave anon que aparecia no histórico e auditar as policies.
- Implementar RPC transacional para confirmação/rejeição de pagamentos.
- Criar CI com build, lint e primeiros testes de regras críticas.

### Sprint 2 — confiabilidade

- Migrar SQL para Supabase CLI e adicionar testes de RLS.
- Implementar RPCs idempotentes para placar, pontos, presença e multas.
- Adicionar Error Boundary, toasts e tratamento uniforme de erros.
- Instrumentar monitoramento sem registrar dados financeiros ou pessoais.

### Sprint 3 — evolução

- Refatorar páginas/serviços grandes em componentes, hooks e casos de uso.
- Adotar cache de servidor e skeletons com métricas antes/depois.
- Automatizar testes E2E dos fluxos essenciais e auditoria de acessibilidade.
