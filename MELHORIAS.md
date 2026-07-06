# Patota CCC — Diagnóstico e Otimizações

Análise completa do projeto com foco nos três sintomas relatados:
travamento no PWA mobile, opção Admin sumindo ao voltar de outro app,
e lentidão no carregamento.

---

## 1. Causa raiz do "Admin some" e do travamento — `AuthContext.jsx`

Esse era o problema mais grave, e os dois sintomas vinham do mesmo lugar.

### O deadlock do Supabase

O callback do `onAuthStateChange` era `async` e fazia `await` em queries
do Supabase (`getMemberData`, `isAdmin`) **dentro do próprio callback**.
Isso é um problema conhecido do SDK: o cliente de auth segura um lock
interno enquanto processa os callbacks, e qualquer query `supabase.from()`
precisa desse mesmo lock para anexar o token. Resultado: **deadlock** —
a query fica pendurada até o `withTimeout` estourar (10s) e o failsafe (20s).

No mobile isso disparava toda vez que você voltava para o app, porque o
Supabase redispara `SIGNED_IN`/`TOKEN_REFRESHED` no `visibilitychange`.
A sequência era:

1. Volta pro app → `SIGNED_IN` dispara de novo
2. `setLoading(true)` → **o app inteiro vira "Carregando..."** (o travamento)
3. As queries deadlockam por 10–20 segundos
4. Cai no `catch` → se o cache do localStorage não estiver íntegro
   (iOS purga localStorage de PWAs em segundo plano), `isAdmin` vira
   `false` → **a aba Admin some**

### Agravante: inicialização dupla

No mount rodavam `checkUser()` **e** o evento `INITIAL_SESSION` do listener,
cada um chamando `loadMemberData` — 4 queries de auth em vez de 2 antes do
app renderizar qualquer coisa.

### O que mudou

- Callback do `onAuthStateChange` agora é **síncrono**; o trabalho pesado
  é adiado com `setTimeout(0)`, que roda depois do lock ser liberado
  (workaround documentado pelo próprio Supabase).
- `loadedUserIdRef` rastreia o último usuário carregado: eventos repetidos
  para o **mesmo** usuário (volta do background, token refresh) não refazem
  query nenhuma e **não derrubam a tela com loading**. O app continua
  exatamente onde estava.
- `isAdmin` agora é **sticky**: só muda com resposta bem-sucedida do banco
  ou `SIGNED_OUT`. Falha de rede/timeout **nunca** rebaixa admin.
- `checkUser()` removido — `INITIAL_SESSION` cobre o cold start sozinho.
- Revalidação silenciosa no `visibilitychange` (no máximo a cada 2 min),
  em segundo plano, sem loading e sem piscar a tela.

---

## 2. Lentidão de carregamento

### 2a. Bundle único de 473 KB → code splitting

O `App.jsx` importava todas as páginas estaticamente, inclusive as 9 telas
de admin. Quem abria a tela de login baixava e parseava o painel admin
inteiro. Agora:

- **`React.lazy` por rota**: cada página é um chunk separado, baixado só
  quando acessado. O chunk Admin (44 KB) não é mais enviado para quem
  não é admin.
- **`manualChunks` no Vite**: react, supabase, router, date-fns e ícones
  em chunks próprios. Entre deploys, o navegador reaproveita os vendors
  do cache (~350 KB) e baixa só o código do app que mudou (~40 KB).
  Para um PWA atualizado com frequência, esse é o maior ganho real.

| Build | Antes | Depois |
|---|---|---|
| JS inicial (tela de login) | 473 KB em 1 arquivo | ~355 KB em chunks paralelos |
| Chunk Admin p/ não-admins | incluído | **não baixa** |
| Re-download após deploy | 473 KB | ~40 KB (vendors ficam em cache) |

Sendo honesto sobre os números: react-dom (142 KB) + supabase-js (167 KB)
são o piso enquanto essas libs forem usadas — o splitting melhora
principalmente cache entre versões, paralelismo e tempo de parse. A
lentidão *percebida* vinha mais dos itens 1 e 2b do que do bundle em si.

### 2b. Waterfall de requisições na Home

