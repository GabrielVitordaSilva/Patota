# Ordem de instalação do banco

Em um projeto Supabase novo, execute os arquivos abaixo no **SQL Editor**, um
por vez e nesta ordem. Pare se algum comando falhar: continuar pode deixar o
banco em um estado parcial.

1. `supabase-schema.sql`
2. `supabase-add-event-confirmation-window.sql`
3. `supabase-add-payments-fines.sql`
4. `supabase-add-config.sql`
5. `supabase-add-member-position.sql`
6. `supabase-add-player-cards.sql`
7. `supabase-add-event-score.sql`
8. `supabase-add-goals-points.sql`
9. `supabase-remove-presence-points.sql`
10. `supabase-add-admin-crud.sql`
11. `supabase-security-hardening.sql`
12. `supabase-add-comprovantes-cleanup.sql`
13. `supabase-indices-performance.sql`
14. Execute `supabase-security-check.sql` para validar a instalação

## Verificações obrigatórias

- Os buckets `avatars` e `comprovantes` devem estar **privados**.
- Não devem restar policies de Storage com leitura pública ou `WITH CHECK (true)`.
- Um usuário novo deve entrar com `members.ativo = false` até aprovação.
- Um usuário comum não pode inserir pagamentos já confirmados nem alterar
  `members.ativo`, `members.email` ou `members.criado_em`.
- Guarde a senha do banco fora do repositório e nunca exponha a chave
  `service_role` no frontend.

> Estes arquivos ainda são migrações SQL manuais. Para produção, o próximo passo
> é movê-los para `supabase/migrations/` e aplicá-los pela Supabase CLI, com
> histórico e validação automatizados.
