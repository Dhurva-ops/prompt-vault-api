const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── ROOT ───────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🚀 PromptVault API Running!' });
});

// ─── CATEGORIES ─────────────────────────────
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET ALL PROMPTS ─────────────────────────
app.get('/prompts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, p.content, p.category_id,
             c.name as category_name, c.banner_color,
             p.tags, p.ai_model, p.preview_image_url,
             p.is_favorite, p.use_count, p.vibe_tag, p.created_at
      FROM prompts p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET PROMPTS BY CATEGORY ─────────────────
app.get('/prompts/category/:slug', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, p.content, p.category_id,
             c.name as category_name, c.banner_color,
             p.tags, p.ai_model, p.preview_image_url,
             p.is_favorite, p.use_count, p.vibe_tag
      FROM prompts p
      JOIN categories c ON p.category_id = c.id
      WHERE c.slug = $1
      ORDER BY p.created_at DESC
    `, [req.params.slug]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET FAVORITES ────────────────────────────
app.get('/prompts/favorites', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, p.content, p.category_id,
             c.name as category_name, c.banner_color,
             p.tags, p.ai_model, p.preview_image_url,
             p.is_favorite, p.use_count, p.vibe_tag
      FROM prompts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_favorite = true
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SEARCH PROMPTS ───────────────────────────
app.get('/prompts/search/:query', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, p.content, p.category_id,
             c.name as category_name, c.banner_color,
             p.tags, p.ai_model, p.preview_image_url,
             p.is_favorite, p.use_count, p.vibe_tag
      FROM prompts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title ILIKE $1 OR p.content ILIKE $1
    `, [`%${req.params.query}%`]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADD PROMPT ───────────────────────────────
app.post('/prompts', async (req, res) => {
  try {
    const { title, content, category_id, tags, ai_model, preview_image_url, vibe_tag } = req.body;
    const result = await pool.query(`
      INSERT INTO prompts
      (title, content, category_id, tags, ai_model, preview_image_url, vibe_tag)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `, [title, content, category_id, tags || [], ai_model, preview_image_url, vibe_tag]);
    res.json({ id: result.rows[0].id, message: 'Created!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TOGGLE FAVORITE ──────────────────────────
app.patch('/prompts/:id/favorite', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE prompts SET is_favorite = NOT is_favorite WHERE id = $1 RETURNING is_favorite',
      [req.params.id]
    );
    res.json({ is_favorite: result.rows[0].is_favorite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── INCREMENT USE COUNT ──────────────────────
app.patch('/prompts/:id/use', async (req, res) => {
  try {
    await pool.query(
      'UPDATE prompts SET use_count = use_count + 1 WHERE id = $1',
      [req.params.id]
    );
    res.json({ message: 'Updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE PROMPT ────────────────────────────
app.put('/prompts/:id', async (req, res) => {
  try {
    const { title, content, category_id, tags, ai_model, preview_image_url, vibe_tag } = req.body;
    await pool.query(`
      UPDATE prompts SET
      title=$1, content=$2, category_id=$3,
      tags=$4, ai_model=$5, preview_image_url=$6,
      vibe_tag=$7, updated_at=now()
      WHERE id=$8
    `, [title, content, category_id, tags || [], ai_model, preview_image_url, vibe_tag, req.params.id]);
    res.json({ message: 'Updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE PROMPT ────────────────────────────
app.delete('/prompts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM prompts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
