import { useState, useEffect } from 'react'

const POLLINATIONS = 'https://gen.pollinations.ai'
const APP_KEY = 'pk_fJFepOdA7LMOZ1LA'
const STORAGE_KEY = 'storystudio_stories'
const POLLEN_KEY = 'storystudio_pollen_key'
const REDIRECT_URI = window.location.origin + window.location.pathname

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
  const [generateAudio, setGenerateAudio] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [models, setModels] = useState({ text: [], image: [], audio: [] })
  const [modelsLoading, setModelsLoading] = useState(true)
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

  // Fetch models on mount with 5s timeout
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
        setModels(grouped)
      })
      .catch(() => setModels({
        text: [
          { id: 'openai', name: 'openai' }, { id: 'openai-fast', name: 'openai-fast' },
          { id: 'gpt-5.4-mini', name: 'gpt-5.4-mini' }, { id: 'claude-fast', name: 'claude-fast' },
          { id: 'gemini-fast', name: 'gemini-fast' }, { id: 'deepseek', name: 'deepseek' }
        ],
        image: [
          { id: 'flux', name: 'flux' }, { id: 'gptimage', name: 'gptimage' },
          { id: 'sana', name: 'sana' }, { id: 'seedream', name: 'seedream' },
          { id: 'ideogram-v4-turbo', name: 'ideogram-v4-turbo' }
        ],
        audio: []
      }))
      .finally(() => { clearTimeout(t); setModelsLoading(false) })
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
    const key = pollenKey.trim()
    try {
      // Step 1: Generate story text (90s timeout)
      const genCtrl = new AbortController()
      const genTimeout = setTimeout(() => genCtrl.abort(), 90000)
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
      let pageTexts = []
      try {
        const content = storyData.choices[0].message.content
        pageTexts = JSON.parse(content)
        if (!Array.isArray(pageTexts)) throw new Error('not array')
      } catch {
        pageTexts = storyData.choices[0].message.content.split(/\n\n+/).filter(Boolean).slice(0, pages)
      }

      // Step 2: Build pages with images
      const storyPages = pageTexts.map((text, i) => {
        const imageUrl = `${POLLINATIONS}/image/${encodeURIComponent(text.slice(0, 200))}?model=${imageModel}&width=512&height=512&app_key=${APP_KEY}${key ? `&key=${encodeURIComponent(key)}` : ''}`
        const page = { pageNum: i + 1, text, imageUrl }
        if (generateAudio) {
          page.audioUrl = `${POLLINATIONS}/audio/${encodeURIComponent(text.slice(0, 100))}?voice=nova&app_key=${APP_KEY}${key ? `&key=${encodeURIComponent(key)}` : ''}`
        }
        return page
      })

      const story = {
        id: Date.now(),
        title: theme,
        pages: storyPages,
        created_at: new Date().toISOString()
      }

      const updated = [story, ...stories]
      setStories(updated)
      saveStories(updated)
      setCurrentStory(story)
    } catch (err) {
      clearTimeout(genTimeout)
      setError(err.name === 'AbortError' ? 'Request timed out — try again' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteStory = (id) => {
    const updated = stories.filter(s => s.id !== id)
    setStories(updated)
    saveStories(updated)
    if (currentStory?.id === id) setCurrentStory(null)
  }

  if (!pollenKey && !showKeyInput) {
    return (
      <div className="splash">
        <div className="splash-card">
          <div className="logo">📖</div>
          <h1>StoryStudio</h1>
          <p className="tagline">AI-powered storybooks in seconds.<br/>Connect your Pollinations account to start.</p>
          <button className="btn-primary" onClick={connect}>
            Connect with Pollinations
          </button>
          <button className="btn-link" onClick={() => window.open('https://enter.pollinations.ai/keys', '_blank')}>
            I don't have a key yet
          </button>
          <p className="fine-print">or <button className="btn-link-inline" onClick={() => setShowKeyInput(true)}>paste a key manually</button></p>
          {error && <div className="error">{error}</div>}
          <p className="fine-print">Uses Pollinations.ai API</p>
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
                  <div className="page-image" style={{ backgroundImage: `url(${page.imageUrl})` }}>
                    {!page.imageUrl && <div className="image-placeholder">Generating...</div>}
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
                {loading ? 'Generating...' : '✨ Generate Story'}
              </button>
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
