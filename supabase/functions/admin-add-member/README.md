# admin-add-member Edge Function

Cria usuarios via `auth.admin.createUser` com seguranca, sem expor `service_role` no frontend.

## Deploy

```bash
supabase functions deploy admin-add-member
```

## Teste local (opcional)

```bash
supabase functions serve admin-add-member --no-verify-jwt
```

## Como funciona

- Recebe o JWT do usuario logado no header `Authorization`.
- Valida se esse usuario existe.
- Confere se ele e admin pela tabela `admins`.
- Se for admin, cria o novo usuario no Auth.
- O trigger `handle_new_user` ja cria o registro na tabela `members`.

## Payload esperado

```json
{
  "name": "Nome do Membro",
  "email": "email@dominio.com",
  "password": "123456"
}
```