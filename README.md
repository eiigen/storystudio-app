# StoryStudio — AI Storybook Generator

Create illustrated children's stories with AI. Enter a theme, pick a text and image model, choose an art style, and StoryStudio writes a multi-page story with matching illustrations and optional audio narration.

Built with [Pollinations.ai](https://pollinations.ai).

## Live

https://eiigen.github.io/storystudio-app/

## Usage

1. Get a Pollinations API key at [enter.pollinations.ai](https://enter.pollinations.ai/keys) or use the OAuth Connect flow
2. Type a story theme (e.g. "A dragon who loves baking cookies")
3. Choose text and image models (searchable dropdowns)
4. Pick an art style (or create your own custom style)
5. Set page count (2-50 via custom input)
6. Toggle audio narration on/off
7. Click Generate

Stories are saved in your browser (localStorage). Export/Import buttons let you back up or share your stories.

## Features

- **Multi-modal generation**: text + images + optional audio per page
- **18 art styles**: Whimsical Watercolor, Dark Fantasy, Studio Ghibli, Cyberpunk Neon, and more
- **Custom styles**: create and save your own style prompts
- **Image retry**: failed images auto-retry up to 2 times, with manual Retry button
- **Custom page count**: 1-50 pages
- **Export/Import**: JSON export/import for story backup and sharing
- **OAuth Connect**: one-click Pollinations account authorization
- **Searchable model dropdowns**: 146 text models, 27 image models
- **Progress bar**: real-time generation progress
- **Persistent storage**: stories saved in localStorage

## Tech

- React 18 + Vite
- Pollinations.ai API (text, image, audio)
- GitHub Pages

## To-Do

- [ ] Batch mode: generate multiple story variations in parallel
- [ ] Regenerate single pages (re-roll image or text for one page)
- [ ] Story editing: edit text and regenerate images per page
- [ ] Multi-language support
- [ ] PDF export
- [ ] Dark/light theme toggle
- [ ] Story sharing via URL (share encoded story data)
- [ ] Mobile responsive improvements
- [ ] Offline mode (cached models list)
- [ ] Rate limiting display (show remaining pollen balance)
- [ ] Undo/redo for story edits
- [ ] Drag-and-drop page reordering