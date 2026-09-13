# PeerDrop — Roadmap

> **One sentence**: Open-source P2P file sharing app — send files of ANY size directly between devices, no server storage, E2E encrypted.

> **Who**: Privacy-conscious users, developers, teams needing fast secure file transfers without cloud storage.

> **Why**: Existing solutions (WeTransfer, Google Drive) store files on servers. AirDrop is Apple-only. Snapdrop was acquired by LimeWire. LocalSend is local-only. PeerDrop is the open-source, cross-platform, privacy-first alternative with unlimited file size.

> **Constraint**: SvelteKit + TailwindCSS frontend, Tauri desktop, WebRTC for P2P, no backend storage.

> **Not building**: Real-time collaboration, plugin ecosystem, cloud storage, account system (v1).

---

## Competitive Analysis

### LocalSend (90k+ ⭐)
- **Architecture**: REST API + HTTPS (no WebRTC)
- **Discovery**: Multicast UDP (224.0.0.167:53317)
- **Transfer**: HTTP POST direct
- **Limitation**: Local network only, no cross-network

### KDE Connect
- **Architecture**: JSON packets + TCP/UDP
- **Discovery**: UDP broadcast (port 1716) + mDNS
- **Transfer**: SFTP (plugin Share)
- **Features**: Notifications, clipboard, remote control
- **Limitation**: Local only, complex protocol

### PeerDrop Advantages
| Feature | LocalSend | KDE Connect | **PeerDrop** |
|---------|-----------|-------------|--------------|
| Local transfer | ✅ | ✅ | ✅ |
| Cross-network | ❌ | ❌ | ✅ WebRTC |
| File size limit | ∞ (local) | ∞ (local) | **∞ (global)** |
| Web app | ✅ | ❌ | ✅ |
| Streaming | ❌ | ❌ | ✅ Direct to disk |
| Discovery | Multicast | UDP broadcast | Both + Signaling |

---

## Architecture

### Discovery System (Hybrid)
```
┌─────────────────────────────────────────────────────────┐
│                 DISCOVERY LAYER                          │
├─────────────────────────────────────────────────────────┤
│  1. Local: Multicast UDP (224.0.0.167:53317)           │
│     - No server needed                                  │
│     - Instant discovery                                 │
│     - Works offline                                     │
│                                                         │
│  2. Remote: Signaling server (WebSocket)                │
│     - Cross-network                                     │
│     - Room-based pairing                                │
│     - QR code / link sharing                            │
└─────────────────────────────────────────────────────────┘
```

