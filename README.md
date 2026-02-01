# ⚒️ ThumbForge

**AI-powered YouTube Thumbnail Generator** — Create click-worthy thumbnails in seconds. No design skills needed.

![ThumbForge](https://img.shields.io/badge/status-proof%20of%20concept-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Next.js](https://img.shields.io/badge/Next.js-16-black)

## What It Does

1. **Paste a YouTube URL** (or describe your video)
2. **AI analyzes your content** — extracts themes, mood, hooks, and suggests thumbnail concepts
3. **Generates multiple thumbnail options** at YouTube-optimized 1280×720 resolution
4. **Optional face integration** — upload your photo and the AI includes your face in the thumbnails
5. **Download and use** — export directly and upload to YouTube

## Features

- 🎬 **Video Analysis** — Extracts transcript and analyzes content automatically
- 🎨 **AI Image Generation** — Creates professional thumbnails via Gemini Flash
- 👤 **Face Integration** — Upload your photo for personalized thumbnails
- ✍️ **Smart Text Overlays** — AI suggests attention-grabbing text (1-4 words)
- 🎯 **CTR-Optimized** — Follows proven YouTube thumbnail best practices
- 📐 **YouTube-Ready** — Outputs at perfect 1280×720 resolution
- 🌙 **Dark UI** — Clean, modern dark theme

## Tech Stack

- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4
- **AI Models:** OpenRouter (Gemini 2.5 Flash Image + Claude 3.5 Sonnet)
- **Video Analysis:** YouTube transcript extraction + AI content analysis
- **Deployment:** Vercel-ready

## Quick Start

### Prerequisites

- Node.js 18+
- An [OpenRouter API key](https://openrouter.ai/keys) (~$0.17 per thumbnail set)

### Setup

```bash
# Clone the repo
git clone https://github.com/empowerment-ai/thumbforge.git
cd thumbforge

# Install dependencies
npm install

# Configure your API key
cp .env.example .env.local
# Edit .env.local and add your OpenRouter API key

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start creating thumbnails.

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/empowerment-ai/thumbforge&env=OPENROUTER_API_KEY)

## How It Works

### Architecture

```
YouTube URL → Transcript Extraction → AI Content Analysis → Thumbnail Concepts
                                                                    ↓
                            Download ← Post-Processing ← AI Image Generation
```

### Models Used

| Task | Model | Cost |
|------|-------|------|
| Video content analysis | Claude 3.5 Sonnet | ~$0.01 |
| Thumbnail generation (×4) | Gemini 2.5 Flash Image | ~$0.16 |
| Text suggestions | Claude 3.5 Sonnet | ~$0.01 |
| **Total per generation** | | **~$0.17** |

### YouTube Thumbnail Best Practices (Built In)

The AI is prompted with proven CTR optimization rules:
- ✅ Single focal point — one clear subject
- ✅ Expressive faces occupying 30-50% of frame
- ✅ High contrast colors
- ✅ Minimal text (1-4 bold words max)
- ✅ Curiosity gap — hint without revealing
- ✅ Avoid bottom-right corner (duration badge)

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze a YouTube video or text description |
| `/api/generate` | POST | Generate thumbnail images from analysis |
| `/api/text-suggestions` | POST | Get AI text overlay suggestions |

### Example: Analyze a Video

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"youtubeUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### Example: Generate Thumbnails

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"analysis": {...}, "count": 4}'
```

## Roadmap

- [x] Video URL analysis pipeline
- [x] AI thumbnail generation
- [x] Face photo integration
- [x] Text overlay suggestions
- [x] Dark theme UI
- [ ] Face model training (multi-photo)
- [ ] Style cloning from successful thumbnails
- [ ] A/B test preview
- [ ] Template library
- [ ] Direct YouTube upload
- [ ] Shorts/Reels support (vertical format)

## Contributing

This is an open-source proof of concept. PRs welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes
4. Push and open a PR

## License

MIT — See [LICENSE](LICENSE) for details.

## Credits

Built by [Empowerment AI](https://empowerment-ai.com) · Powered by [OpenRouter](https://openrouter.ai)
