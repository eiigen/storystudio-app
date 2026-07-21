import { useState, useEffect } from 'react'
import DEFAULT_MODELS from './models.json'

const POLLINATIONS = 'https://gen.pollinations.ai'
const APP_KEY = 'pk_fJFepOdA7LMOZ1LA'
const STORAGE_KEY = 'storystudio_stories'
const POLLEN_KEY = 'storystudio_pollen_key'
const REDIRECT_URI = window.location.origin + window.location.pathname

const STYLES = [
  { name: 'None', desc: '' },
  { name: 'Whimsical Watercolor', desc: 'Soft, dreamy watercolor painting with gentle color washes, visible brush textures, and ethereal light diffusion. The edges are soft and organic, colors bleed into each other naturally, creating a warm, storybook atmosphere with a hand-painted feel.' },
  { name: 'Dark Fantasy', desc: 'Gothic, high-contrast fantasy illustration with deep shadows, moody lighting, and rich jewel tones. Dramatic chiaroscuro, intricate textures, and a foreboding atmosphere reminiscent of classic fantasy book covers and dark fairy tales.' },
  { name: 'Studio Ghibli', desc: 'Lush, hand-animated Japanese illustration style with vibrant green landscapes, fluffy clouds, warm golden hour lighting, and meticulously detailed backgrounds. Characters have large expressive eyes and the scene radiates nostalgic wonder.' },
  { name: 'Cyberpunk Neon', desc: 'Vibrant neon-drenched cityscape with electric cyan, hot pink, and deep purple highlights against rain-slicked dark surfaces. Holographic advertisements, reflective puddles, and a gritty futuristic atmosphere with glowing edge lighting.' },
  { name: 'Renaissance Oil', desc: 'Classical oil painting technique with rich, layered brushwork, warm amber and ochre tones, and dramatic tenebrism. Figures are rendered with anatomical precision, draped in flowing fabrics, illuminated by a single golden light source.' },
  { name: 'Retro Comic', desc: 'Bold, graphic pop-art style with thick black outlines, halftone dot patterns, vibrant primary colors, and dynamic action lines. Speech bubbles, onomatopoeia, and a four-color printing process aesthetic from 1960s comic books.' },
  { name: 'Ethereal Dreamscape', desc: 'Surreal, otherworldly scene with floating islands, impossible geometry, bioluminescent flora, and a pastel cosmic sky. Soft glowing particles drift through the air, and the scene has a quiet, meditative, and slightly melancholic beauty.' },
  { name: 'Steampunk Engraving', desc: 'Victorian-era copperplate engraving style with intricate mechanical details, brass and copper tones, gears, steam vents, and sepia-washed parchment textures. Cross-hatching creates depth, and the scene feels like an inventor\'s sketchbook come to life.' },
  { name: 'Pixel Art', desc: 'Retro 16-bit video game pixel art with crisp square pixels, a limited vibrant color palette, and charming chibi-proportioned characters. The scene is built tile-by-tile with dithering, parallax backgrounds, and a cozy nostalgic glow.' },
  { name: 'Crystalpunk', desc: 'Geometric crystalline structures with faceted gemstone surfaces, prismatic light refraction, and translucent mineral formations. Colors are cool and jewel-toned with sharp angular edges, floating shards, and a sleek, futuristic-mineral aesthetic.' },
  { name: 'Midnight Woodcut', desc: 'Dark, high-contrast woodblock print style with bold black areas, white carved lines, and textured paper grain. Inspired by medieval woodcuts and Japanese ukiyo-e, with swirling patterns, stark silhouettes, and a haunting, folkloric atmosphere.' },
  { name: 'Pastel Kawaii', desc: 'Ultra-cute Japanese-inspired illustration with soft pastel colors, rounded shapes, chunky proportions, and glossy finishes. Everything has a squishy, marshmallow-like quality with sparkly highlights, tiny blush marks, and an overwhelmingly adorable aesthetic.' },
  { name: 'Vaporwave Sunset', desc: 'Retro-futuristic 1980s synthwave aesthetic with a neon grid-lined horizon, setting sun in gradient bands of pink, purple, and orange, and chrome-accented geometric shapes. Glitch art effects, CRT scanlines, and a nostalgic, liminal atmosphere.' },
  { name: 'Ink Wash', desc: 'Traditional East Asian ink wash painting with flowing black sumi-e brushstrokes, subtle gray gradients, and abundant negative space. Misty mountains, bamboo, and cherry blossoms rendered with minimal, graceful strokes on textured rice paper.' },
  { name: 'Art Nouveau', desc: 'Elegant turn-of-the-century decorative style with flowing organic curves, intricate floral motifs, and gilded borders. Figures are elongated and graceful, framed by sinuous vines and peacock feathers, with muted earthy tones accented by gold leaf.' },
]

