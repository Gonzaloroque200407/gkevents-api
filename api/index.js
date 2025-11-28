// Carrega variáveis de ambiente
require("dotenv").config();

const IS_TEST = ["test", "test_integration", "integration"].includes(
  process.env.NODE_ENV
);

const path = require("path");
const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const EventEmitter = require("events");

const app = express();
const port = process.env.PORT || 3000;

/* ---------------------------------------
   Conexão MySQL (produção e testes)
---------------------------------------- */
let pool;

if (IS_TEST) {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

/* ---------------------------------------
   Session Store
---------------------------------------- */
let sessionStore;

if (IS_TEST) {
  // Session fake para testes
  sessionStore = new EventEmitter();
  sessionStore.get = (_, cb) => cb(null, null);
  sessionStore.set = (_, __, cb) => cb(null);
  sessionStore.destroy = (_, cb) => cb(null);
} else {
  // Session real
  sessionStore = new MySQLStore(
    {
      createDatabaseTable: true,
      schema: {
        tableName: "sessions",
        columnNames: {
          session_id: "session_id",
          expires: "expires",
          data: "data",
        },
      },
    },
    mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      connectionLimit: 5,
    })
  );
}

/* ---------------------------------------
   Middlewares
---------------------------------------- */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "gkevents-session-secret-123",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------------------------------
   Mock de sessão usado somente em testes
---------------------------------------- */
if (IS_TEST) {
  app.use((req, _res, next) => {
    if (req.headers["x-test-nosession"] === "1") {
      req.session.user = null;
      return next();
    }

    if (req.headers["x-mock-user"]) {
      try {
        req.session.user = JSON.parse(req.headers["x-mock-user"]);
      } catch {
        req.session.user = null;
      }
      return next();
    }

    req.session.user = null;
    next();
  });
}

/* ---------------------------------------
   Arquivos estáticos (produção)
---------------------------------------- */
if (!IS_TEST) {
  app.use(express.static(path.join(__dirname, "public")));
}

/* ---------------------------------------
   Helpers de autenticação
---------------------------------------- */
function authUser(req, res) {
  if (!req.session || !req.session.user) {
    res.status(401).json({ ok: false, error: "not_authenticated" });
    return null;
  }
  return req.session.user;
}

function authAdmin(req, res) {
  const u = authUser(req, res);
  if (!u) return null;

  if (u.role !== "admin") {
    res.status(403).json({ ok: false, error: "forbidden" });
    return null;
  }

  return u;
}

/* ---------------------------------------
   Healthcheck
---------------------------------------- */
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "db_unreachable" });
  }
});