A Home fazia **6 requisições em sequência**: próximo evento →
confirmação aberta → meu RSVP → times → pendências (+ PIX). Em 4G,
com 200–400ms de latência por round-trip, isso dava 1,5–2,5s só de rede.

O detalhe: `getNextEvent()` usa `select('*')` e **já retorna**
`data_limite_confirmacao`, `times_gerados`, `times_json` e todos os RSVPs.
Três das seis queries buscavam dados que já estavam na resposta da primeira.

Agora: **3 requisições em paralelo** (evento, pendências, PIX) e o resto
derivado localmente. Dentro de `getUserPendencies`, as duas queries
(mensalidades e multas) também rodam em paralelo.

### 2c. Extras

- `preconnect`/`dns-prefetch` para o Supabase no `index.html`
  (o `%VITE_SUPABASE_URL%` é substituído pela URL real no build) —
  economiza DNS+TLS antes da primeira query.
- `.single()` → `.maybeSingle()` em `getNextEvent` e `getUserRSVP`:
  ausência de linha é situação normal (sem próximo evento / ainda não
  respondeu) e não deve gerar erro PGRST116.
- `supabase-indices-performance.sql`: índices para os filtros que o app
  usa. Com poucos dados o ganho é pequeno, mas garante performance
  conforme o histórico crescer.

---

## 3. Reload forçado do service worker — `main.jsx`

O `onNeedRefresh() { updateSW(true) }` combinado com `registerType:
'autoUpdate'` forçava reload da página assim que uma nova versão era
detectada — inclusive no meio do uso. Ao voltar pro app depois de um
deploy, a página recarregava sozinha, o que somado ao bug de auth
parecia travamento/reset. Agora o `autoUpdate` cuida do ciclo sozinho,
e adicionei cache `CacheFirst` para imagens do Supabase Storage
(comprovantes abrem instantâneo na segunda vez).

---

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/contexts/AuthContext.jsx` | Correção do deadlock, admin sticky, sem loading em re-foco, init único, revalidação silenciosa |
| `src/App.jsx` | Lazy loading por rota + Suspense |
| `src/main.jsx` | Registro do SW sem reload forçado |
| `src/pages/Home.jsx` | 6 queries sequenciais → 3 paralelas + derivação local |
| `src/services/finance.js` | `getUserPendencies` paralelizado |
| `src/services/events.js` | `maybeSingle()` onde ausência é normal |
| `vite.config.js` | `manualChunks` + runtime cache do Storage |
| `index.html` | Preconnect para o Supabase |
| `supabase-indices-performance.sql` | **Novo** — índices (rodar no SQL Editor) |

## Como aplicar

1. Extraia o ZIP na raiz do projeto, sobrescrevendo os arquivos
2. Rode o `supabase-indices-performance.sql` no SQL Editor do Supabase
3. `npm run build` e deploy normal
4. No celular, feche e reabra o PWA (o SW novo assume no relaunch)

## Próximos passos recomendados (não incluídos)

1. **Atualizar `@supabase/supabase-js`** (está na 2.39, de jan/2024). As
   versões novas melhoraram exatamente o comportamento de lock e refresh
   de token no `visibilitychange`. Teste o fluxo de login depois de subir.
2. **TanStack Query (React Query)** para cache de dados entre navegações:
   voltar para uma aba mostraria dados instantâneos com revalidação em
   background, no app inteiro, sem gerenciar `loading` manual em cada página.
3. **Skeleton loaders** no lugar do texto "Carregando..." — melhora muito
   a percepção de velocidade no mobile.
4. **Trocar os `alert()`** (Home, Login) por toasts — `alert` bloqueia a
   thread e tem UX ruim em PWA standalone.
5. **Sorteio de times**: `sort(() => Math.random() - 0.5)` é enviesado;
   trocar por Fisher–Yates para um sorteio realmente justo.
6. **Integridade financeira**: `confirmPayment`/`createFine` fazem 2–3
   writes separados sem transação — se um falhar no meio, caixa e status
   divergem. O ideal é mover para uma função RPC (`plpgsql`) no Supabase.
7. **Conferir RLS**: a aba Admin sumir é cosmético; o que protege de
   verdade são as policies das tabelas (`admins`, `cash_ledger`, etc.)
   exigindo admin nas operações de escrita.
