# 🏃‍♂️ Patota CCC - Sistema de Gestão

Sistema completo para gestão de patota esportiva com controle de presenças, mensalidades, multas, ranking e caixa.

## 🚀 Stack 100% Gratuita

- **Frontend:** React + Vite + Tailwind CSS
- **PWA:** Instalável no celular + funciona offline
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Hospedagem:** Cloudflare Pages
- **Tudo Free!**

## 📋 Funcionalidades

### Para Jogadores
- ✅ Confirmar presença em jogos
- 💰 Ver pendências financeiras (mensalidades + multas)
- 📋 Copiar chave PIX com 1 clique
- 📤 Enviar comprovantes de pagamento
- 🏆 Acompanhar ranking de pontos
- 📅 Ver próximos eventos
- 📜 Consultar regras e valores

### Para Administradores
- 📅 Criar e gerenciar eventos
- ✓ Marcar presença (Presente/Atraso/Ausente/Justificado)
- 💵 Confirmar pagamentos
- 💰 Gerenciar caixa (entradas e saídas)
- 👥 Ativar/desativar membros
- 🏥 Criar isenções (lesão/trabalho)
- 📊 Relatórios mensais

## 🎯 Regras do Sistema

### Mensalidade
- **Valor:** R$ 35,00
- **Vencimento:** Todo dia 10
- **Isenção:** Lesão ou trabalho isenta o mês

### Multas (entram no caixa)
- **Atraso:** R$ 5,00
- **Falta confirmada:** R$ 10,00 (confirmou "Vou" e faltou)
- **Convidado:** R$ 5,00 por pessoa

### Pontos
- **+1 ponto** por presença em jogo

---

## 🛠️ Instalação Completa

### 1️⃣ Configurar Supabase

#### 1.1. Criar Projeto
1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Crie uma conta (se não tiver)
4. Clique em "New Project"
5. Escolha:
   - **Name:** patota-ccc
   - **Database Password:** Patota2026@
   - **Region:** South America (São Paulo)
   - **Pricing Plan:** Free
6. Clique em "Create new project"
7. Aguarde ~2 minutos para provisionar

#### 1.2. Executar SQL do Banco
1. No painel do Supabase, vá em **SQL Editor** (ícone 🗄️ no menu lateral)
2. Clique em "+ New query"
3. Copie TODO o conteúdo do arquivo `supabase-schema.sql`
4. Cole no editor
5. Clique em "Run" (ou Ctrl+Enter)
6. Aguarde aparecer "Success. No rows returned"

#### 1.3. Criar Storage para Comprovantes
1. Vá em **Storage** (ícone 📦 no menu lateral)
2. Clique em "Create a new bucket"
3. Configure:
   - **Name:** comprovantes
   - **Public bucket:** ✅ Marcado
4. Clique em "Create bucket"
5. Clique no bucket "comprovantes" criado
6. Clique em "Policies" → "New Policy"
7. Escolha "For full customization"
8. Configure a policy:
   - **Policy name:** public_upload
   - **Allowed operation:** INSERT
   - **Target roles:** authenticated
   - **Policy definition:** `true`
9. Clique em "Review" → "Save policy"
10. Repita para SELECT:
    - **Policy name:** public_read
    - **Allowed operation:** SELECT
    - **Target roles:** public
    - **Policy definition:** `true`

