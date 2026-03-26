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
      step VARCHAR(50),
      expects_promotion BOOLEAN DEFAULT false,
      promoted BOOLEAN DEFAULT false,
      squad VARCHAR(100) DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promotion_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      from_step VARCHAR(50),
      to_step VARCHAR(50),
      from_cargo VARCHAR(50),
      to_cargo VARCHAR(50),
      promoted_at TIMESTAMP DEFAULT NOW(),
      committee_month VARCHAR(20) NOT NULL,
      notes TEXT DEFAULT ''
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      person_id UUID REFERENCES people(id) ON DELETE SET NULL,
      person_name VARCHAR(255) NOT NULL,
      action VARCHAR(50) NOT NULL,
      details TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS competencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      tecnico INTEGER DEFAULT 1 CHECK (tecnico BETWEEN 1 AND 5),
      comunicacao INTEGER DEFAULT 1 CHECK (comunicacao BETWEEN 1 AND 5),
      lideranca INTEGER DEFAULT 1 CHECK (lideranca BETWEEN 1 AND 5),
      autonomia INTEGER DEFAULT 1 CHECK (autonomia BETWEEN 1 AND 5),
      impacto INTEGER DEFAULT 1 CHECK (impacto BETWEEN 1 AND 5),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(person_id)
    );
  `);

  // Migration logic
  try {
    // 1. Add step column to people if it doesn't exist
    await pool.query(`ALTER TABLE people ADD COLUMN IF NOT EXISTS step VARCHAR(50)`);
    
    // 2. If step is null, it means we haven't migrated yet. 
    // Fill step with current cargo and set cargo to a default value.
    const { rows: pendingMigration } = await pool.query(`SELECT id FROM people WHERE step IS NULL LIMIT 1`);
    if (pendingMigration.length > 0) {
      console.log('Migrating people data: cargo -> step');
      await pool.query(`UPDATE people SET step = cargo WHERE step IS NULL`);
      await pool.query(`UPDATE people SET cargo = 'Analista de Sistemas' WHERE cargo IN ('Junior I', 'Junior II', 'Pleno I', 'Pleno II', 'Pleno III', 'Senior I', 'Senior II', 'Senior III', 'Especialista de Software I', 'Especialista de Software II', 'Especialista de Software III', 'Especialista de Software IIII', 'Especialista de Software IIIII', 'Arquiteto Junior', 'Arquiteto Especialista MIL')`);
    }

    // 3. Add step columns to promotion_history
    await pool.query(`ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS from_step VARCHAR(50)`);
    await pool.query(`ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS to_step VARCHAR(50)`);
    
    // 4. Migrate promotion_history
    const { rows: pendingPromoMigration } = await pool.query(`SELECT id FROM promotion_history WHERE from_step IS NULL LIMIT 1`);
    if (pendingPromoMigration.length > 0) {
      console.log('Migrating promotion_history: cargo -> step');
      await pool.query(`UPDATE promotion_history SET from_step = from_cargo, to_step = to_cargo WHERE from_step IS NULL`);
    }
  } catch (e) {
    console.warn('Migration warning:', e.message);
  }

  console.log('Database tables ready');
}

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Helper: log activity ────────────────────────────────────
async function logActivity(personId, personName, action, details = '') {
  try {
    await pool.query(
      'INSERT INTO activity_log (person_id, person_name, action, details) VALUES ($1, $2, $3, $4)',
      [personId, personName, action, details]
    );
  } catch (err) {
    console.error('Erro ao registrar atividade', err);
  }
}

// ── API Routes ──────────────────────────────────────────────

// GET all people
app.get('/api/people', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, cargo, step, expects_promotion AS "expectsPromotion", promoted, squad, created_at AS "createdAt" FROM people ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pessoas' });
  }
});

// POST create person
app.post('/api/people', async (req, res) => {
  const { name, cargo, step, squad } = req.body;
  if (!name || !cargo || !step) {
    return res.status(400).json({ error: 'Nome, cargo e step são obrigatórios' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO people (name, cargo, step, squad) VALUES ($1, $2, $3, $4) RETURNING id, name, cargo, step, expects_promotion AS "expectsPromotion", promoted, squad, created_at AS "createdAt"',
      [name, cargo, step, squad || '']
    );
    await logActivity(rows[0].id, name, 'added', `Adicionado(a) como ${cargo} (${step})`);
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
    step: 'step',
    name: 'name',
    squad: 'squad',
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
    // Get current state for activity logging
    const { rows: currentRows } = await pool.query('SELECT name, cargo, step, expects_promotion FROM people WHERE id = $1', [id]);
    if (currentRows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    const current = currentRows[0];

    const { rows } = await pool.query(
      `UPDATE people SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING id, name, cargo, step, expects_promotion AS "expectsPromotion", promoted, squad, created_at AS "createdAt"`,
      values
    );

    // Log activities based on changes
    if (fields.expectsPromotion !== undefined) {
      await logActivity(id, current.name, fields.expectsPromotion ? 'expect_on' : 'expect_off',
        fields.expectsPromotion ? 'Marcou expectativa de promoção' : 'Removeu expectativa de promoção');
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
    const { rows } = await pool.query('SELECT name FROM people WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    await logActivity(null, rows[0].name, 'removed', `${rows[0].name} foi removido(a) do sistema`);
    await pool.query('DELETE FROM people WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover pessoa' });
  }
});

// ── Promotion History ───────────────────────────────────────

// POST record promotion
app.post('/api/promotions', async (req, res) => {
  const { personId, fromStep, toStep, committeeMonth, notes } = req.body;
  if (!personId || !fromStep || !toStep || !committeeMonth) {
    return res.status(400).json({ error: 'Campos obrigatórios: personId, fromStep, toStep, committeeMonth' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO promotion_history (person_id, from_step, to_step, committee_month, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [personId, fromStep, toStep, committeeMonth, notes || '']
    );
    // Get person name for activity log
    const { rows: personRows } = await pool.query('SELECT name FROM people WHERE id = $1', [personId]);
    const personName = personRows.length > 0 ? personRows[0].name : 'Desconhecido';
    await logActivity(personId, personName, 'promoted', `Promovido(a) de ${fromStep} para ${toStep}${notes ? ' — ' + notes : ''}`);

    const result = rows[0];
    res.status(201).json({
      id: result.id,
      personId: result.person_id,
      fromStep: result.from_step,
      toStep: result.to_step,
      promotedAt: result.promoted_at,
      committeeMonth: result.committee_month,
      notes: result.notes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar promoção' });
  }
});

// GET promotion history for a person
app.get('/api/promotions/:personId', async (req, res) => {
  const { personId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT id, person_id AS "personId", from_step AS "fromStep", to_step AS "toStep", promoted_at AS "promotedAt", committee_month AS "committeeMonth", notes FROM promotion_history WHERE person_id = $1 ORDER BY promoted_at DESC',
      [personId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// GET all promotion history
app.get('/api/promotions', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ph.id, ph.person_id AS "personId", ph.from_step AS "fromStep", ph.to_step AS "toStep",
              ph.promoted_at AS "promotedAt", ph.committee_month AS "committeeMonth", ph.notes,
              p.name AS "personName"
       FROM promotion_history ph
       LEFT JOIN people p ON p.id = ph.person_id
       ORDER BY ph.promoted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// ── Activity Log ────────────────────────────────────────────

app.get('/api/activities', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const { rows } = await pool.query(
      'SELECT id, person_id AS "personId", person_name AS "personName", action, details, created_at AS "createdAt" FROM activity_log ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar atividades' });
  }
});

// ── Competencies ────────────────────────────────────────────

// GET competencies for person
app.get('/api/competencies/:personId', async (req, res) => {
  const { personId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT person_id AS "personId", tecnico, comunicacao, lideranca, autonomia, impacto, updated_at AS "updatedAt" FROM competencies WHERE person_id = $1',
      [personId]
    );
    if (rows.length === 0) {
      return res.json({ personId, tecnico: 1, comunicacao: 1, lideranca: 1, autonomia: 1, impacto: 1 });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar competências' });
  }
});

// PUT upsert competencies
app.put('/api/competencies/:personId', async (req, res) => {
  const { personId } = req.params;
  const { tecnico, comunicacao, lideranca, autonomia, impacto } = req.body;

  // Validate range
  const fields = [tecnico, comunicacao, lideranca, autonomia, impacto];
  if (fields.some(f => f < 1 || f > 5)) {
    return res.status(400).json({ error: 'Valores devem estar entre 1 e 5' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO competencies (person_id, tecnico, comunicacao, lideranca, autonomia, impacto, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (person_id) DO UPDATE SET
         tecnico = $2, comunicacao = $3, lideranca = $4, autonomia = $5, impacto = $6, updated_at = NOW()
       RETURNING person_id AS "personId", tecnico, comunicacao, lideranca, autonomia, impacto, updated_at AS "updatedAt"`,
      [personId, tecnico, comunicacao, lideranca, autonomia, impacto]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar competências' });
  }
});

// ── Squads ──────────────────────────────────────────────────

app.get('/api/squads', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT DISTINCT squad FROM people WHERE squad != '' ORDER BY squad"
    );
    res.json(rows.map(r => r.squad));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar squads' });
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
