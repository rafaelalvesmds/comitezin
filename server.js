require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const dbUrl = process.env.DATABASE_URL || '';

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
});

if (dbUrl) {
  const host = dbUrl.split('@')[1]?.split('/')[0] || 'localhost';
  console.log(`[DB] Conectado ao banco: ${host}`);
}

async function initDb() {
  try {
    // 1. Create people table
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

    // 2. Create promotion_history table
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

    // 3. Create competencies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        tecnico INTEGER DEFAULT 1 CHECK (tecnico BETWEEN 1 AND 5),
        comunicacao INTEGER DEFAULT 1 CHECK (comunicacao BETWEEN 1 AND 5),
        lideranca INTEGER DEFAULT 1 CHECK (lideranca BETWEEN 1 AND 5),
        autonomia INTEGER DEFAULT 1 CHECK (autonomia BETWEEN 1 AND 5),
        impacto INTEGER DEFAULT 1 CHECK (impacto BETWEEN 1 AND 5),
        humildade INTEGER DEFAULT 1 CHECK (humildade BETWEEN 1 AND 5),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(person_id)
      );
    `);

    // 5. Create feedback table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        person_id UUID REFERENCES people(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT false,
        ip_address VARCHAR(45),
        device_id VARCHAR(100),
        parent_id UUID REFERENCES feedback(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 6. Create feedback_likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback_likes (
        feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
        device_id VARCHAR(100) NOT NULL,
        PRIMARY KEY (feedback_id, device_id)
      );
    `);

    // 7. Create activity_log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        person_id UUID REFERENCES people(id) ON DELETE SET NULL,
        person_name VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR(45),
        device_id VARCHAR(100)
      );
    `);

    // Migration logic
    await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS device_id VARCHAR(100)`);
    await pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES feedback(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE people ADD COLUMN IF NOT EXISTS step VARCHAR(50)`);
    await pool.query(`ALTER TABLE people ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}'`);
    await pool.query(`ALTER TABLE competencies ADD COLUMN IF NOT EXISTS humildade INTEGER DEFAULT 1 CHECK (humildade BETWEEN 1 AND 5)`);


    const { rows: pendingMigration } = await pool.query(`SELECT id FROM people WHERE step IS NULL LIMIT 1`);
    if (pendingMigration.length > 0) {
      console.log('Migrating people data: cargo -> step');
      await pool.query(`UPDATE people SET step = cargo WHERE step IS NULL`);
      await pool.query(`UPDATE people SET cargo = 'Analista de Sistemas' WHERE cargo IN ('Junior I', 'Junior II', 'Pleno I', 'Pleno II', 'Pleno III', 'Senior I', 'Senior II', 'Senior III', 'Especialista de Software I', 'Especialista de Software II', 'Especialista de Software III', 'Especialista de Software IIII', 'Especialista de Software IIIII', 'Arquiteto Junior', 'Arquiteto Especialista MIL')`);
    }

    await pool.query(`ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS from_step VARCHAR(50)`);
    await pool.query(`ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS to_step VARCHAR(50)`);


    const { rows: pendingPromoMigration } = await pool.query(`SELECT id FROM promotion_history WHERE from_step IS NULL LIMIT 1`);
    if (pendingPromoMigration.length > 0) {
      await pool.query(`UPDATE promotion_history SET from_step = from_cargo, to_step = to_cargo WHERE from_step IS NULL`);
    }

    // Backfill promotions for people who are marked as promoted but have no history record in the database
    const { rows: promotedPeople } = await pool.query('SELECT * FROM people WHERE promoted = true');
    const STEP_HIERARCHY = [
      'Estagiário', 'Junior I', 'Junior II', 'Pleno I', 'Pleno II', 'Pleno III',
      'Senior I', 'Senior II', 'Senior III', 'Especialista de Software I', 'Especialista de Software II',
      'Especialista de Software III', 'Especialista de Software IIII', 'Especialista de Software IIIII',
      'Arquiteto Junior', 'Arquiteto Especialista MIL'
    ];
    for (const p of promotedPeople) {
      const { rows: history } = await pool.query('SELECT 1 FROM promotion_history WHERE person_id = $1', [p.id]);
      if (history.length === 0) {
        const idx = STEP_HIERARCHY.indexOf(p.step);
        const fromStep = idx > 0 ? STEP_HIERARCHY[idx - 1] : p.step;
        console.log(`[DB] Backfilling promotion history for ${p.name} for Maio 2026`);
        await pool.query(
          'INSERT INTO promotion_history (person_id, from_step, to_step, committee_month, notes) VALUES ($1, $2, $3, $4, $5)',
          [p.id, fromStep, p.step, 'Maio 2026', 'Promoção importada do comitê de Maio']
        );
      }
    }
    
    // 8. Add expects_promotion_months column
    await pool.query('ALTER TABLE people ADD COLUMN IF NOT EXISTS expects_promotion_months TEXT[] DEFAULT \'{}\'');
    
    // 9. Backfill expects_promotion_months for people who expect promotion
    await pool.query(`
      UPDATE people 
      SET expects_promotion_months = ARRAY['Maio 2026'] 
      WHERE expects_promotion = true 
        AND (expects_promotion_months IS NULL OR array_length(expects_promotion_months, 1) IS NULL)
    `);

    // 10. Specific correction for Locutor: revert Pleno II to Pleno I, and update history to Junior II -> Pleno I
    await pool.query(`
      UPDATE promotion_history 
      SET from_step = 'Junior II', to_step = 'Pleno I' 
      WHERE person_id = (SELECT id FROM people WHERE name = 'Locutor') 
        AND committee_month = 'Maio 2026' 
        AND from_step = 'Pleno I' 
        AND to_step = 'Pleno II'
    `);
    
    await pool.query(`
      UPDATE people 
      SET step = 'Pleno I' 
      WHERE name = 'Locutor' AND step = 'Pleno II'
    `);
  } catch (err) {
    console.error('Database migration/init error:', err.message);
  }

  console.log('Database tables ready');
}

