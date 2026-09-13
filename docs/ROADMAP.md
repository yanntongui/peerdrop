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

### Features Reused from LocalSend & KDE Connect

#### From LocalSend
| Feature | Implementation | Phase |
|---------|----------------|-------|
| REST Protocol | 6 routes: /register, /prepare-upload, /upload, /cancel, /prepare-download, /download | 1 |
| Multicast UDP | 224.0.0.167:53317 for local discovery | 2 |
| Self-signed certs | Auto-generated HTTPS certificates | 4 |
| CLI | Command-line interface for terminal users | 6 |
| Download API | Receiver-initiated file retrieval | 2 |

#### From KDE Connect
| Feature | Implementation | Phase |
|---------|----------------|-------|
| Persistent pairing | Devices remembered across sessions | 3 |
| Plugin architecture | Modular, extensible feature system | 6 |
| Clipboard sync | Copy/paste between devices | 4 |
| Notifications mirroring | Phone notifications on desktop | 5 |
| Identity packet | Full device metadata exchange | 1 |

### PeerDrop Advantages
| Feature | LocalSend | KDE Connect | **PeerDrop** |
|---------|-----------|-------------|--------------|
| Local transfer | ✅ | ✅ | ✅ |
| Cross-network | ❌ | ❌ | ✅ WebRTC |
| File size limit | ∞ (local) | ∞ (local) | **∞ (global)** |
| Web app | ✅ | ❌ | ✅ |
| Streaming | ❌ | ❌ | ✅ Direct to disk |
| Discovery | Multicast | UDP broadcast | Both + Signaling |
| Phone Clone | ❌ | ❌ | ✅ Full migration |
| REST Protocol | ✅ | ❌ | ✅ Simplified |
| Identity Packet | ❌ | ✅ | ✅ Enhanced |

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

### REST Protocol (LocalSend-Inspired)
```
┌─────────────────────────────────────────────────────────┐
│                   REST API ROUTES                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  POST /api/peers/register                                │
│  → Register device for discovery                         │
│  → Returns: DeviceData (identity packet)                 │
│                                                          │
│  POST /api/transfer/prepare                              │
│  → Send file metadata (name, size, hash)                 │
│  → Returns: transferId, tokens                           │
│                                                          │
│  POST /api/transfer/upload?transferId=X&fileId=Y&token=Z │
│  → Upload file chunk (binary)                            │
│  → Returns: 200 OK                                       │
│                                                          │
│  POST /api/transfer/cancel?transferId=X                  │
│  → Cancel active transfer                                │
│  → Returns: 200 OK                                       │
│                                                          │
│  POST /api/download/request                              │
│  → Receiver requests file metadata                       │
│  → Returns: FileMeta list                                │
│                                                          │
│  GET /api/download/[fileId]?token=X                      │
│  → Receiver downloads file (binary stream)               │
│  → Returns: file data                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Identity Packet (KDE Connect-Inspired)
```json
{
  "id": "740bd4b9b4184ee497d6caf1da9315be",
  "alias": "MacBook Pro de Yann",
  "deviceModel": "MacBook Pro 16\"",
  "deviceType": "desktop",
  "fingerprint": "sha256-of-certificate",
  "protocol": "webrtc",
  "capabilities": ["files", "clipboard", "notifications"],
  "version": "1.0.0",
  "os": "macOS 14.0",
  "ip": "192.168.1.42",
  "port": 53317
}
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

### DeviceData (Identity Packet)
```
id: string (UUID)
alias: string (user-defined name)
deviceModel: string (e.g., "MacBook Pro")
deviceType: 'mobile' | 'desktop' | 'tablet' | 'web'
fingerprint: string (SHA-256 of certificate)
protocol: 'webrtc' | 'rest'
capabilities: string[] (files, clipboard, notifications)
version: string (app version)
os: string (iOS, Android, macOS, Windows, Linux)
ip: string | null (local IP)
port: number | null
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
- **Identity packet (device metadata)**
- **REST protocol (LocalSend-inspired)**

### Database Changes
- None (all in-memory / IndexedDB)

### API Routes (REST Protocol)
- `POST /api/peers/register` — register device / discovery
- `POST /api/transfer/prepare` — send file metadata
- `POST /api/transfer/upload` — send file chunk
- `POST /api/transfer/cancel` — cancel transfer
- `WS /socket.io` — signaling WebSocket

### Identity Packet
```json
{
  "id": "device-uuid",
  "alias": "My Laptop",
  "deviceModel": "MacBook Pro",
  "deviceType": "desktop",
  "fingerprint": "sha256-hash",
  "protocol": "webrtc",
  "capabilities": ["files", "clipboard", "notifications"],
  "version": "1.0.0"
}
```

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
- **Download API (receiver-initiated)**

### Database Changes
- None (still stateless)

### API Routes
- `POST /api/link` — create share link
- `GET /api/link/[id]` — validate link
- `POST /api/download/request` — receiver requests file
- `GET /api/download/[fileId]` — receiver downloads file
- `GET /api/peers/discover` — discover local peers

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
- [ ] **Download API (receiver-initiated)**
- [ ] **File metadata exchange**

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

## Phase 7 — Phone Clone / Migration Mode
*Goal: Full device migration — transfer everything from old phone to new phone.*
*Depends on: Phase 6*
*Estimated effort: 4-5 sessions*

### What's New
- **Full device clone** (contacts, messages, apps, photos, settings)
- **Category-based selection** (choose what to migrate)
- **QR code pairing** (instant connection)
- **WiFi Direct** (no internet required)
- **Incremental sync** (skip already transferred data)
- **Progress dashboard** (detailed migration status)

### Inspired By
- EasyShare Phone Clone (vivo/iQOO)
- Samsung Smart Switch
- Apple Move to iOS
- Google Backup & Restore

### Migration Categories

| Category | Data | Priority |
|----------|------|----------|
| **Contacts** | All contacts, groups | P0 |
| **Messages** | SMS, MMS, chat history | P0 |
| **Call Logs** | Recent calls | P0 |
| **Photos** | Camera roll, screenshots | P0 |
| **Videos** | All videos | P0 |
| **Apps** | APK list + data (if supported) | P1 |
| **Music** | Audio files | P0 |
| **Documents** | PDF, files | P0 |
| **Settings** | WiFi, Bluetooth, display | P2 |
| **Home Screen** | App layout | P2 |
| **Notes** | Notes content | P1 |
| **Calendar** | Events, reminders | P1 |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                OLD DEVICE (Sender)                        │
├─────────────────────────────────────────────────────────┤
│  1. Scan categories (contacts, photos, apps, etc.)       │
│  2. Generate manifest (list of all data)                 │
│  3. Display QR code with connection info                 │
│  4. Wait for new device to connect                       │
└─────────────────────────────────────────────────────────┘
                          │
                          │ QR Code Scan
                          ▼
┌─────────────────────────────────────────────────────────┐
│               NEW DEVICE (Receiver)                       │
├─────────────────────────────────────────────────────────┤
│  1. Scan QR code → establish WiFi Direct connection      │
│  2. Receive manifest → display selection UI              │
│  3. User selects categories to transfer                  │
│  4. Receive data → restore to system                     │
│  5. Install apps (with user permission)                  │
└─────────────────────────────────────────────────────────┘
```

