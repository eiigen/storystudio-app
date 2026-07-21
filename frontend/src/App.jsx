import { useState, useEffect, useCallback } from 'react'
import DEFAULT_MODELS from './models.json'

const POLLINATIONS = 'https://gen.pollinations.ai'
const APP_KEY = 'pk_fJFepOdA7LMOZ1LA'
const STORAGE_KEY = 'storystudio_stories'
const POLLEN_KEY = 'storystudio_pollen_key'
const CUSTOM_STYLES_KEY = 'storystudio_custom_styles'
const REDIRECT_URI = window.location.origin + window.location.pathname

const BUILTIN_STYLES = [
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
  { name: 'Manga Shōnen', desc: 'High-energy Japanese action manga with dynamic speed lines, exaggerated expressions, and dramatic panel compositions. Bold black screentones, intense stare-downs, and explosive impact frames with gritty cross-hatching and sweat drops.' },
  { name: 'Stained Glass', desc: 'Gothic cathedral stained glass with bold black leading, jewel-toned translucent panels, and radiant backlighting. Light streams through in luminous shafts, illuminating dust motes in a sacred, reverent atmosphere.' },
  { name: 'Flat Vector', desc: 'Modern minimalist flat design illustration with clean geometric shapes, a harmonious limited color palette, and absolutely zero gradients. Simple, elegant, and professional with subtle shadows and a contemporary app-icon aesthetic.' },
]

const RESOLUTIONS = [
  { name: 'Square SD', w: 512, h: 512 },
  { name: 'Square HD', w: 1024, h: 1024 },
  { name: 'Portrait SD', w: 512, h: 768 },
  { name: 'Portrait HD', w: 1024, h: 1536 },
  { name: 'Landscape SD', w: 768, h: 512 },
  { name: 'Landscape HD', w: 1536, h: 1024 },
  { name: 'Social 1:1', w: 1080, h: 1080 },
  { name: 'Cinema 16:9', w: 1920, h: 1080 },
  { name: 'Custom', w: 0, h: 0 },
]