app.set('trust proxy', true);
app.use(helmet({
  contentSecurityPolicy: false, // Angular handles CSP usually, or we can configure specifically
}));
app.use(compression());
app.use(cors());
app.use(express.json());

// ── Auth Middleware ──────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '123e4567-e89b-12d3-a456-426614174000';

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado. Token inválido ou ausente.' });
  }
  next();
};

// Protect all /api routes
app.use('/api', authMiddleware);

// ── Auth Verification ──────────────────────────────────────────
// Since this is under /api, it's protected. If it reaches here, token is valid.
app.get('/api/auth/verify', (req, res) => {
  res.json({ success: true });
});

// ── API Routes ──────────────────────────────────────────────

// GET all people
app.get('/api/people', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.cargo, p.step, p.expects_promotion AS "expectsPromotion", p.expects_promotion_months AS "expectsPromotionMonths", p.promoted, p.squad, p.badges, p.created_at AS "createdAt",
              (SELECT COUNT(*)::int FROM feedback f WHERE f.person_id = p.id) AS "feedbackCount"

       FROM people p
       ORDER BY p.name`
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
  const deviceId = req.header('X-Device-Id');
  try {
    const { rows } = await pool.query(
      'INSERT INTO people (name, cargo, step, squad, badges) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, cargo, step, expects_promotion AS "expectsPromotion", expects_promotion_months AS "expectsPromotionMonths", promoted, squad, badges, created_at AS "createdAt"',
      [name, cargo, step, squad || '', []]
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
    expectsPromotionMonths: 'expects_promotion_months',
    promoted: 'promoted',
    cargo: 'cargo',
    step: 'step',
    name: 'name',
    squad: 'squad',
    badges: 'badges',
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
      `UPDATE people SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING id, name, cargo, step, expects_promotion AS "expectsPromotion", expects_promotion_months AS "expectsPromotionMonths", promoted, squad, badges, created_at AS "createdAt"`,
      values
    );


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
      [personId, from_step || fromStep, to_step || toStep, committeeMonth, notes || '']
    );
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

// DELETE promotion record
app.delete('/api/promotions', async (req, res) => {
  const { personId, committeeMonth } = req.query;
  if (!personId || !committeeMonth) {
    return res.status(400).json({ error: 'personId e committeeMonth são obrigatórios' });
  }
  try {
    await pool.query(
      'DELETE FROM promotion_history WHERE person_id = $1 AND committee_month = $2',
      [personId, committeeMonth]
    );
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover promoção' });
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

// ── Competencies ────────────────────────────────────────────

// GET competencies for person
app.get('/api/competencies/:personId', async (req, res) => {
  const { personId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT person_id AS "personId", tecnico, comunicacao, lideranca, autonomia, impacto, humildade, updated_at AS "updatedAt" FROM competencies WHERE person_id = $1',
      [personId]
    );
    if (rows.length === 0) {
      return res.json({ personId, tecnico: 1, comunicacao: 1, lideranca: 1, autonomia: 1, impacto: 1, humildade: 1 });
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
  const { tecnico, comunicacao, lideranca, autonomia, impacto, humildade } = req.body;

  // Validate range
  const fields = [tecnico, comunicacao, lideranca, autonomia, impacto, humildade];
  if (fields.some(f => f < 1 || f > 5)) {
    return res.status(400).json({ error: 'Valores devem estar entre 1 e 5' });
  }

  const deviceId = req.header('X-Device-Id');
  try {
    const { rows } = await pool.query(
      `INSERT INTO competencies (person_id, tecnico, comunicacao, lideranca, autonomia, impacto, humildade, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (person_id) DO UPDATE SET
         tecnico = $2, comunicacao = $3, lideranca = $4, autonomia = $5, impacto = $6, humildade = $7, updated_at = NOW()
       RETURNING person_id AS "personId", tecnico, comunicacao, lideranca, autonomia, impacto, humildade, updated_at AS "updatedAt"`,
      [personId, tecnico, comunicacao, lideranca, autonomia, impacto, humildade]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar competências' });
  }
});

// ── Feedback ────────────────────────────────────────────────

// Helper to normalize IP (handling IPv4 vs IPv6 loopback)
const normalizeIP = (ip) => {
  if (!ip) return '';
  return ip.startsWith('::ffff:') ? ip.substring(7) : ip === '::1' ? '127.0.0.1' : ip;
};

app.get('/api/feedback/:personId', async (req, res) => {
  const { personId } = req.params;
  const clientDeviceId = req.header('X-Device-Id');

  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.person_id AS "personId", f.message, f.is_anonymous AS "isAnonymous", 
              f.ip_address AS "ipAddress", f.device_id AS "deviceId", f.created_at AS "createdAt",
              f.parent_id AS "parentId", p.message AS "parentMessage", p.is_anonymous AS "parentIsAnonymous",
              (SELECT COUNT(*) FROM feedback_likes FL WHERE FL.feedback_id = f.id) AS "likesCount",
              EXISTS (SELECT 1 FROM feedback_likes FL WHERE FL.feedback_id = f.id AND FL.device_id = $2) AS "likedByMe"
       FROM feedback f
       LEFT JOIN feedback p ON f.parent_id = p.id
       WHERE f.person_id = $1 
       ORDER BY f.created_at DESC`,
      [personId, clientDeviceId || '']
    );

    // Add canEdit flag based on Device ID
    const feedbacks = rows.map(fb => {
      const isAuthor = fb.deviceId === clientDeviceId;
      const isAnonymous = !!fb.isAnonymous;

      return {
        ...fb,
        canEdit: isAuthor,
        likesCount: parseInt(fb.likesCount, 10) || 0,
        // Show device id ONLY if NOT anonymous
        deviceSlug: !isAnonymous && fb.deviceId ? fb.deviceId.substring(0, 4).toUpperCase() : undefined,
        // Hide full sensitive info
        ipAddress: isAuthor ? fb.ipAddress : undefined,
        deviceId: undefined
      };
    });

    res.json(feedbacks);
  } catch (err) {
    console.error(`Erro ao buscar feedbacks (ID: ${personId}):`, err.message);
    res.status(500).json({ error: 'Erro ao buscar feedbacks' });
  }
});

