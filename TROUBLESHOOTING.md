# 🔧 Troubleshooting e Configurações Avançadas

## 🐛 Problemas Comuns e Soluções

### 1. Erro de Autenticação

**Sintoma:** "Invalid login credentials" ou "User not found"

**Soluções:**
```sql
-- Verifique se o usuário existe
SELECT * FROM auth.users WHERE email = 'seu@email.com';

-- Verifique se o member foi criado
SELECT * FROM members WHERE email = 'seu@email.com';

-- Se o member não existe, crie manualmente:
INSERT INTO members (id, nome, email, ativo)
VALUES (
  'UUID-DO-AUTH-USER',
  'Nome do Usuário',
  'seu@email.com',
  true
);
```

### 2. Admin não tem permissões

**Sintoma:** Usuário não consegue acessar /admin

**Solução:**
```sql
-- Verifique se é admin
SELECT * FROM admins WHERE member_id = 'UUID-DO-USUARIO';

-- Se não aparecer, adicione:
INSERT INTO admins (member_id) VALUES ('UUID-DO-USUARIO');
```

### 3. RLS Bloqueando Acesso

**Sintoma:** "Row Level Security policy violation"

**Verificar:**
```sql
-- Listar todas as policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Se necessário, desabilite temporariamente para debug:
ALTER TABLE nome_da_tabela DISABLE ROW LEVEL SECURITY;
-- ATENÇÃO: Não deixe assim em produção!

-- Reabilite depois:
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

### 4. Storage não funciona

**Sintoma:** Erro ao fazer upload de comprovante

**Soluções:**

1. Verificar se o bucket existe:
```sql
SELECT * FROM storage.buckets;
```

2. Criar o bucket se não existir (via SQL):
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true);
```

3. Adicionar policies de storage:
```sql
-- Policy para upload (INSERT)
INSERT INTO storage.policies (bucket_id, name, definition)
VALUES (
  'comprovantes',
  'Authenticated users can upload',
  '(bucket_id = ''comprovantes'')'::text
);

-- Policy para leitura (SELECT)
INSERT INTO storage.policies (bucket_id, name, definition)
VALUES (
  'comprovantes',
  'Public can read files',
  '(bucket_id = ''comprovantes'')'::text
);
```

### 5. Mensalidades não aparecem

**Sintoma:** Mês atual sem mensalidades

**Solução:** Gerar mensalidades manualmente via SQL:
```sql
-- Gerar para todos os membros ativos no mês atual
INSERT INTO dues (member_id, competencia, vencimento, valor, status)
SELECT 
  id,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '9 days',
  35.00,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM exemptions 
      WHERE exemptions.member_id = members.id 
      AND exemptions.competencia = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    ) THEN 'ISENTO'
    ELSE 'PENDENTE'
  END
FROM members
WHERE ativo = true
ON CONFLICT (member_id, competencia) DO NOTHING;
```

---

## ⚙️ Configurações Avançadas

### Customizar Valores

**Arquivo:** `src/services/events.js` e `src/services/finance.js`

```javascript
// Alterar valor da multa de atraso (padrão: R$ 5)
if (status === 'ATRASO') {
  await this.createFine(memberId, eventId, 'ATRASO', 10) // Alterado para R$ 10
}

// Alterar valor da falta confirmada (padrão: R$ 10)
if (rsvp && rsvp.status === 'VOU') {
  await this.createFine(memberId, eventId, 'FALTA_CONFIRMADA', 15) // Alterado para R$ 15
}

// Alterar valor do convidado (padrão: R$ 5 por pessoa)
const valor = quantidade * 10 // Alterado para R$ 10 por convidado
```

**Arquivo:** `src/services/finance.js`

```javascript
// Alterar valor da mensalidade (padrão: R$ 35)
const dues = members?.map(member => ({
  member_id: member.id,
  competencia: competencia,
  vencimento: vencimento,
  valor: exemptIds.includes(member.id) ? 0 : 50, // Alterado para R$ 50
  status: exemptIds.includes(member.id) ? 'ISENTO' : 'PENDENTE'
}))

// Alterar dia de vencimento (padrão: dia 10)
const vencimento = `${year}-${String(month).padStart(2, '0')}-05` // Alterado para dia 5
```

### Adicionar Novas Categorias

**Para Multas:**

1. Editar SQL:
```sql
ALTER TABLE fines DROP CONSTRAINT IF EXISTS fines_tipo_check;
ALTER TABLE fines ADD CONSTRAINT fines_tipo_check 
  CHECK (tipo IN ('ATRASO', 'FALTA_CONFIRMADA', 'CONVIDADO', 'NOVA_CATEGORIA'));
```

2. Adicionar no código onde necessário

**Para Caixa:**

Apenas adicionar no select do `AdminCaixa.jsx`:
```jsx
<select name="categoria" className="...">
  <option value="CAMPO">Campo</option>
  <option value="MATERIAIS">Materiais</option>
  <option value="CONFRATERNIZACAO">Confraternização</option>
  <option value="UNIFORME">Uniforme</option>
  <option value="OUTROS">Outros</option>
</select>
```

### Adicionar Notificações Push

O PWA já está preparado, mas você precisará implementar:

1. Adicionar Firebase Cloud Messaging
2. Criar função para enviar notificações
3. Solicitar permissão ao usuário

**Exemplo básico:**
```javascript
// Em src/services/notifications.js
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

export const sendNotification = (title, body) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body: body,
      icon: '/pwa-192x192.png'
    })
  }
}
```

