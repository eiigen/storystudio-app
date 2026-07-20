import { Router } from 'express';
import fetch from 'node-fetch';

const POLLINATIONS = 'https://gen.pollinations.ai';

export const storiesRouter = Router();

// Generate a new story
storiesRouter.post('/generate', async (req, res) => {
  const { theme, pages = 3, pollinationsKey } = req.body;
  if (!theme) return res.status(400).json({ error: 'theme required' });

  try {
    // Step 1: Generate story text
    const storyRes = await fetch(`${POLLINATIONS}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(pollinationsKey ? { Authorization: `Bearer ${pollinationsKey}` } : {})
      },
      body: JSON.stringify({
        model: 'openai',
        messages: [{
          role: 'user',
          content: `Write a fun children's story about "${theme}" in exactly ${pages} short paragraphs. Each paragraph is one page. Return ONLY a JSON array of strings, no other text. Example: ["Page 1 text...", "Page 2 text..."]`
        }]
      })
    });
    if (!storyRes.ok) throw new Error(`Story gen failed: ${storyRes.status}`);
    const storyData = await storyRes.json();
    let pageTexts = [];
    try {
      const content = storyData.choices[0].message.content;
      pageTexts = JSON.parse(content);
    } catch {
      // ponytail: fallback - split by double newline if JSON parse fails
      pageTexts = storyData.choices[0].message.content.split('\n\n').filter(Boolean).slice(0, pages);
    }

    // Step 2: Generate images for each page
    const storyPages = await Promise.all(pageTexts.map(async (text, i) => {
      const imageUrl = `${POLLINATIONS}/image/${encodeURIComponent(text.slice(0, 200))}?model=flux&width=512&height=512${pollinationsKey ? `&key=${pollinationsKey}` : ''}`;
      return {
        pageNum: i + 1,
        text,
        imageUrl
      };
    }));

    // Step 3: Save to database
    const db = req.app.locals.db;
    const insertStory = db.prepare('INSERT INTO stories (title, theme, pollinations_key) VALUES (?, ?, ?)');
    const insertPage = db.prepare('INSERT INTO pages (story_id, page_num, text, image_url) VALUES (?, ?, ?, ?)');
    
    const result = insertStory.run(theme, theme, pollinationsKey || null);
    const storyId = result.lastInsertRowid;
    
    for (const page of storyPages) {
      insertPage.run(storyId, page.pageNum, page.text, page.imageUrl);
    }

    res.json({ id: storyId, title: theme, pages: storyPages });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: err.message });
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
