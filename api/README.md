
---

# 📄 README.md — VM2 (API + Frontend)

```markdown
# VM2 — Backend (Node.js/Express) + Frontend (HTML/JS)

Esta VM executa o **servidor da aplicação** (API + Frontend).

---

## ⚙️ Funções
- **API REST** desenvolvida em **Node.js + Express**:
  - CRUD de usuários, eventos e confirmações de presença.
  - Autenticação de usuários e controle de permissões (admin x usuário comum).
- **Frontend** em HTML/JS (publicado na pasta `public/`):
  - `login.html` → tela de autenticação.
  - `app.html` → gerenciamento de eventos e inscrições.
- Conexão direta com o banco de dados rodando na **VM3 (MySQL)**.

---

## 🛠 Tecnologias
- Ubuntu Server  
- **Node.js**  
- **Express.js**  
- **MySQL Client** (acessa banco da VM3)  

---

## 📂 Estrutura de pastas
/home/user_remote/gkevents-api
├── index.js # API principal
├── package.json # dependências
├── .env # variáveis de ambiente
└── public/ # frontend
├── login.html
├── app.html
└── styles.css


---

## 🔑 Variáveis de ambiente (.env)
```env
PORT=3000
SESSION_SECRET=gkevents-session-secret-123

DB_HOST=172.16.120.130
DB_USER=user_remote
DB_PASS=123456
DB_NAME=gkevents

# Instalar dependências
npm install

# Rodar servidor
node index.js

# Rodar servidor em background
nohup node index.js > output.log 2>&1 &

# Listar processos rodando Node.js
ps aux | grep node

# Matar processo (substitua <PID>)
kill -9 <PID>

# Conectar no MySQL da VM3
mysql -u gkevents -p -h 172.16.120.130 gkevents

# Ver tabelas
SHOW TABLES;

# Listar usuários
SELECT * FROM users;

