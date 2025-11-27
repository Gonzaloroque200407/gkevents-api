require("dotenv").config();
const path = require("path");
const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const EventEmitter = require("events");

const app = express();
const port = process.env.PORT || 3000;

// =====================================================================
//  DB POOL (CORRIGIDO PARA UNIT TEST + INTEGRATION + PRODUÇÃO)
// =====================================================================
let pool;

// Jest define automaticamente process.env.JEST_WORKER_ID
const isUnitTest = !!process.env.JEST_WORKER_ID;

// Integração usa NODE_ENV=test_integration
const isIntegrationTest =
  process.env.NODE_ENV === "test_integration" ||
  process.env.NODE_ENV === "integration";

// Se for TESTE UNITÁRIO → mock interno
if (isUnitTest) {
  pool = {
    query: async () => [[]], // devolve array vazio sem quebrar
  };
} else {
  // Testes de integração ou produção usam pool real
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
  });
}

module.exports.pool = pool;

// =====================================================================
//  SESSION STORE (corrigido para unit tests)
// =====================================================================
let sessionStore;

if (isUnitTest || isIntegrationTest) {
  // Fake session store
  sessionStore = new EventEmitter();
  sessionStore.get = (_, cb) => cb(null, null);
  sessionStore.set = (_, __, cb) => cb(null);
  sessionStore.destroy = (_, cb) => cb(null);
} else {
  // Session store real
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

// =====================================================================
//  SESSIONS
// =====================================================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "gkevents-session-secret-123",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================================
//  MOCK DE SESSÃO EM TESTES
// =====================================================================
if (isUnitTest || isIntegrationTest) {
  app.use((req, res, next) => {
    if (req.headers["x-test-nosession"] === "1") {
      req.session.user = null;
      return next();
    }

    const mocked = req.headers["x-mock-user"];
    if (mocked) {
      try {
        req.session.user = JSON.parse(mocked);
      } catch {
        req.session.user = null;
      }
      return next();
    }

    if (!req.session.user) req.session.user = null;
    next();
  });
}

// =====================================================================
//  STATIC FILES (não carrega em testes)
// =====================================================================
if (!isUnitTest && !isIntegrationTest) {
  app.use(express.static(path.join(__dirname, "public")));
}

// =====================================================================
//  ROOT
// =====================================================================
app.get("/", (_, res) => res.redirect("/login.html"));

// =====================================================================
//  HELPERS
// =====================================================================
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

// =====================================================================
//  HEALTHCHECK
// =====================================================================
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "db_unreachable" });
  }
});

// =====================================================================
//  SESSION ROUTES
// =====================================================================
app.get("/api/me", (req, res) => {
  res.json({ ok: true, user: req.session.user || null });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// =====================================================================
//  LOGIN
// =====================================================================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password)
      return res.status(400).json({ ok: false, error: "missing_fields" });

    const sql =
      "SELECT id,name,email,role FROM users WHERE email=? AND password_hash=LOWER(SHA2(?,256)) LIMIT 1";

    const [rows] = await pool.query(sql, [email.trim(), password]);

    if (!rows.length)
      return res.status(401).json({ ok: false, error: "invalid_credentials" });

    req.session.user = rows[0];

    res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error("login error:", e);
    res.status(500).json({ ok: false, error: "login_failed" });
  }
});

// =====================================================================
//  REGISTER
// =====================================================================
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!email || !password)
      return res.status(400).json({ ok: false, error: "missing_fields" });

    const sql =
      "INSERT INTO users (name,email,password_hash,role) VALUES (?,?,LOWER(SHA2(?,256)),'user')";

    const [r] = await pool.query(sql, [name || null, email.trim(), password]);

    res.json({
      ok: true,
      user: { id: r.insertId, name, email: email.trim(), role: "user" },
    });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY")
      return res.status(409).json({ ok: false, error: "email_in_use" });

    console.error("register error:", e);
    res.status(500).json({ ok: false, error: "register_failed" });
  }
});

// =====================================================================
//  LIST EVENTS
// =====================================================================
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
  } catch (e) {
    console.error("events list error:", e);
    res.status(500).json({ ok: false, error: "list_failed" });
  }
});

// =====================================================================
//  EVENT DETAILS
// =====================================================================
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
      `SELECT ea.user_id, u.name, u.email
         FROM event_attendees ea
         JOIN users u ON u.id = ea.user_id
         WHERE ea.event_id=?
         ORDER BY u.name`,
      [id]
    );

    res.json({ event, attendees });
  } catch (e) {
    console.error("event details error:", e);
    res.status(500).json({ ok: false, error: "detail_failed" });
  }
});

// =====================================================================
//  CRUD EVENTS (ADMIN ONLY)
// =====================================================================
app.post("/api/events", async (req, res) => {
  if (!authAdmin(req, res)) return;

  try {
    const { name, date, location } = req.body;

    if (!name || !date || !location)
      return res.status(400).json({ ok: false, error: "missing_fields" });

    const [r] = await pool.query(
      "INSERT INTO events (name,date,location) VALUES (?,?,?)",
      [name, date, location]
    );

    res.json({ ok: true, id: r.insertId, name, date, location });
  } catch (e) {
    console.error("create event error:", e);
    res.status(500).json({ ok: false, error: "create_failed" });
  }
});

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
  } catch (e) {
    console.error("update event error:", e);
    res.status(500).json({ ok: false, error: "update_failed" });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  if (!authAdmin(req, res)) return;

  try {
    const id = Number(req.params.id);

    await pool.query("DELETE FROM event_attendees WHERE event_id=?", [id]);
    await pool.query("DELETE FROM events WHERE id=?", [id]);

    res.json({ ok: true });
  } catch (e) {
    console.error("delete event error:", e);
    res.status(500).json({ ok: false, error: "delete_failed" });
  }
});

// =====================================================================
//  CONFIRM & UNCONFIRM
// =====================================================================
app.post("/api/events/:id/confirm", async (req, res) => {
  const user = authUser(req, res);
  if (!user) return;

  const eventId = Number(req.params.id);

  try {
    await pool.query(
      `INSERT INTO event_attendees (event_id, user_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE event_id = VALUES(event_id)`,
      [eventId, user.id]
    );

    res.json({ ok: true, joined: true });
  } catch (e) {
    console.error("confirm error:", e);
    res.status(500).json({ ok: false, error: "confirm_failed" });
  }
});

app.delete("/api/events/:id/confirm", async (req, res) => {
  const user = authUser(req, res);
  if (!user) return;

  const eventId = Number(req.params.id);

  try {
    await pool.query(
      "DELETE FROM event_attendees WHERE event_id=? AND user_id=?",
      [eventId, user.id]
    );

    res.json({ ok: true, left: true });
  } catch (e) {
    console.error("unconfirm error:", e);
    res.status(500).json({ ok: false, error: "unconfirm_failed" });
  }
});

// =====================================================================
//  EXPORT
// =====================================================================
module.exports = app;

// =====================================================================
//  START SERVER (somente produção real)
// =====================================================================
if (!isUnitTest && !isIntegrationTest) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`GkEvents API rodando em http://0.0.0.0:${port}`);
  });
}
