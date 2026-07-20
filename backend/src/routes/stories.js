import { Router } from 'express';
import fetch from 'node-fetch';

const POLLINATIONS = 'https://gen.pollinations.ai';
const FETCH_TIMEOUT = 120_000; // 120s

function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// Cache models list for 5 minutes
let _modelsCache = null;
let _modelsCacheTime = 0;
const MODELS_CACHE_TTL = 5 * 60 * 1000;

async function getModels() {
  const now = Date.now();
  if (_modelsCache && now - _modelsCacheTime < MODELS_CACHE_TTL) {
    return _modelsCache;
  }
  const res = await fetch(`${POLLINATIONS}/models`);
  const data = await res.json();
  _modelsCache = data;
  _modelsCacheTime = now;
  return data;
}

export const modelsRouter = Router();

// GET /api/models - fetch dynamic model list from Pollinations (no auth needed)
modelsRouter.get('/', async (req, res) => {
  try {
    const data = await getModels();
    const models = data.data || data;
    const grouped = { text: [], image: [], audio: [], video: [], '3d': [], embeddings: [] };
    for (const m of models) {
      const id = m.id;
      const out = m.output_modalities?.[0] || 'text';
      if (grouped[out]) grouped[out].push({
        id,
        name: m.name || id,
        input: m.input_modalities,
        output: m.output_modalities,
        reasoning: m.reasoning || false,
        tools: m.tools || false,
        context: m.context_length || null,
        endpoints: m.supported_endpoints
      });
    }
    res.json(grouped);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch models', message: err.message });
  }
});

export const storiesRouter = Router();

// POST /api/stories/generate
// Body: { theme, pages, textModel, imageModel, generateAudio, pollinationsKey }
storiesRouter.post('/generate', async (req, res) => {
  const { theme, pages = 3, textModel = 'openai', imageModel = 'flux', generateAudio = false, pollinationsKey } = req.body;
  if (!theme) return res.status(400).json({ error: 'theme required' });
  if (!pollinationsKey) return res.status(400).json({ error: 'pollinationsKey required' });

  // Set SSE headers for streaming progress
  res.setHeader('Content-Type', 'application/json');

  try {
    // Step 1: Generate story text via chat completions with user-selected model
    const storyPrompt = `Write a fun children's story about "${theme}" in exactly ${pages} short paragraphs. Each paragraph is one page. Return ONLY a JSON array of strings, no other text. Example: ["Page 1 text...", "Page 2 text..."]`;

    // Use chat completions with dynamic model
    const storyRes = await fetchWithTimeout(`${POLLINATIONS}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pollinationsKey}`
      },
      body: JSON.stringify({
        model: textModel,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: storyPrompt
        }]
      })
    });

    if (!storyRes.ok) throw new Error(`Story gen failed: ${storyRes.status}`);
    const storyData = await storyRes.json();
    let pageTexts = [];
    try {
      const content = storyData.choices[0].message.content;
      pageTexts = JSON.parse(content);
      if (!Array.isArray(pageTexts)) throw new Error('not an array');
    } catch {
      // ponytail: fallback - split by double newline if JSON parse fails
      pageTexts = storyData.choices[0].message.content.split(/\n\n+/).filter(Boolean).slice(0, pages);
    }

    // Step 2: Build pages with images (audio optional)
    const storyPages = [];
    for (let i = 0; i < pageTexts.length; i++) {
      const text = pageTexts[i];
      const imageUrl = `${POLLINATIONS}/image/${imageModel}?prompt=${encodeURIComponent(text.slice(0, 200))}&width=512&height=512&key=${encodeURIComponent(pollinationsKey)}`;

      const page = {
        pageNum: i + 1,
        text,
        imageUrl
      };

      if (generateAudio) {
        page.audioUrl = `${POLLINATIONS}/audio/${encodeURIComponent(text.slice(0, 100))}?voice=nova&key=${encodeURIComponent(pollinationsKey)}`;
      }

      storyPages.push(page);
    }

    // Step 3: Save to database
    const db = req.app.locals.db;
    const insertStory = db.prepare('INSERT INTO stories (title, theme, pollinations_key) VALUES (?, ?, ?)');
    const insertPage = db.prepare('INSERT INTO pages (story_id, page_num, text, image_url, audio_url) VALUES (?, ?, ?, ?, ?)');

    const result = insertStory.run(theme, theme, pollinationsKey || null);
    const storyId = result.lastInsertRowid;

    for (const page of storyPages) {
      insertPage.run(storyId, page.pageNum, page.text, page.imageUrl, page.audioUrl || null);
    }

    res.json({ id: storyId, title: theme, pages: storyPages });
  } catch (err) {
    console.error('Generate error:', err.name === 'AbortError' ? 'timeout' : err.message);
    res.status(504).json({ error: err.name === 'AbortError' ? 'story generation timed out' : err.message });
  }
});

// Get all stories
storiesRouter.get('/', (req, res) => {
  const db = req.app.locals.db;
  const stories = db.prepare('SELECT * FROM stories ORDER BY created_at DESC').all();
  res.json(stories);
});

// Get single story with pages
storiesRouter.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'not found' });
  const pages = db.prepare('SELECT * FROM pages WHERE story_id = ? ORDER BY page_num').all(req.params.id);
  res.json({ ...story, pages });
});

// Delete story
storiesRouter.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  db.prepare('DELETE FROM stories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
