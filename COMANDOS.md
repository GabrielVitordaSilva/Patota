# 📝 Comandos Úteis - Patota CCC

## 🚀 Comandos de Desenvolvimento

### Iniciar projeto pela primeira vez
```bash
# 1. Instalar dependências
npm install

# 2. Copiar arquivo de ambiente
cp .env.example .env

# 3. Editar .env com suas credenciais do Supabase
nano .env  # ou use seu editor preferido

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

### Desenvolvimento diário
```bash
# Iniciar servidor (http://localhost:5173)
npm run dev

# Build para produção
npm run build

# Testar build de produção localmente
npm run preview
```

---

## 📦 Gerenciamento de Dependências

### Atualizar pacotes
```bash
# Ver pacotes desatualizados
npm outdated

# Atualizar todos (cuidado!)
npm update

# Atualizar pacote específico
npm update react

# Instalar versão específica
npm install react@18.2.0
```

### Adicionar nova dependência
```bash
# Dependência de produção
npm install nome-do-pacote

# Dependência de desenvolvimento
npm install -D nome-do-pacote
```

---

## 🗄️ Comandos SQL Úteis (Supabase)

### Ver estrutura das tabelas
```sql
-- Listar todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Ver estrutura de uma tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'members';
```

### Limpar dados de teste
```sql
-- CUIDADO! Isso apaga tudo
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE points_ledger CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE cash_ledger CASCADE;
TRUNCATE TABLE fines CASCADE;
TRUNCATE TABLE exemptions CASCADE;
TRUNCATE TABLE dues CASCADE;
TRUNCATE TABLE event_attendance CASCADE;
TRUNCATE TABLE event_rsvp CASCADE;
TRUNCATE TABLE events CASCADE;
-- Não apague members e admins!
```

### Resetar sequências (IDs)
```sql
-- Depois de limpar dados, resete os IDs
ALTER SEQUENCE IF EXISTS events_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS dues_id_seq RESTART WITH 1;
-- Repita para outras tabelas se necessário
```

### Criar usuário de teste
```sql
-- Via SQL Editor do Supabase
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste@patota.com',
  crypt('senha123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Usuário Teste"}',
  false
);

-- O member será criado automaticamente pelo trigger
```

---

## 🔧 Git e Deploy

### Comandos Git básicos
```bash
# Ver status
git status

# Adicionar mudanças
git add .

# Commit
git commit -m "Descrição das mudanças"

# Push para GitHub
git push origin main

# Ver histórico
git log --oneline

# Criar branch nova
git checkout -b nome-da-feature

# Voltar para main
git checkout main

# Merge da feature
git merge nome-da-feature
```

### Deploy no Cloudflare
```bash
# Após fazer push no GitHub, o Cloudflare Pages
# fará deploy automaticamente!

# Para forçar rebuild sem mudar código:
git commit --allow-empty -m "Trigger rebuild"
git push
```

---

## 🧪 Testes e Debug

### Limpar cache do navegador
```bash
# Chrome DevTools (F12)
# Application → Storage → Clear site data

# Ou pelo navegador:
# Ctrl+Shift+Del → Limpar dados
```

### Testar PWA
```bash
# 1. Build
npm run build

# 2. Preview
npm run preview

# 3. Abrir Chrome/Edge em:
# http://localhost:4173

# 4. DevTools (F12) → Application
# - Service Workers: verificar registro
# - Manifest: verificar configuração
# - Storage: verificar cache
```

### Debug de Service Worker
```bash
# Chrome
chrome://serviceworker-internals/

# Edge
edge://serviceworker-internals/
```

---

## 📊 Backup e Restore

### Backup do Banco (via Supabase CLI)
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref seu-projeto-ref

# Dump do banco
supabase db dump -f backup.sql

# Dump apenas schema
supabase db dump --schema-only -f schema.sql

# Dump apenas dados
supabase db dump --data-only -f data.sql
```

### Restore
```bash
# Via Supabase CLI
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" backup.sql

# Ou via SQL Editor do Supabase
# Cole o conteúdo do backup.sql e execute
```

---

## 🔍 Análise e Logs

### Ver logs do Supabase
```bash
# No Dashboard do Supabase:
# Logs → Database → View logs
# Logs → API → View logs

# Filtrar por erro
# Logs → Filter → level: error
```

### Monitorar uso
```bash
# Supabase Dashboard → Settings → Usage
# Veja:
# - Database size
# - Storage usage
# - API requests
# - Bandwidth
```

---

## 🛠️ Manutenção

### Gerar mensalidades mensalmente
```sql
-- Executar todo dia 1º de cada mês
-- Via SQL Editor ou criar scheduled function

INSERT INTO dues (member_id, competencia, vencimento, valor, status)
SELECT 
  m.id,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '9 days',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM exemptions e
      WHERE e.member_id = m.id 
      AND e.competencia = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    ) THEN 0
    ELSE 35.00
  END,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM exemptions e
      WHERE e.member_id = m.id 
      AND e.competencia = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    ) THEN 'ISENTO'
    ELSE 'PENDENTE'
  END
FROM members m
WHERE m.ativo = true
ON CONFLICT (member_id, competencia) DO NOTHING;
```

### Limpar dados antigos
```sql
-- Remover logs com mais de 6 meses
DELETE FROM audit_logs 
WHERE criado_em < NOW() - INTERVAL '6 months';

-- Remover eventos com mais de 1 ano
DELETE FROM events 
WHERE data_hora < NOW() - INTERVAL '1 year';
```

### Reindexar banco (se performance cair)
```sql
-- Reindexar todas as tabelas
REINDEX DATABASE postgres;

-- Reindexar tabela específica
REINDEX TABLE members;

-- Atualizar estatísticas
ANALYZE;
```

---

## 🚨 Emergência

### Site fora do ar?

1. **Verificar Cloudflare Status**
   - https://www.cloudflarestatus.com

2. **Verificar Supabase Status**
   - https://status.supabase.com

3. **Ver logs de deploy**
   - Cloudflare Dashboard → Workers & Pages → patota-ccc → Deployments

4. **Rollback para versão anterior**
   - Cloudflare Dashboard → Deployments → Manage deployment → Rollback

### Banco corrompido?

1. **Restore do último backup**
   ```bash
   supabase db push backup.sql
   ```

2. **Se não tiver backup, recriar schema**
   ```bash
   # Execute supabase-schema.sql novamente
   ```

### Esqueci senha do admin?

1. **Reset via Supabase**
   - Dashboard → Authentication → Users
   - Clique no usuário → Send password recovery

2. **Ou via SQL**
   ```sql
   UPDATE auth.users 
   SET encrypted_password = crypt('nova-senha-123', gen_salt('bf'))
   WHERE email = 'admin@email.com';
   ```

---

## 📈 Performance

### Analisar queries lentas
```sql
-- Ver queries ativas
SELECT 
  pid,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Matar query travada
SELECT pg_terminate_backend(PID);
```

### Ver tamanho das tabelas
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 💡 Dicas Finais

```bash
# Sempre teste localmente antes de fazer deploy
npm run build && npm run preview

# Mantenha backup atualizado
# Execute backup semanalmente

# Monitore o uso do Supabase
# Não deixe atingir os limites do plano free

# Documente mudanças personalizadas
# Use git commit com mensagens descritivas

# Revise o código antes de commit
git diff

# Use branches para features grandes
git checkout -b nova-feature
```

---

**Bom desenvolvimento! ⚽**
