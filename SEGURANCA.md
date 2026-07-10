# Relatório de Segurança — Patota CCC

Auditoria completa do app com foco em vazamento de dados, fotos/arquivos e
invasão via console do navegador (F12). Este documento explica o que estava
exposto, o que foi corrigido e o que precisa ser feito no painel do Supabase.

## Como a segurança funciona neste app (importante entender)

O app é um site React que fala direto com o Supabase usando a **anon key**.
Essa chave fica **visível para qualquer pessoa** que abrir o F12 — isso é o
design do Supabase, não é falha. Consequência: **nenhuma proteção que esteja
no código da tela vale alguma coisa**, porque um atacante pode ignorar o site
e chamar a API diretamente com a anon key.

A segurança real mora em 3 lugares, todos no banco:

1. **RLS (Row Level Security)** — regras por linha em cada tabela;
2. **Policies de Storage** — regras por arquivo nos buckets;
3. **Funções SECURITY DEFINER** — operações sensíveis com validação no servidor.

Foi exatamente isso que esta auditoria reforçou.

## O que estava exposto (e foi corrigido)

| # | Risco | Gravidade | Correção |
|---|-------|-----------|----------|
| 1 | Tabelas `members` (com **emails**), `events`, `event_rsvp`, `event_attendance`, `points_ledger`, `config` (chave PIX) e `player_ratings` legíveis por **qualquer pessoa na internet** com a anon key, sem login (`USING (true)`) | **Crítica** | Toda leitura agora exige login **e** cadastro ativo aprovado pelo admin |
| 2 | Qualquer pessoa podia se **auto-cadastrar via API** (`signUp`) e virar membro ativo com acesso a tudo | **Crítica** | Cadastro novo entra **INATIVO** e não enxerga nada até um admin ativar (o formulário do admin ativa sozinho) |
| 3 | Membro podia editar o próprio perfil e **se auto-ativar** ou trocar o email (a policy de auto-edição não limitava colunas) | **Alta** | Trigger no banco congela `id`, `email`, `ativo` e `criado_em` para quem não é admin |
| 4 | Bucket de **comprovantes de pagamento público**: qualquer pessoa com o link abria dados financeiros | **Alta** | Bucket privado; cada membro só vê os próprios comprovantes, admin vê todos; exibição via URL assinada com validade de 1h |
| 5 | Bucket de **fotos público** + upload liberado: qualquer membro podia sobrescrever a foto dos outros ou usar o bucket como depósito de arquivos | **Alta** | Bucket privado com URL assinada; upload só na pasta do próprio usuário (`{uid}/arquivo`); limite de 5MB e somente imagens, validado **no servidor** |
| 6 | Pagamento podia ser inserido via API já com `status = 'CONFIRMADO'` | **Média** | Policy exige `status = 'PENDENTE'` em todo pagamento criado por membro |
| 7 | Policy de admins autorreferente (risco de recursão/comportamento imprevisível) | **Média** | Checagens de permissão centralizadas nas funções `is_admin()` e `is_active_member()` (SECURITY DEFINER) |
| 8 | "Desativar" membro não bloqueava acesso aos dados | **Média** | Membro inativo agora não lê nada além do próprio nome |

## O que já estava certo (verificado)

- **Chaves fora do código**: URL e anon key vêm de variáveis de ambiente; `.env` está no `.gitignore` e não há chave commitada no repositório.
- **Sem `dangerouslySetInnerHTML`, `eval` ou `innerHTML`** — React escapa todo texto por padrão, o que bloqueia XSS nos dados vindos do banco (nomes, observações etc.).
- **Escrita nas tabelas** já era razoavelmente protegida (criar eventos/multas/pontos só admin; RSVP e pagamentos só o próprio).
- **Exclusão de membro** valida admin no servidor (função `delete_member`).
- A **service_role key** (a chave perigosa) não é usada no app — nunca coloque ela no front-end.

## O que o F12 ainda "consegue" (e por que não importa)