function StoryImage({ url, text, retryKey, onStatus }) {
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { setStatus('loading'); setAttempt(0) }, [url, retryKey])

  const handleError = () => {
    if (attempt < 2) {
      setAttempt(a => a + 1)
      setStatus('retrying')
    } else {
      setStatus('error')
      onStatus && onStatus('error')
    }
  }

  const handleLoad = () => { setStatus('loaded'); onStatus && onStatus('loaded') }

  const retry = (e) => {
    e.stopPropagation()
    if (attempt < 2) {
      setAttempt(a => a + 1)
      setStatus('loading')
    }
  }

  const srcWithAttempt = attempt === 0 ? url : url + (url.includes('?') ? '&' : '?') + `_r=${attempt}`

  return (
    <div className={`story-image story-image-${status}`}>
      <img src={srcWithAttempt} alt={text.slice(0, 60)} onLoad={handleLoad} onError={handleError} />
      {status === 'loading' && <div className="image-overlay"><div className="spinner" /><span>Generating...</span></div>}
      {status === 'retrying' && <div className="image-overlay"><div className="spinner" /><span>Retrying...</span></div>}
      {status === 'error' && (
        <div className="image-overlay image-error">
          <span>Failed to load</span>
          {attempt < 2 && <button className="btn-retry" onClick={retry}>Retry</button>}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [stories, setStories] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [currentStory, setCurrentStory] = useState(null)
  const [theme, setTheme] = useState('')
  const [pages, setPages] = useState(3)
  const [customPages, setCustomPages] = useState('')
  const [useCustomPages, setUseCustomPages] = useState(false)
  const [textModel, setTextModel] = useState('openai')
  const [imageModel, setImageModel] = useState('flux')
  const [artStyle, setArtStyle] = useState('None')
  const [showStyleDropdown, setShowStyleDropdown] = useState(false)
  const [styleSearch, setStyleSearch] = useState('')
  const [generateAudio, setGenerateAudio] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState(null)
  const [models, setModels] = useState(DEFAULT_MODELS)
  const [textSearch, setTextSearch] = useState('')
  const [imageSearch, setImageSearch] = useState('')
  const [showTextDropdown, setShowTextDropdown] = useState(false)
  const [showImageDropdown, setShowImageDropdown] = useState(false)
  const [pollenKey, setPollenKey] = useState(localStorage.getItem(POLLEN_KEY) || '')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [customStyles, setCustomStyles] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_STYLES_KEY) || '[]') } catch { return [] }
  })
  const [showCustomStyleForm, setShowCustomStyleForm] = useState(false)
  const [newStyleName, setNewStyleName] = useState('')
  const [newStyleDesc, setNewStyleDesc] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [imageStatuses, setImageStatuses] = useState({})
  const [resolution, setResolution] = useState('Square SD')
  const [showResolutionDropdown, setShowResolutionDropdown] = useState(false)
  const [resolutionSearch, setResolutionSearch] = useState('')
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(stories)) }, [stories])
  useEffect(() => { localStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(customStyles)) }, [customStyles])

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

  useEffect(() => {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    fetch(`${POLLINATIONS}/v1/models`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        const all = data.data || data
        const grouped = { text: [], image: [], audio: [], video: [], '3d': [], embeddings: [] }
        for (const m of all) {
          if (grouped[m.output_modalities?.[0] || 'text']) grouped[m.output_modalities?.[0] || 'text'].push({ id: m.id, name: m.name || m.id })
        }
        if (grouped.text.length > 0) setModels(grouped)
      })
      .catch(() => {})
      .finally(() => { clearTimeout(t) })
    return () => { clearTimeout(t); ctrl.abort() }
  }, [])

  const connect = () => {
    const params = new URLSearchParams({ redirect_uri: REDIRECT_URI, client_id: APP_KEY, scope: 'usage' })
    window.location.href = `https://enter.pollinations.ai/authorize?${params}`
  }

  const saveKey = () => {
    localStorage.setItem(POLLEN_KEY, pollenKey.trim())
    setShowKeyInput(false)
  }

  const saveCustomStyle = () => {
    if (!newStyleName.trim() || !newStyleDesc.trim()) return
    setCustomStyles(prev => [...prev, { name: newStyleName.trim(), desc: newStyleDesc.trim() }])
    setNewStyleName(''); setNewStyleDesc(''); setShowCustomStyleForm(false)
  }

  const deleteCustomStyle = (idx) => setCustomStyles(prev => prev.filter((_, i) => i !== idx))

  const exportStories = () => {
    const data = JSON.stringify({ stories, customStyles, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `storystudio-export-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importStories = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.stories && Array.isArray(data.stories)) {
          setStories(prev => [...data.stories, ...prev])
        }
        if (data.customStyles && Array.isArray(data.customStyles)) {
          setCustomStyles(prev => [...data.customStyles, ...prev])
        }
      } catch { alert('Invalid file') }
    }
    reader.readAsText(file)
  }

  const allStyles = [...BUILTIN_STYLES, ...customStyles]

  const generate = async (e) => {
    e.preventDefault()
    if (!theme.trim()) return
    let pageCount
    if (useCustomPages) {
      pageCount = parseInt(customPages)
      if (isNaN(pageCount) || pageCount < 1 || pageCount > 50) {
        setError('Please enter a page number between 1 and 50')
        return
      }
    } else {
      pageCount = pages
    }
    setLoading(true); setError(null); setProgress(0); setProgressText('Starting...'); setImageStatuses({})
    const key = pollenKey.trim()
    let genTimeout
    let genCtrl = new AbortController()
    try {
      setProgress(5); setProgressText('Preparing story prompt...')
      genTimeout = setTimeout(() => genCtrl.abort(), 120000)
      const prompt = `Write a compelling, vivid, emotionally engaging children's story about "${theme}" in exactly ${pageCount} short paragraphs. Each paragraph is one page. Each page should have rich sensory details, interesting characters, and a narrative arc. End with a satisfying conclusion. Return ONLY a JSON array of strings, no other text or formatting. Example: ["Page 1 text...", "Page 2 text..."]`
      const storyRes = await fetch(`${POLLINATIONS}/v1/chat/completions`, {
        signal: genCtrl.signal, method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify({ model: textModel, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
      })
      clearTimeout(genTimeout)
      if (!storyRes.ok) throw new Error(`Story generation failed (${storyRes.status})`)
      const storyData = await storyRes.json()
      setProgress(40); setProgressText('Parsing story text...')
      let pageTexts = []
      try {
        const content = storyData.choices[0].message.content
        pageTexts = JSON.parse(content)
        if (!Array.isArray(pageTexts)) throw new Error('not array')
      } catch {
        pageTexts = storyData.choices[0].message.content.split(/\n\n+/).filter(Boolean).slice(0, pageCount)
      }
      setProgress(50); setProgressText('Preparing image prompts...')
      const style = allStyles.find(s => s.name === artStyle)
      const stylePrefix = style?.desc ? style.desc + '. ' : ''
      const res = RESOLUTIONS.find(r => r.name === resolution)
      const w = resolution === 'Custom' ? parseInt(customW) || 512 : (res?.w || 512)
      const h = resolution === 'Custom' ? parseInt(customH) || 512 : (res?.h || 512)
      const storyPages = pageTexts.map((text, i) => {
        const imagePrompt = 'Children\'s book illustration, ' + stylePrefix + text
        const imageUrl = `${POLLINATIONS}/image/${encodeURIComponent(imagePrompt.slice(0, 300))}?model=${imageModel}&width=${w}&height=${h}${key ? `&key=${encodeURIComponent(key)}` : ''}`
        const page = { pageNum: i + 1, text, imageUrl }
        if (generateAudio) {
          page.audioUrl = `${POLLINATIONS}/audio/${encodeURIComponent(text.slice(0, 100))}?voice=nova${key ? `&key=${encodeURIComponent(key)}` : ''}`
        }
        return page
      })
      setProgress(100); setProgressText('Done!')
      const story = { id: Date.now(), title: theme, pages: storyPages, created_at: new Date().toISOString() }
      setStories(prev => [story, ...prev])
      setCurrentStory(story)
    } catch (err) {
      clearTimeout(genTimeout)
      setError(err.name === 'AbortError' ? 'Request timed out — try again' : err.message)
    } finally {
      setLoading(false); setProgress(0); setProgressText('')
    }
  }

  const handleImageStatus = useCallback((pageNum, status) => {
    if (status === 'error') setImageStatuses(prev => ({ ...prev, [pageNum]: 'error' }))
  }, [])

  const retryAllImages = () => setRetryKey(k => k + 1)

  const deleteStory = (id) => {
    setStories(prev => prev.filter(s => s.id !== id))
    if (currentStory?.id === id) setCurrentStory(null)
  }

  if (!pollenKey) {
    return (
      <div className="splash">
        <div className="splash-card">
          {showKeyInput ? (
            <>
              <div className="logo">📖</div><h1>Enter API Key</h1>
              <p className="tagline">Paste your Pollinations secret key.</p>
              <div className="key-input-row">
                <input type="text" value={pollenKey} onChange={(e) => setPollenKey(e.target.value)} placeholder="sk_..." className="input" />
              </div>
              <button className="btn-primary" onClick={saveKey}>Start Creating</button>
              <button className="btn-link" onClick={() => setShowKeyInput(false)}>← Back</button>
              {error && <div className="error">{error}</div>}
            </>
          ) : (
            <>
              <div className="logo">📖</div><h1>StoryStudio</h1>
              <p className="tagline">AI-powered storybooks in seconds.<br/>Connect your Pollinations account to start.</p>
              <button className="btn-primary" onClick={connect}>Connect with Pollinations</button>
              <button className="btn-link" onClick={() => setShowKeyInput(true)}>Paste a key manually</button>
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
          <label className="btn-ghost file-input">Import<input type="file" accept=".json" onChange={importStories} hidden /></label>
          <button className="btn-ghost" onClick={exportStories}>Export</button>
          <button className="btn-ghost" onClick={() => { localStorage.removeItem(POLLEN_KEY); setPollenKey(''); setCurrentStory(null) }}>Change Key</button>
        </nav>
      </header>
      <main className="content">
        {error && <div className="error">{error}</div>}
        {currentStory && currentStory.pages ? (
          <div className="story-viewer">
            <button className="btn-ghost back" onClick={() => setCurrentStory(null)}>← Back</button>
            <div className="story-viewer-header">
              <h2>{currentStory.title}</h2>
              {imageStatuses.size > 0 && (
                <span className="image-status">{Object.values(imageStatuses).filter(v=>v==='error').length} image(s) failed</span>
              )}
            </div>
            <div className="pages">
              {currentStory.pages.map((page) => (
                <div key={page.pageNum} className="page">
                  <StoryImage url={page.imageUrl} text={page.text} retryKey={retryKey} onStatus={(s) => handleImageStatus(page.pageNum, s)} />
                  <div className="page-text">
                    <span className="page-num">Page {page.pageNum}</span>
                    <p>{page.text}</p>
                    {page.audioUrl && <audio controls src={page.audioUrl} className="page-audio">Your browser does not support audio.</audio>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="generator">
            <div className="hero"><h2>Create a Storybook</h2><p>Enter a theme and watch AI write & illustrate your story</p></div>
            <form onSubmit={generate} className="generate-form">
              <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g., A dragon who loves baking cookies" className="input" />

              <div className="model-row">
                <div className="model-group">
                  <label>Text Model</label>
                  <div className="search-wrap">
                    <input type="text" value={textSearch} onChange={e => { setTextSearch(e.target.value); setShowTextDropdown(true) }} onFocus={() => setShowTextDropdown(true)} onBlur={() => setTimeout(() => setShowTextDropdown(false), 200)} placeholder={textModel} className="input" />
                    {showTextDropdown && (
                      <div className="search-dropdown">
                        {models.text?.filter(m => m.id.toLowerCase().includes(textSearch.toLowerCase())).slice(0, 100).map(m => (
                          <div key={m.id} className={`search-item ${textModel === m.id ? 'active' : ''}`} onMouseDown={() => { setTextModel(m.id); setTextSearch(''); setShowTextDropdown(false) }}>{m.name || m.id}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="model-group">
                  <label>Image Model</label>
                  <div className="search-wrap">
                    <input type="text" value={imageSearch} onChange={e => { setImageSearch(e.target.value); setShowImageDropdown(true) }} onFocus={() => setShowImageDropdown(true)} onBlur={() => setTimeout(() => setShowImageDropdown(false), 200)} placeholder={imageModel} className="input" />
                    {showImageDropdown && (
                      <div className="search-dropdown">
                        {models.image?.filter(m => m.id.toLowerCase().includes(imageSearch.toLowerCase())).slice(0, 100).map(m => (
                          <div key={m.id} className={`search-item ${imageModel === m.id ? 'active' : ''}`} onMouseDown={() => { setImageModel(m.id); setImageSearch(''); setShowImageDropdown(false) }}>{m.name || m.id}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="model-group">
                <label>Art Style</label>
                <div className="search-wrap">
                  <input type="text" value={styleSearch} onChange={e => { setStyleSearch(e.target.value); setShowStyleDropdown(true) }} onFocus={() => setShowStyleDropdown(true)} onBlur={() => setTimeout(() => setShowStyleDropdown(false), 200)} placeholder={artStyle} className="input" />
                  {showStyleDropdown && (
                    <div className="search-dropdown">
                      {allStyles.filter(s => s.name.toLowerCase().includes(styleSearch.toLowerCase()) || s.desc.toLowerCase().includes(styleSearch.toLowerCase())).map(s => (
                        <div key={s.name} className={`search-item ${artStyle === s.name ? 'active' : ''}`} onMouseDown={() => { setArtStyle(s.name); setStyleSearch(''); setShowStyleDropdown(false) }}>
                          <div style={{fontWeight:600}}>{s.name}</div>
                          {s.desc && <div className="style-desc">{s.desc}</div>}
                        </div>
                      ))}
                      <div className="search-item add-custom-style" onMouseDown={() => setShowCustomStyleForm(true)}><div style={{fontWeight:600,color:'var(--accent)'}}>+ Add your own style</div></div>
                    </div>
                  )}
                </div>
              </div>

              {showCustomStyleForm && (
                <div className="custom-style-form">
                  <input type="text" value={newStyleName} onChange={(e) => setNewStyleName(e.target.value)} placeholder="Style name (e.g., My Anime Style)" className="input" />
                  <textarea value={newStyleDesc} onChange={(e) => setNewStyleDesc(e.target.value)} placeholder="Describe the visual style in detail (e.g., Vibrant cel-shaded anime with dramatic lighting, sharp line art...)" rows={3} className="input" />
                  <div className="custom-style-form-buttons">
                    <button type="button" className="btn-primary" onClick={saveCustomStyle}>Save Style</button>
                    <button type="button" className="btn-link" onClick={() => setShowCustomStyleForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {customStyles.length > 0 && (
                <div className="custom-styles-list">
                  <label>Your Custom Styles:</label>
                  <div className="custom-styles-chips">
                    {customStyles.map((s, i) => (
                      <span key={i} className={`style-chip ${artStyle === s.name ? 'active' : ''}`} onClick={() => setArtStyle(s.name)}>
                        {s.name}
                        <button className="chip-delete" onClick={(e) => { e.stopPropagation(); deleteCustomStyle(i) }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="model-group">
                <label>Resolution</label>
                <div className="search-wrap">
                  <input type="text" value={resolutionSearch} onChange={e => { setResolutionSearch(e.target.value); setShowResolutionDropdown(true) }} onFocus={() => setShowResolutionDropdown(true)} onBlur={() => setTimeout(() => setShowResolutionDropdown(false), 200)} placeholder={resolution === 'Custom' ? `Custom (${customW||'?'}x${customH||'?'})` : resolution} className="input" />
                  {showResolutionDropdown && (
                    <div className="search-dropdown">
                      {RESOLUTIONS.filter(r => r.name.toLowerCase().includes(resolutionSearch.toLowerCase())).map(r => (
                        <div key={r.name} className={`search-item ${resolution === r.name ? 'active' : ''}`} onMouseDown={() => { setResolution(r.name); setResolutionSearch(''); setShowResolutionDropdown(false) }}>
                          <div style={{fontWeight:600}}>{r.name}</div>
                          <div className="style-desc">{r.w}x{r.h}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {resolution === 'Custom' && (
                  <div className="res-inputs">
                    <input type="number" min="1" max="4096" value={customW} onChange={e => setCustomW(e.target.value)} placeholder="Width" className="input" style={{width:80}} />
                    <span style={{color:'var(--text2)',margin:'0 4px'}}>×</span>
                    <input type="number" min="1" max="4096" value={customH} onChange={e => setCustomH(e.target.value)} placeholder="Height" className="input" style={{width:80}} />
                  </div>
                )}
              </div>

              <div className="page-selector">
                <label>Pages:</label>
                <div className="page-options">
                  {[2, 3, 4, 5].map(n => (
                    <button key={n} type="button" className={`btn-page ${!useCustomPages && pages === n ? 'active' : ''}`} onClick={() => { setPages(n); setUseCustomPages(false) }}>{n}</button>
                  ))}
                  <button type="button" className={`btn-page ${useCustomPages ? 'active' : ''}`} onClick={() => setUseCustomPages(true)}>Custom</button>
                </div>
                {useCustomPages && (
                  <input type="number" min="1" max="50" value={customPages} onChange={(e) => setCustomPages(e.target.value)} placeholder="1-50" className="input page-custom-input" />
                )}
              </div>

              <label className="audio-toggle">
                <input type="checkbox" checked={generateAudio} onChange={e => setGenerateAudio(e.target.checked)} />
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
                    <div key={s.id} className="story-card" onClick={() => { setCurrentStory(s); setRetryKey(k => k + 1) }}>
                      <div className="story-card-title">{s.title}</div>
                      <div className="story-card-meta">{s.pages.length} pages</div>
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
