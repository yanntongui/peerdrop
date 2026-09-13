# PeerDrop

Universal file access & transfer system - Open source, P2P, E2E encrypted.

## Quick Start

```bash
npm install
npm run dev
```

## Architecture

```
                  ┌───────────────────────┐
                  │   External Apps       │
                  │ PDF / Video / Image   │
                  │ Audio / Documents     │
                  └───────────┬───────────┘
                              │
                         OS Share API
                              │
                              ▼
                  ┌───────────────────────┐
                  │ PeerDrop File Intake  │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ Universal File Source │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │    Transfer Core      │
                  │ Streaming / Chunking  │
                  │ Encryption / Resume   │
                  │ Integrity / Dest.     │
                  └───────────┬───────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
          Computer           USB              NAS
             │                │                │
             └────────────────┼────────────────┘
                              │
                              ▼
                       ✓ Transfer Complete
```

## Project Structure

```
peerdrop/
├── packages/
│   ├── file-core/          # UniversalFileSource, metadata, intake
│   ├── transfer-core/      # Session, streaming, integrity, destinations
│   ├── crypto/             # AES-256-GCM, key derivation
│   ├── device-core/        # Device identity, discovery
│   └── protocol/           # WebRTC P2P protocol messages
├── src/
│   ├── lib/                # SvelteKit shared code
│   │   ├── components/     # UI components
│   │   └── utils/          # Utilities
│   └── routes/             # SvelteKit pages
├── server/                 # Signaling server
├── src-tauri/              # Tauri desktop config
└── docs/
    └── ROADMAP.md
```

## Packages

| Package | Purpose |
|---------|---------|
| `@peerdrop/file-core` | UniversalFileSource interface, metadata extraction, file intake pipeline |
| `@peerdrop/transfer-core` | Transfer sessions, streaming engine, integrity checks, destinations, collision resolution |
| `@peerdrop/crypto` | AES-256-GCM encryption, key derivation, key export/import |
| `@peerdrop/device-core` | Device identity, discovery, capabilities |
| `@peerdrop/protocol` | WebRTC P2P protocol messages and serialization |

## Core Interfaces

### UniversalFileSource
```typescript
interface UniversalFileSource {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  openStream(): Promise<ReadableStream<Uint8Array>>;
  readAll(): Promise<ArrayBuffer>;
  hash(): Promise<string>;
  checkAccessibility(): Promise<boolean>;
}
```

### Transfer Session
```typescript
interface TransferSession {
  id: string;
  status: 'idle' | 'transferring' | 'paused' | 'completed' | 'error';
  files: FileTransferInfo[];
  totalSize: number;
  transferredSize: number;
}
```

## Tech Stack

- **Frontend**: SvelteKit + TailwindCSS
- **Desktop**: Tauri 2.x (Rust)
- **Mobile**: Capacitor (Kotlin/Swift)
- **WebRTC**: simple-peer
- **Signaling**: Bun + Socket.io
- **Encryption**: AES-256-GCM + DTLS 1.3

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run check` — Type checking
- `npm run tauri` — Desktop build

## Security Rules

- PeerDrop can transfer what the OS allows the user to access
- PeerDrop must never bypass what the OS or source app intentionally protects
- E2E encryption on all transfers
- SHA-256 integrity verification
- No silent data collection
