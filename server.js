const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Database ────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS people (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      cargo VARCHAR(50) NOT NULL,
      expects_promotion BOOLEAN DEFAULT false,
      promoted BOOLEAN DEFAULT false
    );
  `);
  console.log('Database table ready');
}

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Routes ──────────────────────────────────────────────

// GET all people
app.get('/api/people', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, cargo, expects_promotion AS "expectsPromotion", promoted FROM people ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pessoas' });
  }
});

// POST create person
app.post('/api/people', async (req, res) => {
  const { name, cargo } = req.body;
  if (!name || !cargo) {
    return res.status(400).json({ error: 'Nome e cargo são obrigatórios' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO people (name, cargo) VALUES ($1, $2) RETURNING id, name, cargo, expects_promotion AS "expectsPromotion", promoted',
      [name, cargo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar pessoa' });
  }
});

// PATCH update person
app.patch('/api/people/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  // Map camelCase to snake_case
  const columnMap = {
    expectsPromotion: 'expects_promotion',
    promoted: 'promoted',
    cargo: 'cargo',
    name: 'name',
  };

  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(fields)) {
    const col = columnMap[key];
    if (col) {
      setClauses.push(`${col} = $${i}`);
      values.push(value);
      i++;
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
  }

  values.push(id);

  try {
    const { rows } = await pool.query(
      `UPDATE people SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING id, name, cargo, expects_promotion AS "expectsPromotion", promoted`,
      values
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar pessoa' });
  }
});

// DELETE person
app.delete('/api/people/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM people WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover pessoa' });
  }
});

// ── Serve Angular static files ──────────────────────────────
const distPath = path.join(__dirname, 'dist', 'comitezin', 'browser');
app.use(express.static(distPath));

// SPA fallback — any non-API route serves index.html
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start ───────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
  });
});