#### 1.4. Obter Credenciais
1. Vá em **Settings** (ícone ⚙️ no menu lateral)
2. Clique em "API"
3. Anote os valores:
   - **Project URL** (algo como: https://gfzfeuppwgyvaadtmfbd.supabase.co)
   - **anon/public key** (ceyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmemZldXBwd2d5dmFhZHRtZmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTEyNTUsImV4cCI6MjA4Njc4NzI1NX0._6-_Ih4bUxby7WMki5NUJ1ZhqckatlujFqOhV7i5tAs)

#### 1.5. Criar Primeiro Admin
1. Vá em **Authentication** → **Users**
2. Clique em "Add user" → "Create new user"
3. Preencha:
   - **Email:** ganriel
   - **Password:** sua senha
   - **Auto Confirm User:** ✅ Marcado
4. Clique em "Create user"
5. **COPIE O UUID** do usuário criado (aparece na coluna "UID")
6. Vá em **SQL Editor** → New query
7. Execute:
```sql
INSERT INTO admins (member_id) VALUES ('UUID-QUE-VOCE-COPIOU');
```

---

### 2️⃣ Configurar o Projeto Local

#### 2.1. Instalar Dependências
```bash
cd patota-ccc
npm install
```

#### 2.2. Configurar Variáveis de Ambiente
1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e preencha com as credenciais do Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-copiada
```

#### 2.3. Testar Localmente
```bash
npm run dev
```

Acesse: http://localhost:5173

**Faça login com o usuário admin que você criou!**

---

### 3️⃣ Deploy no Cloudflare Pages

#### 3.1. Preparar Repositório Git
```bash
git init
git add .
git commit -m "Initial commit"
```

#### 3.2. Criar Repositório no GitHub
1. Acesse [github.com](https://github.com)
2. Clique em "+" → "New repository"
3. Configure:
   - **Repository name:** patota-ccc
   - **Private/Public:** sua escolha
4. Clique em "Create repository"
5. Execute os comandos mostrados na tela:
```bash
git remote add origin https://github.com/seu-usuario/patota-ccc.git
git branch -M main
git push -u origin main
```

#### 3.3. Deploy no Cloudflare
1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. Crie uma conta (se não tiver)
3. No menu lateral, clique em "Workers & Pages"
4. Clique em "Create application"
5. Clique na aba "Pages"
6. Clique em "Connect to Git"
7. Conecte sua conta do GitHub
8. Selecione o repositório "patota-ccc"
9. Configure:
   - **Project name:** patota-ccc
   - **Production branch:** main
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
10. Clique em "Environment variables (advanced)"
11. Adicione as variáveis:
    - **Variable name:** VITE_SUPABASE_URL → **Value:** sua URL do Supabase
    - **Variable name:** VITE_SUPABASE_ANON_KEY → **Value:** sua chave do Supabase
12. Clique em "Save and Deploy"
13. Aguarde ~2 minutos
14. Seu app estará no ar em: `https://patota-ccc.pages.dev`

---

## 📱 Instalar como PWA no Celular

### Android (Chrome)
1. Abra o site no Chrome
2. Clique nos 3 pontinhos (⋮)
3. Selecione "Adicionar à tela inicial"
4. Confirme
5. Pronto! Ícone aparecerá na tela inicial

### iOS (Safari)
1. Abra o site no Safari
2. Toque no botão de compartilhar (□↑)
3. Role e toque em "Adicionar à Tela de Início"
4. Toque em "Adicionar"
5. Pronto! Ícone aparecerá na tela inicial

---

## 🔧 Configurações Adicionais

### Alterar Chave PIX
Edite em 3 lugares no código:

1. `src/pages/Home.jsx` - linha ~56
2. `src/pages/Finance.jsx` - linha ~36
3. `src/pages/Rules.jsx` - linha ~5

Substitua `'seupix@exemplo.com'` pela sua chave PIX real.

### Adicionar Mais Admins
Execute no SQL Editor do Supabase:
```sql
-- Primeiro, encontre o UUID do membro
SELECT id, nome, email FROM members;

-- Depois, torne-o admin
INSERT INTO admins (member_id) VALUES ('UUID-DO-MEMBRO');
```

### Gerar Mensalidades do Mês
Entre como admin e:
1. Vá em Admin → Membros
2. Clique em "Gerar Mensalidades do Mês"
3. Isso criará mensalidades de R$ 35 para todos os membros ativos

---

## 📊 Fluxos Principais

### Fluxo de Pagamento
1. Jogador vê pendência na home
2. Clica em "Copiar PIX" e faz o pagamento
3. Vai em Financeiro → clica em "Enviar Comprovante"
4. Admin recebe notificação
5. Admin vai em Admin → Pagamentos → Confirma
6. Status muda para PAGO e entra no caixa automaticamente

### Fluxo de Multas Automáticas
1. Admin marca presença de um jogador como "ATRASO"
   → Sistema cria multa de R$ 5 automaticamente
   → Lança R$ 5 no caixa como entrada

2. Admin marca como "AUSENTE" um jogador que confirmou "VOU"
   → Sistema cria multa de R$ 10 automaticamente
   → Lança R$ 10 no caixa como entrada

### Fluxo de Pontos
1. Admin marca presença como "PRESENTE" em um JOGO
   → Sistema adiciona +1 ponto para o jogador automaticamente
   → Atualiza ranking

---

## 🐛 Problemas Comuns

### "Invalid API key"
- Verifique se copiou a chave completa do Supabase
- Certifique-se de usar a "anon public" key, não a service_role

### "Row Level Security policy violation"
- Confirme que executou TODO o SQL do schema
- Verifique se criou o primeiro admin corretamente

### Storage "not found"
- Verifique se criou o bucket "comprovantes"
- Confirme que marcou como "public"
- Verifique as policies de INSERT e SELECT

### PWA não instala
- Certifique-se de acessar via HTTPS (no Cloudflare já é automático)
- Limpe o cache do navegador
- Tente em modo anônimo primeiro

---

## 📝 Estrutura do Projeto

```
patota-ccc/
├── src/
│   ├── components/
│   │   └── Layout.jsx          # Layout principal com navegação
│   ├── contexts/
│   │   └── AuthContext.jsx     # Gerenciamento de autenticação
│   ├── pages/
│   │   ├── Login.jsx           # Tela de login
│   │   ├── Home.jsx            # Dashboard principal
│   │   ├── Events.jsx          # Lista de eventos
│   │   ├── Finance.jsx         # Financeiro do jogador
│   │   ├── Ranking.jsx         # Ranking de pontos
│   │   ├── Rules.jsx           # Regras e valores
│   │   └── admin/
│   │       ├── Admin.jsx       # Painel admin
│   │       ├── AdminEvents.jsx # Gestão de eventos
│   │       ├── AdminCaixa.jsx  # Gestão do caixa
│   │       ├── AdminMembers.jsx# Gestão de membros
│   │       └── AdminPayments.jsx # Confirmação de pagamentos
│   ├── services/
│   │   ├── supabaseClient.js   # Cliente Supabase
│   │   ├── auth.js             # Serviços de autenticação
│   │   ├── events.js           # Serviços de eventos
│   │   ├── finance.js          # Serviços financeiros
│   │   ├── ranking.js          # Serviços de ranking
│   │   └── admin.js            # Serviços admin
│   ├── App.jsx                 # Rotas principais
│   ├── main.jsx                # Entry point
│   └── index.css               # Estilos globais
├── supabase-schema.sql         # Schema completo do banco
├── package.json                # Dependências
├── vite.config.js              # Config do Vite + PWA
└── README.md                   # Este arquivo
```

---

## 🎓 Próximos Passos

Após configurar tudo:

1. ✅ Crie os primeiros membros (via interface de cadastro ou SQL)
2. ✅ Torne os admins (via SQL)
3. ✅ Crie o primeiro evento
4. ✅ Gere as mensalidades do mês
5. ✅ Compartilhe o link com a patota!

---

## 🤝 Suporte

Problemas? Sugestões?
- Verifique este README primeiro
- Revise os logs no console do navegador (F12)
- Verifique o SQL Editor do Supabase por erros

---

## 📄 Licença

MIT - Use à vontade!

---

**Feito com ⚽ para a Patota CCC**