function loadStories() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
function saveStories(stories) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories))
}

export default function App() {
  const [stories, setStories] = useState(loadStories)
  const [currentStory, setCurrentStory] = useState(null)
  const [theme, setTheme] = useState('')
  const [pages, setPages] = useState(3)
  const [textModel, setTextModel] = useState('openai')
  const [imageModel, setImageModel] = useState('flux')
  const [artStyle, setArtStyle] = useState('None')
  const [styleSearch, setStyleSearch] = useState('')
  const [showStyleDropdown, setShowStyleDropdown] = useState(false)
  const [generateAudio, setGenerateAudio] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [imageStates, setImageStates] = useState({})
  const [error, setError] = useState(null)
  const [models, setModels] = useState(DEFAULT_MODELS)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [textSearch, setTextSearch] = useState('')
  const [imageSearch, setImageSearch] = useState('')
  const [showTextDropdown, setShowTextDropdown] = useState(false)
  const [showImageDropdown, setShowImageDropdown] = useState(false)
  const [pollenKey, setPollenKey] = useState(localStorage.getItem(POLLEN_KEY) || '')
  const [showKeyInput, setShowKeyInput] = useState(false)

  // Check for OAuth callback (fragment flow — key in URL hash)
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const apiKey = params.get('api_key')
    if (apiKey) {
      localStorage.setItem(POLLEN_KEY, apiKey)
      setPollenKey(apiKey)
      window.location.hash = ''
    }
  }, [])

  // Fetch latest models from API in background (start with hardcoded list)
  useEffect(() => {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    fetch(`${POLLINATIONS}/v1/models`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        const all = data.data || data
        const grouped = { text: [], image: [], audio: [], video: [], '3d': [], embeddings: [] }
        for (const m of all) {
          const out = m.output_modalities?.[0] || 'text'
          if (grouped[out]) grouped[out].push({ id: m.id, name: m.name || m.id })
        }
        if (grouped.text.length > 0) setModels(grouped)
      })
      .catch(() => {}) // already have DEFAULT_MODELS
      .finally(() => { clearTimeout(t) })
    return () => { clearTimeout(t); ctrl.abort() }
  }, [])

  const connect = () => {
    const params = new URLSearchParams({
      redirect_uri: REDIRECT_URI,
      client_id: APP_KEY,
      scope: 'usage'
    })
    window.location.href = `https://enter.pollinations.ai/authorize?${params}`
  }

  const saveKey = () => {
    localStorage.setItem(POLLEN_KEY, pollenKey.trim())
    setShowKeyInput(false)
  }

  const generate = async (e) => {
    e.preventDefault()
    if (!theme.trim()) return
    setLoading(true)
    setError(null)
    setProgress(0)
    setProgressText('Starting...')
    const key = pollenKey.trim()
    let genTimeout
    let genCtrl = new AbortController()
    try {
      // Step 1: Generate story text (90s timeout)
      setProgress(10)
      setProgressText('Generating story text...')
      genTimeout = setTimeout(() => genCtrl.abort(), 90000)
      const storyRes = await fetch(`${POLLINATIONS}/v1/chat/completions`, {
        signal: genCtrl.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { Authorization: `Bearer ${key}` } : {})
        },
        body: JSON.stringify({
          model: textModel,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Write a fun children's story about "${theme}" in exactly ${pages} short paragraphs. Each paragraph is one page. Return ONLY a JSON array of strings, no other text. Example: ["Page 1 text...", "Page 2 text..."]`
          }]
        })
      })
      clearTimeout(genTimeout)
      if (!storyRes.ok) throw new Error(`Story generation failed (${storyRes.status})`)
      const storyData = await storyRes.json()
      setProgress(50)
      setProgressText('Parsing story...')
      let pageTexts = []
      try {
        const content = storyData.choices[0].message.content
        pageTexts = JSON.parse(content)
        if (!Array.isArray(pageTexts)) throw new Error('not array')
      } catch {
        pageTexts = storyData.choices[0].message.content.split(/\n\n+/).filter(Boolean).slice(0, pages)
      }

      // Step 2: Build pages with images
      setProgress(60)
      setProgressText('Preparing images...')
      const style = STYLES.find(s => s.name === artStyle)
      const stylePrefix = style?.desc ? style.desc + '. ' : ''
      const storyPages = pageTexts.map((text, i) => {
        const imagePrompt = stylePrefix + text
        const imageUrl = `${POLLINATIONS}/image/${encodeURIComponent(imagePrompt.slice(0, 300))}?model=${imageModel}${key ? `&key=${encodeURIComponent(key)}` : ''}`
        const page = { pageNum: i + 1, text, imageUrl }
        if (generateAudio) {
          page.audioUrl = `${POLLINATIONS}/audio/${encodeURIComponent(text.slice(0, 100))}?voice=nova${key ? `&key=${encodeURIComponent(key)}` : ''}`
        }
        return page
      })

      const story = {
        id: Date.now(),
        title: theme,
        pages: storyPages,
        created_at: new Date().toISOString()
      }

      setProgress(100)
      setProgressText('Done!')

      const updated = [story, ...stories]
      setStories(updated)
      saveStories(updated)
      setCurrentStory(story)
    } catch (err) {
      clearTimeout(genTimeout)
      setError(err.name === 'AbortError' ? 'Request timed out — try again' : err.message)
    } finally {
      setLoading(false)
      setProgress(0)
      setProgressText('')
    }
  }

  const deleteStory = (id) => {
    const updated = stories.filter(s => s.id !== id)
    setStories(updated)
    saveStories(updated)
    if (currentStory?.id === id) setCurrentStory(null)
  }

  if (!pollenKey) {
    return (
      <div className="splash">
        <div className="splash-card">
          {showKeyInput ? (
            <>
              <div className="logo">📖</div>
              <h1>Enter API Key</h1>
              <p className="tagline">Paste your Pollinations secret key.</p>
              <div className="key-input-row">
                <input
                  type="text"
                  value={pollenKey}
                  onChange={(e) => setPollenKey(e.target.value)}
                  placeholder="sk_..."
                  className="input"
                />
              </div>
              <button className="btn-primary" onClick={saveKey}>
                Start Creating
              </button>
              <button className="btn-link" onClick={() => setShowKeyInput(false)}>
                ← Back
              </button>
              {error && <div className="error">{error}</div>}
            </>
          ) : (
            <>
              <div className="logo">📖</div>
              <h1>StoryStudio</h1>
              <p className="tagline">AI-powered storybooks in seconds.<br/>Connect your Pollinations account to start.</p>
              <button className="btn-primary" onClick={connect}>
                Connect with Pollinations
              </button>
              <button className="btn-link" onClick={() => setShowKeyInput(true)}>
                Paste a key manually
              </button>
              {error && <div className="error">{error}</div>}
              <p className="fine-print">Uses Pollinations.ai API</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">📖 StoryStudio</div>
        <nav>
          <button className="btn-ghost" onClick={() => setCurrentStory(null)}>New Story</button>
          <button className="btn-ghost" onClick={() => { localStorage.removeItem(POLLEN_KEY); setPollenKey(''); setCurrentStory(null) }}>Change Key</button>
        </nav>
      </header>

      <main className="content">
        {error && <div className="error">{error}</div>}

        {currentStory && currentStory.pages ? (
          <div className="story-viewer">
            <button className="btn-ghost back" onClick={() => setCurrentStory(null)}>← Back</button>
            <h2>{currentStory.title}</h2>
            <div className="pages">
              {currentStory.pages.map((page) => (
                <div key={page.pageNum} className="page">
                  <div className="page-image">
                    {page.imageUrl && (
                      <img
                        src={page.imageUrl}
                        alt={`Page ${page.pageNum}`}
                        className="page-img"
                        onLoad={(e) => { e.target.classList.add('loaded') }}
                        onError={(e) => { e.target.classList.add('error'); e.target.alt = 'Failed to load image' }}
                      />
                    )}
                  </div>
                  <div className="page-text">
                    <span className="page-num">Page {page.pageNum}</span>
                    <p>{page.text}</p>
                    {page.audioUrl && (
                      <audio controls src={page.audioUrl} className="page-audio">
                        Your browser does not support audio.
                      </audio>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="generator">
            <div className="hero">
              <h2>Create a Storybook</h2>
              <p>Enter a theme and watch AI write & illustrate your story</p>
            </div>
            <form onSubmit={generate} className="generate-form">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., A dragon who loves baking cookies"
                className="input"
              />

              <div className="model-row">
                <div className="model-group">
                  <label>Text Model</label>
                  <div className="search-wrap">
                    <input
                      type="text"
                      value={textSearch}
                      onChange={e => { setTextSearch(e.target.value); setShowTextDropdown(true) }}
                      onFocus={() => setShowTextDropdown(true)}
                      onBlur={() => setTimeout(() => setShowTextDropdown(false), 200)}
                      placeholder={modelsLoading ? 'Loading...' : textModel}
                      className="input search-input"
                      disabled={modelsLoading}
                    />
                    {showTextDropdown && !modelsLoading && (
                      <div className="search-dropdown">
                        {models.text?.filter(m =>
                          m.id.toLowerCase().includes(textSearch.toLowerCase()) ||
                          (m.name && m.name.toLowerCase().includes(textSearch.toLowerCase()))
                        ).slice(0, 100).map(m => (
                          <div
                            key={m.id}
                            className={`search-item ${textModel === m.id ? 'active' : ''}`}
                            onMouseDown={() => { setTextModel(m.id); setTextSearch(''); setShowTextDropdown(false) }}
                          >{m.name || m.id}</div>
                        ))}
                        {models.text?.filter(m =>
                          m.id.toLowerCase().includes(textSearch.toLowerCase()) ||
                          (m.name && m.name.toLowerCase().includes(textSearch.toLowerCase()))
                        ).length === 0 && <div className="search-empty">No matches</div>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="model-group">
                  <label>Image Model</label>
                  <div className="search-wrap">
                    <input
                      type="text"
                      value={imageSearch}
                      onChange={e => { setImageSearch(e.target.value); setShowImageDropdown(true) }}
                      onFocus={() => setShowImageDropdown(true)}
                      onBlur={() => setTimeout(() => setShowImageDropdown(false), 200)}
                      placeholder={modelsLoading ? 'Loading...' : imageModel}
                      className="input search-input"
                      disabled={modelsLoading}
                    />
                    {showImageDropdown && !modelsLoading && (
                      <div className="search-dropdown">
                        {models.image?.filter(m =>
                          m.id.toLowerCase().includes(imageSearch.toLowerCase()) ||
                          (m.name && m.name.toLowerCase().includes(imageSearch.toLowerCase()))
                        ).slice(0, 100).map(m => (
                          <div
                            key={m.id}
                            className={`search-item ${imageModel === m.id ? 'active' : ''}`}
                            onMouseDown={() => { setImageModel(m.id); setImageSearch(''); setShowImageDropdown(false) }}
                          >{m.name || m.id}</div>
                        ))}
                        {models.image?.filter(m =>
                          m.id.toLowerCase().includes(imageSearch.toLowerCase()) ||
                          (m.name && m.name.toLowerCase().includes(imageSearch.toLowerCase()))
                        ).length === 0 && <div className="search-empty">No matches</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="model-group">
                <label>Art Style</label>
                <div className="search-wrap">
                  <input
                    type="text"
                    value={styleSearch}
                    onChange={e => { setStyleSearch(e.target.value); setShowStyleDropdown(true) }}
                    onFocus={() => setShowStyleDropdown(true)}
                    onBlur={() => setTimeout(() => setShowStyleDropdown(false), 200)}
                    placeholder={artStyle}
                    className="input search-input"
                  />
                  {showStyleDropdown && (
                    <div className="search-dropdown">
                      {STYLES.filter(s =>
                        s.name.toLowerCase().includes(styleSearch.toLowerCase()) ||
                        s.desc.toLowerCase().includes(styleSearch.toLowerCase())
                      ).map(s => (
                        <div
                          key={s.name}
                          className={`search-item ${artStyle === s.name ? 'active' : ''}`}
                          onMouseDown={() => { setArtStyle(s.name); setStyleSearch(''); setShowStyleDropdown(false) }}
                        >
                          <div style={{fontWeight:600}}>{s.name}</div>
                          {s.desc && <div style={{fontSize:'0.75rem',color:'var(--text2)',marginTop:2,lineHeight:1.3}}>{s.desc}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="page-selector">
                <label>Pages:</label>
                {[2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`btn-page ${pages === n ? 'active' : ''}`}
                    onClick={() => setPages(n)}
                  >{n}</button>
                ))}
              </div>

              <label className="audio-toggle">
                <input
                  type="checkbox"
                  checked={generateAudio}
                  onChange={e => setGenerateAudio(e.target.checked)}
                />
                🔊 Generate audio narration (costs more pollen)
              </label>

              <button type="submit" className="btn-primary" disabled={loading || !theme.trim()}>
                {loading ? progressText || 'Generating...' : '✨ Generate Story'}
              </button>
              {loading && progress > 0 && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  <span className="progress-label">{progressText} ({progress}%)</span>
                </div>
              )}
            </form>

            {stories.length > 0 && (
              <div className="history">
                <h3>Your Stories</h3>
                <div className="story-grid">
                  {stories.map(s => (
                    <div key={s.id} className="story-card" onClick={() => setCurrentStory(s)}>
                      <div className="story-card-title">{s.title}</div>
                      <button className="btn-delete" onClick={(e) => { e.stopPropagation(); deleteStory(s.id) }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