### Data Model

#### MigrationSession
```
id: string (UUID)
oldDeviceId: string
newDeviceId: string
status: 'connecting' | 'scanning' | 'transferring' | 'restoring' | 'completed'
categories: MigrationCategory[]
startedAt: Date
completedAt: Date | null
totalSize: number
transferredSize: number
```

#### MigrationCategory
```
id: string
name: string (contacts, photos, apps, etc.)
enabled: boolean
itemCount: number
totalSize: number
transferred: number
status: 'pending' | 'scanning' | 'transferring' | 'restoring' | 'completed'
items: MigrationItem[]
```

#### MigrationItem
```
id: string
categoryId: string
name: string
size: number
type: string
sourcePath: string
destPath: string
status: 'pending' | 'transferred' | 'restored' | 'skipped'
hash: string
```

### API Routes
- `POST /api/migration/start` — start migration session
- `POST /api/migration/manifest` — send/receive data manifest
- `POST /api/migration/transfer` — transfer category data
- `POST /api/migration/restore` — restore data on new device
- `GET /api/migration/status` — check migration progress

### Frontend
- `/migrate` — Migration landing page
- `/migrate/scan` — QR code scanner
- `/migrate/select` — Category selection UI
- `/migrate/progress` — Progress dashboard
- `/migrate/complete` — Migration complete summary

### Task Checklist

#### Core
- [ ] Device discovery (WiFi Direct / hotspot)
- [ ] QR code generation with connection info
- [ ] Manifest generation (scan all data)
- [ ] Category selection UI
- [ ] Incremental transfer (skip existing)
- [ ] Data restoration on new device

#### Data Types
- [ ] Contacts (vCard export/import)
- [ ] Messages (SMS backup format)
- [ ] Call logs
- [ ] Photos/Videos (preserve metadata)
- [ ] Music (preserve playlists)
- [ ] Documents
- [ ] Apps (APK extraction)
- [ ] Settings (WiFi, Bluetooth, etc.)

#### UI
- [ ] Migration wizard (step by step)
- [ ] Category cards with progress
- [ ] Real-time transfer speed
- [ ] ETA calculation
- [ ] Error handling + retry

#### Mobile Integration
- [ ] Android: Contacts API
- [ ] Android: SMS provider
- [ ] Android: Media store
- [ ] Android: Package manager
- [ ] iOS: Contacts framework
- [ ] iOS: Photos framework

### Definition of Done
- Can transfer contacts from old phone to new phone
- Photos transfer with metadata preserved
- Apps list transferred (installation optional)
- Progress shows detailed category status
- Migration completes without data loss
- Works offline (no internet required)

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
| 7 | Phone Clone / Migration | 4-5 | P2 |

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

| Table | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Phase 7 |
|-------|---------|---------|---------|---------|---------|---------|
| Transfer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FileMeta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ChunkInfo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DeviceData | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ShareLink | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PairedDevice | | | ✓ | ✓ | ✓ | ✓ | ✓ |
| TransferHistory | | | | ✓ | ✓ | ✓ | ✓ |
| DeviceSettings | | | | ✓ | ✓ | ✓ | ✓ |
| MigrationSession | | | | | | | ✓ |
| MigrationCategory | | | | | | | ✓ |
| MigrationItem | | | | | | | ✓ |

---

## References

- [LocalSend Protocol](https://github.com/localsend/protocol)
- [KDE Connect Protocol](https://invent.kde.org/network/kdeconnect-meta/-/blob/master/protocol.md)
- [WebRTC DataChannel](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
