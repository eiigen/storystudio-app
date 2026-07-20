# AI StoryStudio 📖

**AI-powered storybook generator** — enter a theme, get a fully illustrated children's story with text, images, and optional audio narration.

Built on [Pollinations.ai](https://pollinations.ai) — multi-modal AI generation (text + image + audio) in one API.

## 🚀 Live App

**[https://eiigen.github.io/storystudio-app/](https://eiigen.github.io/storystudio-app/)**

## ✨ Features

- **Story generation** — AI writes a multi-page story from any theme
- **Illustrations** — each page gets a unique AI-generated image
- **Audio narration** — optional voice narration for each page
- **Model selection** — choose from all available Pollinations text and image models
- **Dynamic model list** — fetches available models from Pollinations API in real-time
- **Your key, your pollen** — bring your own Pollinations API key for usage tracking
- **Persistent stories** — generated stories saved in your browser (localStorage)

## 🔧 How It Works

```
You enter a theme → Pollinations API generates story text → Images generated per page → Story displayed
```

The app calls `gen.pollinations.ai` directly from the browser — no backend server needed. Everything runs client-side.

## 🏗️ Tech Stack

- **Frontend:** React 18 + Vite
- **API:** Pollinations.ai (text, image, audio generation)
- **Hosting:** GitHub Pages
- **Storage:** Browser localStorage

## 🔗 Related

- **Source code (private):** [github.com/eiigen/storystudio](https://github.com/eiigen/storystudio)
- **Pollinations API:** [gen.pollinations.ai](https://gen.pollinations.ai)