### Backup Automático

Recomendado criar backup semanal do Supabase:

1. Vá em Supabase Dashboard → Database → Backups
2. Configure backup automático (disponível no plano free)
3. Ou export manual via:
```bash
pg_dump -h sua-url.supabase.co -U postgres -d postgres > backup.sql
```

### Adicionar Google Analytics

**Arquivo:** `index.html`

```html
<head>
  <!-- ... outros scripts ... -->
  
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</head>
```

---

## 📊 Queries Úteis

### Relatório Financeiro Completo
```sql
SELECT 
  m.nome,
  COUNT(DISTINCT d.id) as total_mensalidades,
  SUM(CASE WHEN d.status = 'PAGO' THEN d.valor ELSE 0 END) as pago,
  SUM(CASE WHEN d.status = 'PENDENTE' THEN d.valor ELSE 0 END) as pendente,
  COALESCE(SUM(f.valor), 0) as total_multas
FROM members m
LEFT JOIN dues d ON d.member_id = m.id
LEFT JOIN fines f ON f.member_id = m.id
WHERE m.ativo = true
GROUP BY m.id, m.nome
ORDER BY pendente DESC;
```

### Ranking de Presenças
```sql
SELECT 
  m.nome,
  COUNT(*) as total_jogos,
  SUM(CASE WHEN ea.status = 'PRESENTE' THEN 1 ELSE 0 END) as presencas,
  SUM(CASE WHEN ea.status = 'AUSENTE' THEN 1 ELSE 0 END) as faltas,
  SUM(CASE WHEN ea.status = 'ATRASO' THEN 1 ELSE 0 END) as atrasos,
  ROUND(
    (SUM(CASE WHEN ea.status = 'PRESENTE' THEN 1 ELSE 0 END)::float / 
    COUNT(*)::float * 100), 2
  ) as percentual_presenca
FROM members m
JOIN event_attendance ea ON ea.member_id = m.id
GROUP BY m.id, m.nome
ORDER BY percentual_presenca DESC;
```

### Extrato do Caixa por Período
```sql
SELECT 
  TO_CHAR(criado_em, 'YYYY-MM') as mes,
  tipo,
  categoria,
  COUNT(*) as quantidade,
  SUM(valor) as total
FROM cash_ledger
WHERE criado_em >= '2024-01-01'
GROUP BY mes, tipo, categoria
ORDER BY mes DESC, tipo, categoria;
```

### Quem Deve
```sql
SELECT 
  m.nome,
  m.email,
  d.competencia,
  d.valor,
  d.vencimento,
  CURRENT_DATE - d.vencimento as dias_atrasado
FROM dues d
JOIN members m ON m.id = d.member_id
WHERE d.status = 'PENDENTE'
  AND d.vencimento < CURRENT_DATE
ORDER BY dias_atrasado DESC;
```

---

## 🔐 Segurança

### Boas Práticas

1. **Nunca exponha service_role_key**
   - Use apenas anon/public key no frontend
   - service_role_key só para scripts backend

2. **RLS sempre habilitado**
   - Nunca desabilite RLS em produção
   - Teste policies cuidadosamente

3. **Validação de dados**
   - Sempre valide no frontend E no backend
   - Use constraints no banco

4. **Rate Limiting**
   - Supabase tem rate limit automático
   - Monitore em Dashboard → Reports

5. **HTTPS obrigatório**
   - Cloudflare fornece automaticamente
   - Nunca use HTTP em produção

### Auditoria

Monitorar ações importantes:
```sql
-- Ver últimas ações
SELECT 
  al.*,
  m.nome as quem_fez
FROM audit_logs al
LEFT JOIN members m ON m.id = al.member_id
ORDER BY al.criado_em DESC
LIMIT 50;
```

---

## 🚀 Performance

### Índices Adicionais (se necessário)

```sql
-- Se consultas por email ficarem lentas
CREATE INDEX idx_members_email ON members(email);

-- Se filtros por status ficarem lentos
CREATE INDEX idx_dues_status ON dues(status);
CREATE INDEX idx_event_rsvp_status ON event_rsvp(status);
```

### Cache

O PWA já faz cache automático via Service Worker.

Para cache mais agressivo, edite `vite.config.js`:
```javascript
workbox: {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'CacheFirst', // Mais agressivo
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 dias
        }
      }
    }
  ]
}
```

---

## 📱 Testes

### Testar PWA Localmente

```bash
# Build de produção
npm run build

# Servir com preview
npm run preview

# Testar instalação:
# 1. Abra https://localhost:4173 no Chrome
# 2. DevTools (F12) → Application → Service Workers
# 3. Verifique se registrou
# 4. Application → Manifest → verifique configuração
```

### Testar em Dispositivos Reais

Use ngrok para testar antes do deploy:
```bash
# Instalar ngrok
npm install -g ngrok

# Em um terminal, rode o dev server
npm run dev

# Em outro terminal
ngrok http 5173

# Use a URL https:// fornecida para testar no celular
```

---

## 💡 Dicas Finais

1. **Faça backup regular** do banco de dados
2. **Monitore o uso** no Supabase Dashboard
3. **Atualize dependências** mensalmente: `npm update`
4. **Teste sempre** antes de deploy em produção
5. **Documente mudanças** personalizadas que fizer

---

Dúvidas? Revise o README.md principal primeiro!