/* ---------------------------------------
   Sessão
---------------------------------------- */
app.get("/api/me", (req, res) => {
  res.json({ ok: true, user: req.session.user || null });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

/* ---------------------------------------
   Login
---------------------------------------- */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password)
      return res.status(400).json({ ok: false, error: "missing_fields" });

    const sql = `
      SELECT id,name,email,role
      FROM users
      WHERE email=? AND password_hash=LOWER(SHA2(?,256))
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [email.trim(), password]);

    if (!rows.length)
      return res.status(401).json({ ok: false, error: "invalid_credentials" });

    req.session.user = rows[0];
    res.json({ ok: true, user: rows[0] });
  } catch {
    res.status(500).json({ ok: false, error: "login_failed" });
  }
});

/* ---------------------------------------
   Registro
---------------------------------------- */
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!email || !password)
      return res.status(400).json({ ok: false, error: "missing_fields" });

    const sql = `
      INSERT INTO users (name,email,password_hash,role)
      VALUES (?,?,LOWER(SHA2(?,256)),'user')
    `;

    const [r] = await pool.query(sql, [
      name || null,
      email.trim(),
      password,
    ]);

    res.json({
      ok: true,
      user: { id: r.insertId, name, email: email.trim(), role: "user" },
    });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY")
      return res.status(409).json({ ok: false, error: "email_in_use" });

    res.status(500).json({ ok: false, error: "register_failed" });
  }
});

/* ---------------------------------------
   Lista de eventos
---------------------------------------- */
app.get("/api/events", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    let sql = "SELECT id,name,date,location,created_at FROM events";
    const params = [];

    if (q) {
      sql += " WHERE name LIKE ? OR location LIKE ?";
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY date ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch {
    res.status(500).json({ ok: false, error: "list_failed" });
  }
});

/* ---------------------------------------
   Detalhes do evento
---------------------------------------- */
app.get("/api/events/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [[event]] = await pool.query(
      "SELECT id,name,date,location,created_at FROM events WHERE id=?",
      [id]
    );

    if (!event)
      return res.status(404).json({ ok: false, error: "not_found" });

    const [attendees] = await pool.query(
      `
      SELECT ea.user_id, u.name, u.email
      FROM event_attendees ea
      JOIN users u ON u.id = ea.user_id
      WHERE ea.event_id=?
      ORDER BY u.name
      `,
      [id]
    );

    res.json({ event, attendees });
  } catch {
    res.status(500).json({ ok: false, error: "detail_failed" });
  }
});

/* ---------------------------------------
   Criar evento (Admin)
---------------------------------------- */
app.post("/api/events", async (req, res) => {
  if (!authAdmin(req, res)) return;

  try {
    const { name, date, location } = req.body;

    if (!name || !date || !location)
      return res.status(400).json({ ok: false, error: "missing_fields" });

    const sql = "INSERT INTO events (name, date, location) VALUES (?, ?, ?)";
    const [result] = await pool.execute(sql, [name, date, location]);

    res.json({
      ok: true,
      id: result.insertId,
      name,
      date,
      location,
    });
  } catch {
    res.status(500).json({ ok: false, error: "create_failed" });
  }
});

/* ---------------------------------------
   Atualizar evento
---------------------------------------- */
app.put("/api/events/:id", async (req, res) => {
  if (!authAdmin(req, res)) return;

  try {
    const id = Number(req.params.id);
    const { name, date, location } = req.body;

    if (!id || !name || !date || !location)
      return res.status(400).json({ ok: false, error: "missing_fields" });

    await pool.query(
      "UPDATE events SET name=?, date=?, location=? WHERE id=?",
      [name, date, location, id]
    );

    res.json({ ok: true, id, name, date, location });
  } catch {
    res.status(500).json({ ok: false, error: "update_failed" });
  }
});

/* ---------------------------------------
   Deletar evento
---------------------------------------- */
app.delete("/api/events/:id", async (req, res) => {
  if (!authAdmin(req, res)) return;

  try {
    const id = Number(req.params.id);

    await pool.query("DELETE FROM event_attendees WHERE event_id=?", [id]);
    await pool.query("DELETE FROM events WHERE id=?", [id]);

    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "delete_failed" });
  }
});

/* ---------------------------------------
   Confirmar presença
---------------------------------------- */
app.post("/api/events/:id/confirm", async (req, res) => {
  const user = authUser(req, res);
  if (!user) return;

  try {
    await pool.query(
      `
      INSERT INTO event_attendees (event_id, user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE event_id = VALUES(event_id)
      `,
      [Number(req.params.id), user.id]
    );

    res.json({ ok: true, joined: true });
  } catch {
    res.status(500).json({ ok: false, error: "confirm_failed" });
  }
});

/* ---------------------------------------
   Cancelar presença
---------------------------------------- */
app.delete("/api/events/:id/confirm", async (req, res) => {
  const user = authUser(req, res);
  if (!user) return;

  try {
    await pool.query(
      "DELETE FROM event_attendees WHERE event_id=? AND user_id=?",
      [Number(req.params.id), user.id]
    );

    res.json({ ok: true, left: true });
  } catch {
    res.status(500).json({ ok: false, error: "unconfirm_failed" });
  }
});

/* ---------------------------------------
   Exporta app para testes
---------------------------------------- */
module.exports = app;

/* ---------------------------------------
   Inicia servidor em produção
---------------------------------------- */
if (!IS_TEST) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`GkEvents API rodando em http://0.0.0.0:${port}`);
  });
}