### Streaming Architecture (Unlimited Size)
```
┌─────────────────────────────────────────────────────────┐
│                    SENDER                                 │
├─────────────────────────────────────────────────────────┤
│  file.stream() → ReadableStream                          │
│  → Chunk 64 KB → SHA-256 → DataChannel                  │
│  → Memory: ~64 KB only (no file loading)                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   RECEIVER                                │
├─────────────────────────────────────────────────────────┤
│  DataChannel → Hash verification                         │
│  → File System Access API → Direct disk write            │
│  → Memory: ~64 KB only                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | SvelteKit | Fast, minimal bundle, great DX |
| Styling | TailwindCSS + shadcn-svelte | Rapid UI, consistent design |
| Desktop | Tauri 2.x | Rust backend, ~5MB vs Electron 150MB |
| Mobile | Capacitor | Code sharing with web |
| WebRTC | simple-peer | Clean abstraction over RTCPeerConnection |
| Discovery | Multicast UDP + WebSocket | Local + remote |
| Signaling | Bun + Socket.io | Fast WebSocket server |
| STUN/TURN | coturn | Self-hosted, full control |
| Storage | IndexedDB | Transfer state only |
| Hashing | Web Crypto API | SHA-256 integrity checks |
| File API | File System Access API | Direct disk write |

---

## Data Model

### Transfer
```
id: string (UUID)
senderId: string
receiverId: string | null
roomId: string
files: FileMeta[]
status: 'waiting' | 'connecting' | 'transferring' | 'completed' | 'failed'
progress: number (0-100)
startedAt: Date
completedAt: Date | null
```

### FileMeta
```
name: string
size: number (UNLIMITED)
type: string
hash: string (SHA-256)
chunks: ChunkInfo[]
```

### ChunkInfo
```
index: number
hash: string
offset: number
size: number
sent: boolean
```

### PairedDevice
```
id: string
name: string
publicKey: string
fingerprint: string
lastSeen: Date
trusted: boolean
protocol: 'local' | 'remote'
```

### ShareLink
```
id: string
transferId: string
expiresAt: Date
maxDownloads: number
currentDownloads: number
passwordHash: string | null
```

---

## Phase 1 — MVP Local Transfer
*Goal: Two devices on the same network can share files via QR code.*
*Estimated effort: 2-3 sessions*

### What's New
- Drag & drop file selection
- QR code generation for room ID
- Basic WebRTC P2P connection
- File chunking (64KB)
- Progress bar
- SHA-256 integrity check
- **Streaming transfer (unlimited size)**
- **Direct disk write (File System Access API)**

### Database Changes
- None (all in-memory / IndexedDB)

### API Routes
- `POST /api/room` — create signaling room
- `WS /socket.io` — signaling WebSocket

### Frontend
- `/` — Home page with drag & drop
- `/receive/[roomId]` — Receiver page
- Components: DropZone, ProgressBar, QRCode

### Infrastructure
- Local dev server (Vite)
- No external services needed

### Task Checklist

#### Setup
- [x] Init SvelteKit project
- [x] Add TailwindCSS
- [x] Configure Vite

#### Core
- [ ] WebRTC signaling server (Bun + Socket.io)
- [ ] File chunking logic (64KB chunks)
- [ ] Streaming transfer (no file loading)
- [ ] P2P connection manager
- [ ] QR code generator
- [ ] File System Access API integration

#### UI
- [ ] DropZone component
- [ ] ProgressBar component
- [ ] Transfer status page
- [ ] Mobile responsive layout

#### Testing
- [ ] Manual test: Chrome ↔ Chrome
- [ ] Manual test: Mobile ↔ Desktop

### Definition of Done
- Can send file from Device A to Device B on same WiFi
- QR code scans and opens receiver page
- Progress bar shows real-time progress
- File integrity verified via SHA-256
- Large files (>1GB) transfer without memory issues

---

## Phase 2 — Cross-Network + Polish
*Goal: Share files across the internet, not just local network.*
*Depends on: Phase 1*
*Estimated effort: 2-3 sessions*

### What's New
- TURN relay fallback for strict NATs
- Shareable link (not just QR)
- Transfer resume after disconnect
- Better error handling
- Dark mode
- **Multicast UDP discovery (local)**

### Database Changes
- None (still stateless)

### API Routes
- `POST /api/link` — create share link
- `GET /api/link/[id]` — validate link

### Frontend
- `/receive/link/[linkId]` — Link-based receiver
- `/transfer/[transferId]` — Transfer status page
- Toast notifications
- Error boundaries

### Infrastructure
- TURN server (coturn) deployment
- STUN server config

### Task Checklist

#### Networking
- [ ] ICE candidate optimization
- [ ] TURN server integration
- [ ] Connection state management
- [ ] Automatic reconnect logic
- [ ] **Multicast UDP discovery**
- [ ] **Hybrid discovery (local + remote)**

#### Links
- [ ] Share link generation
- [ ] Link expiration logic
- [ ] Link validation

#### UI Polish
- [ ] Dark/light mode toggle
- [ ] Toast notifications
- [ ] Error boundaries
- [ ] Loading states
- [ ] Mobile gestures

#### Transfer
- [ ] Chunk resume on reconnect
- [ ] Pause/resume button
- [ ] Speed calculation (MB/s)
- [ ] ETA estimation
- [ ] **Disk space check before transfer**

### Definition of Done
- Files transfer across different networks
- Shareable link works from any device
- Transfer resumes after brief disconnect
- Dark mode works
- Local discovery works without server

---

## Phase 3 — Security + Features
*Goal: Password protection, file preview, and text snippets.*
*Depends on: Phase 2*
*Estimated effort: 2-3 sessions*

### What's New
- Password protection for transfers
- File preview (images, PDF, video)
- Text snippet sharing
- Transfer expiration
- Max download limit
- **Pairing persistant (device memory)**

### Database Changes
- None (links stored in-memory on signaling server)

### API Routes
- `POST /api/transfer/password` — set password
- `GET /api/preview/[fileId]` — file preview

### Frontend
- Password input modal
- File preview component
- Text snippet textarea
- Transfer settings panel

### Task Checklist

#### Security
- [ ] AES-256-GCM encryption with password
- [ ] PBKDF2 key derivation
- [ ] Password verification flow
- [ ] **Certificate pinning for local HTTPS**

#### Features
- [ ] File preview (image, PDF, video)
- [ ] Text snippet sharing
- [ ] Transfer expiration timer
- [ ] Max download counter
- [ ] **Persistent device pairing**
- [ ] **Device alias customization**

#### UI
- [ ] Password modal
- [ ] Preview modal
- [ ] Settings panel
- [ ] Transfer history (local)
- [ ] **Device list with icons**

### Definition of Done
- Password-protected transfer works
- Image/PDF preview shows before download
- Text snippet can be shared without file
- Links expire after set time
- Devices remember each other

---

## Phase 4 — Desktop App (Tauri)
*Goal: Native desktop app with system tray and file manager integration.*
*Depends on: Phase 3*
*Estimated effort: 3-4 sessions*

### What's New
- Tauri desktop app (Windows, macOS, Linux)
- System tray with quick share
- File manager context menu
- Drag & drop from OS
- Auto-update
- **Clipboard sync**
- **Local HTTPS server**

### Database Changes
- Local SQLite for transfer history

### API Routes
- None (all local)

### Frontend
- Tauri window
- System tray menu
- File manager integration

### Infrastructure
- Tauri build pipeline
- Code signing
- Auto-update server
- **Self-signed certificate generation**

### Task Checklist

#### Tauri Setup
- [ ] Init Tauri project
- [ ] Configure Rust backend
- [ ] Set up IPC bridge

#### Features
- [ ] System tray icon
- [ ] Quick share from tray
- [ ] File manager context menu
- [ ] Global hotkey (Cmd+Shift+S)
- [ ] **Clipboard sync (copy/paste)**
- [ ] **Local HTTPS server**
- [ ] **Certificate generation**

#### Build
- [ ] macOS build + notarize
- [ ] Windows build + sign
- [ ] Linux build (AppImage, deb)
- [ ] Auto-update config

### Definition of Done
- App installs on macOS/Windows/Linux
- Can share files from system tray
- Context menu "Share with PeerDrop" works
- Auto-update downloads new versions
- Clipboard sync works between devices

---

## Phase 5 — Mobile App (Capacitor)
*Goal: iOS and Android apps with native share sheet.*
*Depends on: Phase 4*
*Estimated effort: 3-4 sessions*

### What's New
- iOS app
- Android app
- Native share sheet integration
- Background transfer
- Push notifications
- **Notifications mirroring**

### Database Changes
- None (same as desktop)

### API Routes
- Push notification endpoint

### Frontend
- Capacitor wrapper
- Native share sheet
- Background mode

### Infrastructure
- App Store submission
- Play Store submission
- Push notification service

### Task Checklist

#### Capacitor Setup
- [ ] Init Capacitor
- [ ] Configure iOS project
- [ ] Configure Android project

#### Native Features
- [ ] Share sheet integration
- [ ] Background transfer
- [ ] Push notifications
- [ ] File provider extension
- [ ] **Notifications mirroring**

#### Store
- [ ] App Store listing
- [ ] Play Store listing
- [ ] Screenshots + descriptions

### Definition of Done
- App downloadable from stores
- Share sheet shows PeerDrop
- Transfer continues in background
- Push notification on receive
- Phone notifications show on desktop

---

## Phase 6 — Multi-Peer + Advanced
*Goal: Share to multiple devices simultaneously, mesh networking.*
*Depends on: Phase 5*
*Estimated effort: 2-3 sessions*

### What's New
- Multi-peer transfers
- Mesh networking
- Folder sharing (auto-zip)
- Transfer queuing
- Bandwidth limiting
- **CLI interface**
- **Plugin architecture (future)**

### Database Changes
- None

### API Routes
- None

### Frontend
- Multi-device selector
- Mesh visualization
- Queue manager

### Task Checklist

#### Multi-Peer
- [ ] Mesh connection manager
- [ ] Chunk distribution logic
- [ ] Multi-receiver progress

#### Folder
- [ ] Folder selection
- [ ] Auto-zip compression
- [ ] Structure preservation

#### Advanced
- [ ] Transfer queue
- [ ] Bandwidth limit slider
- [ ] Connection quality indicator
- [ ] **CLI interface**
- [ ] **Plugin system (foundation)**

### Definition of Done
- Can send to 3+ devices at once
- Folder transfers work
- Queue manages multiple transfers
- CLI can send files

---

## Build Order

| Phase | Goal | Sessions | Priority |
|-------|------|----------|----------|
| 1 | MVP Local Transfer | 2-3 | P0 |
| 2 | Cross-Network + Polish | 2-3 | P0 |
| 3 | Security + Features | 2-3 | P1 |
| 4 | Desktop App (Tauri) | 3-4 | P1 |
| 5 | Mobile App (Capacitor) | 3-4 | P2 |
| 6 | Multi-Peer + Advanced | 2-3 | P2 |

---

## Deliberately Not Building (v1)

- Account system — privacy-first, no registration
- Cloud storage — files never touch servers
- Real-time collaboration — focus on file transfer only
- CRDT sync — out of scope
- Video/audio calling — file transfer only
- **File size limit** — unlimited with streaming

---

## Key Technical Decisions

### 1. Unlimited File Size
- **Approach**: Streaming with ReadableStream
- **Memory**: ~64KB max (chunk size)
- **Disk**: File System Access API for direct write
- **Integrity**: SHA-256 per chunk + full file hash

### 2. Hybrid Discovery
- **Local**: Multicast UDP (no server)
- **Remote**: Signaling server (WebSocket)
- **Fallback**: QR code / share link

### 3. Security
- **Transport**: WebRTC (DTLS 1.3)
- **Password**: AES-256-GCM + PBKDF2
- **Local**: Self-signed HTTPS certificates
- **Verification**: SHA-256 integrity checks

---

## Schema Evolution

| Table | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|-------|---------|---------|---------|---------|---------|---------|
| Transfer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FileMeta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ChunkInfo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ShareLink | | ✓ | ✓ | ✓ | ✓ | ✓ |
| PairedDevice | | | ✓ | ✓ | ✓ | ✓ |
| TransferHistory | | | | ✓ | ✓ | ✓ |
| DeviceSettings | | | | ✓ | ✓ | ✓ |

---

## References

- [LocalSend Protocol](https://github.com/localsend/protocol)
- [KDE Connect Protocol](https://invent.kde.org/network/kdeconnect-meta/-/blob/master/protocol.md)
- [WebRTC DataChannel](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