app.post('/api/feedback/:id/like', async (req, res) => {
  const { id } = req.params;
  const deviceId = req.header('X-Device-Id');

  if (!deviceId) {
    return res.status(400).json({ error: 'X-Device-Id é obrigatório' });
  }

  try {
    // Check if liked
    const { rows } = await pool.query(
      'SELECT 1 FROM feedback_likes WHERE feedback_id = $1 AND device_id = $2',
      [id, deviceId]
    );

    if (rows.length > 0) {
      // Remove like
      await pool.query(
        'DELETE FROM feedback_likes WHERE feedback_id = $1 AND device_id = $2',
        [id, deviceId]
      );
    } else {
      // Add like
      await pool.query(
        'INSERT INTO feedback_likes (feedback_id, device_id) VALUES ($1, $2)',
        [id, deviceId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao curtir feedback:', err.message);
    res.status(500).json({ error: 'Erro ao processar curtida' });
  }
});

app.post('/api/feedback', async (req, res) => {
  const { personId, message, isAnonymous, parentId } = req.body;
  const deviceId = req.header('X-Device-Id');

  if (!message) {
    return res.status(400).json({ error: 'Mensagem de feedback é obrigatória' });
  }
  if (!personId) {
    return res.status(400).json({ error: 'O ID do destinatário é obrigatório' });
  }

  const clientIP = normalizeIP(req.ip);

  try {
    await pool.query(
      'INSERT INTO feedback (person_id, message, is_anonymous, ip_address, device_id, parent_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [personId, message, !!isAnonymous, clientIP, deviceId, parentId || null]
    );

    // Log
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Erro ao enviar feedback:', err.message);
    res.status(500).json({ error: 'Erro ao enviar feedback' });
  }
});

app.patch('/api/feedback/:id', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const deviceId = req.header('X-Device-Id');

  if (!message) {
    return res.status(400).json({ error: 'Mensagem é obrigatória' });
  }

  try {
    const { rows } = await pool.query('SELECT device_id, person_id FROM feedback WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Feedback não encontrado' });
    }

    if (rows[0].device_id !== deviceId) {
      return res.status(403).json({ error: 'Apenas o autor pode editar este feedback' });
    }

    await pool.query('UPDATE feedback SET message = $1 WHERE id = $2', [message, id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao editar feedback:', err.message);
    res.status(500).json({ error: 'Erro ao editar feedback' });
  }
});

app.delete('/api/feedback/:id', async (req, res) => {
  const { id } = req.params;
  const deviceId = req.header('X-Device-Id');

  try {
    const { rows } = await pool.query('SELECT device_id, person_id FROM feedback WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Feedback não encontrado' });
    }

    if (rows[0].device_id !== deviceId) {
      return res.status(403).json({ error: 'Apenas o autor pode remover este feedback' });
    }

    await pool.query('DELETE FROM feedback WHERE id = $1', [id]);

    res.status(204).end();
  } catch (err) {
    console.error('Erro ao remover feedback:', err.message);
    res.status(500).json({ error: 'Erro ao remover feedback' });
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