- **Ver a anon key e a URL do projeto** — por design; com as policies novas, essa chave sem login não lê nem escreve nada.
- **Alterar a tela local** (ex: habilitar um botão de admin) — a chamada que o botão faz é barrada pelo banco; a pessoa só quebra a própria tela.
- **Criar uma conta via API** — entra inativa, sem acesso a nenhum dado, e fica visível para o admin excluir.

## Ações necessárias no Supabase (checklist)

1. **Executar `supabase-security-hardening.sql`** no SQL Editor — é ele que aplica tudo deste relatório. Pode rodar mais de uma vez sem problema.
2. Conferir em **Storage → Policies** se o bucket `comprovantes` tem policies antigas criadas pelo dashboard e **remover as permissivas** (as novas se chamam "Comprovante leitura propria ou admin" e "Comprovante upload proprio").
3. Recomendado, em **Authentication → Settings**: ativar **confirmação de email**, **proteção contra senhas vazadas** (Leaked Password Protection) e o **CAPTCHA** nas telas de auth se um dia abrir cadastro público.
4. Recomendado: manter **backups automáticos** habilitados (Database → Backups).

## O que um membro comum (não-admin) pode enviar

Exatamente e somente isto, garantido pelas policies do banco (não pela tela):

- **Foto do próprio card** → upload apenas na pasta dele (`{seu-id}/...`) no bucket `avatars`; não consegue tocar na foto de outro membro.
- **Comprovante do próprio pagamento** → upload apenas na pasta dele no bucket `comprovantes`; só ele e o admin conseguem abrir o arquivo.
- Além de arquivos: confirmar presença (RSVP), avaliar os outros jogadores nos cards e registrar pagamento próprio (sempre `PENDENTE`).

Membro comum **não** exclui arquivo nenhum, não lê comprovante dos outros, não escreve em nenhum outro bucket ou tabela administrativa.

## Retenção de comprovantes

O Supabase não apaga arquivos sozinho. A retenção é feita pelo admin no app:
botão **"Limpar comprovantes antigos"** na aba Pagamentos — pergunta quantos
meses manter (sugestão: 6), exclui os arquivos mais antigos que isso e limpa a
referência nos pagamentos (o registro financeiro do pagamento é preservado;
só o arquivo morre). Requer a migração `supabase-add-comprovantes-cleanup.sql`,
que dá o direito de exclusão **apenas ao admin**.

## Limitações conhecidas (transparência)

- **Emails visíveis para membros ativos**: o app é de grupo fechado e a lista de membros mostra email (usado pelo admin). Quem já é membro ativo vê os emails dos outros. Se quiser esconder, dá para restringir a coluna só para admins — me peça.
- **Comprovantes antigos**: os enviados antes desta mudança foram salvos com URL pública no banco. Depois de rodar a migração o bucket fica privado e os links públicos antigos **param de funcionar fora do app**; dentro do app o admin continua vendo tudo (conversão automática para URL assinada).
- **Fotos**: as URLs assinadas valem 1h; quem tiver uma URL assinada em mãos consegue ver aquela foto até expirar. É o modelo padrão do Supabase para conteúdo privado.
- **RSVP fora do prazo**: o bloqueio de confirmação após o sorteio é validado só na tela; via API alguém conseguiria marcar "VOU" atrasado. Impacto baixo (não gera ponto nem escala no time), mas dá para travar no banco se quiser.

## Arquivos desta auditoria

- `supabase-security-hardening.sql` — todas as correções de banco e storage.
- `src/services/storageUtils.js` — conversão de URLs antigas para caminhos.
- `src/services/cards.js` / `src/pages/Cards.jsx` — fotos privadas com URL assinada.
- `src/services/finance.js` / `src/pages/admin/AdminPayments.jsx` — comprovantes privados com URL assinada.
- `src/pages/admin/AdminAddMember.jsx` — ativação automática do membro criado pelo admin.
