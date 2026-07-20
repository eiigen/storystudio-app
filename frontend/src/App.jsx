import { useState, useEffect } from 'react'

const API = '/api'

export default function App() {
  const [user, setUser] = useState(null)
  const [stories, setStories] = useState([])
  const [currentStory, setCurrentStory] = useState(null)
  const [theme, setTheme] = useState('')
  const [pages, setPages] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Check for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const verifier = sessionStorage.getItem('pkce_verifier')
    if (code && verifier) {
      exchangeCode(code, verifier)
      window.history.replaceState({}, '', window.location.pathname)
    }
    checkAuth()
  }, [])

  const checkAuth = () => {
    const key = localStorage.getItem('pollinations_key')
    if (key) setUser({ key })
  }

  const login = async () => {
    try {
      const res = await fetch(`${API}/auth/login`, { method: 'POST' })
      const { authUrl, verifier } = await res.json()
      sessionStorage.setItem('pkce_verifier', verifier)
      window.location.href = authUrl
    } catch (err) {
      setError('Login failed: ' + err.message)
    }
  }

  const exchangeCode = async (code, verifier) => {
    try {
      const res = await fetch(`${API}/auth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, verifier })
      })
      const data = await res.json()
      if (data.success) {
        // We don't get the key back (it's server-side only in real impl)
        // For now, mark as authenticated
        localStorage.setItem('pollinations_key', 'connected')
        setUser({ key: 'connected' })
        sessionStorage.removeItem('pkce_verifier')
      } else {
        setError('Auth failed')
      }
    } catch (err) {
      setError('Exchange failed: ' + err.message)
    }
  }

  const logout = () => {
    localStorage.removeItem('pollinations_key')
    setUser(null)
    setCurrentStory(null)
    setStories([])
  }

  const loadStories = async () => {
    try {
      const res = await fetch(`${API}/stories`)
      setStories(await res.json())
    } catch (err) {
      setError('Failed to load stories')
    }
  }

  useEffect(() => { if (user) loadStories() }, [user])

  const generate = async (e) => {
    e.preventDefault()
    if (!theme.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/stories/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, pages })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCurrentStory(data)
      loadStories()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const viewStory = async (id) => {
    const res = await fetch(`${API}/stories/${id}`)
    setCurrentStory(await res.json())
  }

  const deleteStory = async (id) => {
    await fetch(`${API}/stories/${id}`, { method: 'DELETE' })
    if (currentStory?.id === id) setCurrentStory(null)
    loadStories()
  }

  if (!user) {
    return (
      <div className="splash">
        <div className="splash-card">
          <div className="logo">📖</div>
          <h1>StoryStudio</h1>
          <p className="tagline">AI-powered storybooks in seconds.<br/>Bring your own pollen, we'll do the magic.</p>
          <button className="btn-primary" onClick={login}>
            Connect with Pollinations
          </button>
          {error && <div className="error">{error}</div>}
          <p className="fine-print">Uses Pollinations.ai API · 25% of pollen spend supports development</p>
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
          <button className="btn-ghost" onClick={logout}>Disconnect</button>
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
              <button type="submit" className="btn-primary" disabled={loading || !theme.trim()}>
                {loading ? 'Generating...' : '✨ Generate Story'}
              </button>
            </form>

            {stories.length > 0 && (
              <div className="history">
                <h3>Your Stories</h3>
                <div className="story-grid">
                  {stories.map(s => (
                    <div key={s.id} className="story-card" onClick={() => viewStory(s.id)}>
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
