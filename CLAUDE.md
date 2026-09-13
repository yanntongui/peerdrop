# PeerDrop

P2P file sharing app - Open source, 50GB+, WebRTC, E2E encrypted.

## Quick Start

```bash
npm install
npm run dev
```

## Project Structure

```
peerdrop/
├── src/
│   ├── lib/           # Shared utilities
│   │   ├── components/
│   │   ├── stores/
│   │   └── utils/
│   ├── routes/        # SvelteKit pages
│   └── app.css        # Global styles
├── docs/
│   └── ROADMAP.md     # Build plan
└── static/            # Static assets
```

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full build plan.

## Tech Stack

- **Frontend**: SvelteKit + TailwindCSS
- **Desktop**: Tauri 2.x
- **Mobile**: Capacitor
- **WebRTC**: simple-peer
- **Signaling**: Bun + Socket.io

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run check` — Type checking
