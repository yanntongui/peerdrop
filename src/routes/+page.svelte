<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import FileList from '$lib/components/FileList.svelte';
  import QRCode from '$lib/components/QRCode.svelte';
  import QRScanner from '$lib/components/QRScanner.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { createIdentityPacket, type DeviceData } from '$lib/utils/identity';
  import { WebRTCManager } from '$lib/utils/webrtc';
  import { generateFileMeta, streamFile, formatBytes } from '$lib/utils/streaming';
  import { createShareLink, generateShareUrl, type ShareLink } from '$lib/utils/sharelink';
  import { generateTransferId } from '$lib/utils/resume';
  import { onMount } from 'svelte';

  let files: File[] = [];
  let deviceInfo: DeviceData | null = null;
  let roomId: string = '';
  let webrtc: WebRTCManager | null = null;

  let peers: { id: string; device: DeviceData }[] = [];
  let selectedPeers: Set<string> = new Set();
  let transferStatus: 'idle' | 'connecting' | 'waiting' | 'transferring' | 'completed' | 'error' = 'idle';
  let error: string | null = null;

  // Per-peer transfer progress
  interface PeerTransfer {
    peerId: string;
    peerName: string;
    progress: number;
    speed: number;
    bytesTransferred: number;
    status: 'pending' | 'transferring' | 'completed' | 'error';
  }
  let peerTransfers: PeerTransfer[] = [];

  // Share link
  let shareLink: ShareLink | null = null;
  let showShareLink = false;
  let linkCopied = false;

  // QR Scanner
  let showQRScanner = false;

  // Mobile detection
  let isMobileDevice = false;

  // Toast
  let toastShow = false;
  let toastMessage = '';
  let toastType: 'info' | 'success' | 'warning' | 'error' = 'info';

  function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    toastMessage = message;
    toastType = type;
    toastShow = true;
  }

  onMount(async () => {
    deviceInfo = await createIdentityPacket();
    roomId = crypto.randomUUID().slice(0, 8);
    await connectToSignaling();

    if (typeof window !== 'undefined') {
      isMobileDevice = /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || 'Capacitor' in window;
    }
  });

  async function connectToSignaling() {
    if (!deviceInfo) return;

    webrtc = new WebRTCManager({
      signalingUrl: 'http://localhost:3001',
      roomId,
      deviceInfo,
    });

    webrtc.onPeerConnected = (peerId, device) => {
      peers = [...peers, { id: peerId, device }];
      showToast(`${device.alias} connected`, 'success');
    };

    webrtc.onPeerDisconnected = (peerId) => {
      const peer = peers.find((p) => p.id === peerId);
      peers = peers.filter((p) => p.id !== peerId);
      selectedPeers.delete(peerId);
      selectedPeers = selectedPeers;
      if (peer) {
        showToast(`${peer.device.alias} disconnected`, 'warning');
      }
    };

    webrtc.onData = (peerId, data) => {
      if (data.type === 'transfer-accepted') {
        startTransferForPeer(peerId);
      }
    };

    webrtc.onError = (err) => {
      error = err.message;
      showToast(err.message, 'error');
    };

    try {
      await webrtc.connect();
      showToast('Connected to signaling server', 'success');
    } catch (err) {
      error = 'Failed to connect to signaling server';
      showToast(error, 'error');
      console.error(err);
    }
  }

  function handleFiles(event: CustomEvent<File[]>) {
    files = event.detail;
    showToast(`${files.length} file${files.length > 1 ? 's' : ''} selected`, 'info');
  }

  function handleRemoveFile(event: CustomEvent<number>) {
    files = files.filter((_, i) => i !== event.detail);
  }

  function handleClearFiles() {
    files = [];
  }

  function togglePeer(peerId: string) {
    if (selectedPeers.has(peerId)) {
      selectedPeers.delete(peerId);
    } else {
      selectedPeers.add(peerId);
    }
    selectedPeers = selectedPeers;
  }

  function selectAllPeers() {
    if (selectedPeers.size === peers.length) {
      selectedPeers = new Set();
    } else {
      selectedPeers = new Set(peers.map((p) => p.id));
    }
  }

  async function createShareLinkAction() {
    if (files.length === 0) return;

    const fileMetas = await Promise.all(files.map(generateFileMeta));
    shareLink = await createShareLink(roomId, fileMetas, {
      expiresIn: 24 * 60 * 60 * 1000,
    });
    showShareLink = true;
    showToast('Share link created', 'success');
  }

  function handleQRScanned(result: string) {
    const urlMatch = result.match(/\/receive\/([a-zA-Z0-9-]+)/);
    if (urlMatch) {
      window.location.href = `/receive/${urlMatch[1]}`;
    } else {
      window.location.href = `/receive/${result}`;
    }
  }

  async function handleMobileShare() {
    if (files.length === 0) return;
    try {
      const { shareContent } = await import('$lib/utils/mobile');
      const shared = await shareContent({
        title: 'PeerDrop Files',
        text: `Share ${files.length} file${files.length > 1 ? 's' : ''} via PeerDrop`,
        url: `https://peerdrop.app/receive/${roomId}`,
        files,
      });
      if (shared) {
        showToast('Files shared', 'success');
      }
    } catch (e) {
      showToast('Share failed', 'error');
    }
  }

  function copyShareLink() {
    if (!shareLink) return;
    const url = generateShareUrl(shareLink.id);
    navigator.clipboard.writeText(url);
    linkCopied = true;
    showToast('Link copied to clipboard', 'success');
    setTimeout(() => (linkCopied = false), 2000);
  }

  async function sendTransferRequest() {
    if (!webrtc || selectedPeers.size === 0 || files.length === 0) return;

    transferStatus = 'connecting';
    error = null;

    const fileMetas = await Promise.all(files.map(generateFileMeta));
    const transferId = generateTransferId();

    // Initialize progress tracking for each peer
    peerTransfers = Array.from(selectedPeers).map((peerId) => {
      const peer = peers.find((p) => p.id === peerId);
      return {
        peerId,
        peerName: peer?.device.alias || 'Unknown',
        progress: 0,
        speed: 0,
        bytesTransferred: 0,
        status: 'pending' as const,
      };
    });

    // Send request to all selected peers
    for (const peerId of selectedPeers) {
      webrtc.send(peerId, {
        type: 'transfer-request',
        files: fileMetas,
        transferId,
      });
    }

    transferStatus = 'waiting';
    showToast(`Transfer request sent to ${selectedPeers.size} device${selectedPeers.size > 1 ? 's' : ''}`, 'info');
  }

  async function startTransferForPeer(peerId: string) {
    if (!webrtc || files.length === 0) return;

    const peerTransfer = peerTransfers.find((p) => p.peerId === peerId);
    if (peerTransfer) {
      peerTransfer.status = 'transferring';
      peerTransfers = peerTransfers;
    }

    transferStatus = 'transferring';

    try {
      for (const file of files) {
        let bytesTransferred = 0;
        const startTime = Date.now();

        for await (const chunk of streamFile(file)) {
          webrtc.send(peerId, {
            type: 'file-chunk',
            fileId: file.name,
            chunk: {
              index: chunk.index,
              hash: chunk.hash,
              offset: chunk.offset,
              size: chunk.size,
              data: Array.from(new Uint8Array(chunk.data)),
            },
          });

          bytesTransferred += chunk.size;

          // Update per-peer progress
          if (peerTransfer) {
            const totalSize = files.reduce((sum, f) => sum + f.size, 0);
            peerTransfer.bytesTransferred = bytesTransferred;
            peerTransfer.progress = (bytesTransferred / totalSize) * 100;
            peerTransfer.speed = bytesTransferred / ((Date.now() - startTime) / 1000);
            peerTransfers = peerTransfers;
          }
        }
      }

      webrtc.send(peerId, {
        type: 'transfer-complete',
        totalFiles: files.length,
      });

      if (peerTransfer) {
        peerTransfer.status = 'completed';
        peerTransfer.progress = 100;
        peerTransfers = peerTransfers;
      }

      // Check if all peers completed
      const allDone = peerTransfers.every((p) => p.status === 'completed' || p.status === 'error');
      if (allDone) {
        const completedCount = peerTransfers.filter((p) => p.status === 'completed').length;
        transferStatus = 'completed';
        showToast(`Transfer complete to ${completedCount} device${completedCount > 1 ? 's' : ''}`, 'success');
      }
    } catch (err) {
      if (peerTransfer) {
        peerTransfer.status = 'error';
        peerTransfers = peerTransfers;
      }
      showToast(`Transfer failed to ${peerTransfer?.peerName || 'peer'}`, 'error');
      console.error(err);
    }
  }

  $: totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  $: selectedCount = selectedPeers.size;
  $: allPeersSelected = selectedCount === peers.length && peers.length > 0;
</script>

<div class="container">
  <header class="header">
    <h1 class="logo">
      <span class="icon">📁</span>
      PeerDrop
    </h1>
    <p class="tagline">Share files directly. No servers. No limits.</p>
  </header>

  <main class="main">
    {#if !deviceInfo}
      <div class="loading">Initializing...</div>
    {:else if transferStatus === 'idle'}
      <section class="step">
        <h2 class="step-title">1. Select files</h2>
        <DropZone on:files={handleFiles} />
        <FileList {files} on:remove={handleRemoveFile} on:clear={handleClearFiles} />
      </section>

      <section class="step">
        <h2 class="step-title">2. Scan QR Code</h2>
        <div class="qr-section">
          <QRCode value="https://peerdrop.app/receive/{roomId}" size={200} />
          <div class="room-info">
            <span class="label">Room ID:</span>
            <span class="room-id">{roomId}</span>
          </div>
          {#if isMobileDevice}
            <button class="scan-btn" on:click={() => (showQRScanner = true)}>
              📷 Scan QR Code
            </button>
          {/if}
        </div>

        {#if files.length > 0}
          <div class="share-section">
            <button class="share-btn" on:click={createShareLinkAction}>
              🔗 Create Share Link
            </button>
          </div>
        {/if}

        {#if showShareLink && shareLink}
          <div class="share-link-box">
            <input
              class="share-input"
              type="text"
              value={generateShareUrl(shareLink.id)}
              readonly
            />
            <button class="copy-btn" on:click={copyShareLink}>
              {linkCopied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        {/if}
      </section>

      <section class="step">
        <div class="step-header">
          <h2 class="step-title">3. Select devices</h2>
          {#if peers.length > 1}
            <button class="select-all-btn" on:click={selectAllPeers}>
              {allPeersSelected ? 'Deselect all' : 'Select all'}
            </button>
          {/if}
        </div>
        {#if peers.length === 0}
          <p class="no-peers">Waiting for devices to connect...</p>
        {:else}
          <div class="peer-list">
            {#each peers as peer}
              <button
                class="peer-item"
                class:selected={selectedPeers.has(peer.id)}
                on:click={() => togglePeer(peer.id)}
              >
                <div class="peer-checkbox">
                  {#if selectedPeers.has(peer.id)}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  {/if}
                </div>
                <span class="peer-icon">
                  {peer.device.deviceType === 'mobile'
                    ? '📱'
                    : peer.device.deviceType === 'desktop'
                    ? '💻'
                    : '📟'}
                </span>
                <div class="peer-info">
                  <span class="peer-name">{peer.device.alias}</span>
                  <span class="peer-os">{peer.device.os}</span>
                </div>
              </button>
            {/each}
          </div>
          {#if selectedCount > 0}
            <p class="selected-count">{selectedCount} device{selectedCount > 1 ? 's' : ''} selected</p>
          {/if}
        {/if}
      </section>

      {#if files.length > 0 && selectedCount > 0}
        <button class="send-btn" on:click={sendTransferRequest}>
          Send to {selectedCount} device{selectedCount > 1 ? 's' : ''}
        </button>
      {/if}

      {#if isMobileDevice && files.length > 0}
        <button class="mobile-share-btn" on:click={handleMobileShare}>
          📤 Share via...
        </button>
      {/if}

      {#if error}
        <div class="error">{error}</div>
      {/if}

    {:else if transferStatus === 'transferring' || transferStatus === 'completed'}
      <section class="transfer-section">
        <h2 class="step-title">
          {transferStatus === 'completed' ? 'Transfer complete!' : 'Transferring to multiple devices...'}
        </h2>

        <div class="peer-transfers">
          {#each peerTransfers as pt}
            <div class="peer-transfer-item">
              <div class="peer-transfer-header">
                <span class="peer-transfer-name">{pt.peerName}</span>
                <span class="peer-transfer-status" class:completed={pt.status === 'completed'} class:error={pt.status === 'error'}>
                  {pt.status === 'pending' ? 'Waiting...' : pt.status === 'transferring' ? `${Math.round(pt.progress)}%` : pt.status === 'completed' ? '✓ Done' : '✕ Failed'}
                </span>
              </div>
              {#if pt.status === 'transferring'}
                <div class="mini-progress">
                  <div class="mini-progress-bar" style="width: {pt.progress}%" />
                </div>
              {/if}
            </div>
          {/each}
        </div>

        {#if transferStatus === 'completed'}
          <button class="send-btn" on:click={() => { transferStatus = 'idle'; peerTransfers = []; }}>
            Send more files
          </button>
        {/if}
      </section>
    {/if}
  </main>
</div>

<QRScanner bind:show={showQRScanner} on:scanned={(e) => handleQRScanned(e.detail)} />

<Toast bind:show={toastShow} message={toastMessage} type={toastType} />

<style>
  .container {
    max-width: 42rem;
    margin-left: auto;
    margin-right: auto;
    padding: 2rem 1rem;
  }

  .header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .logo {
    margin-bottom: 0.5rem;
    font-size: 2.25rem;
    font-weight: 700;
    color: white;
  }

  .icon {
    margin-right: 0.5rem;
  }

  .tagline {
    color: rgb(148 163 184);
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .step {
    padding: 1.5rem;
    border-radius: 0.75rem;
    background-color: rgba(30 41 59 / 0.5);
  }

  .step-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .step-title {
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
  }

  .step-header .step-title {
    margin-bottom: 0;
  }

  .select-all-btn {
    font-size: 0.8125rem;
    color: rgb(14 165 233);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .select-all-btn:hover {
    background-color: rgba(14 165 233 / 0.1);
  }

  .qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .room-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .label {
    color: rgb(148 163 184);
  }

  .room-id {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: monospace;
    color: rgb(56 189 248);
    background-color: rgb(51 65 85);
  }

  .no-peers {
    text-align: center;
    color: rgb(148 163 184);
  }

  .peer-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .peer-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background-color: rgba(51 65 85 / 0.5);
    transition: all 0.2s;
    width: 100%;
    text-align: left;
  }

  .peer-item:hover {
    background-color: rgb(51 65 85);
  }

  .peer-item.selected {
    outline: 2px solid rgb(14 165 233);
    background-color: rgba(14 165 233 / 0.1);
  }

  .peer-checkbox {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    border: 2px solid rgb(100 116 139);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .peer-item.selected .peer-checkbox {
    background-color: rgb(14 165 233);
    border-color: rgb(14 165 233);
  }

  .peer-checkbox svg {
    width: 0.875rem;
    height: 0.875rem;
    color: white;
  }

  .peer-icon {
    font-size: 1.5rem;
  }

  .peer-info {
    display: flex;
    flex-direction: column;
  }

  .peer-name {
    font-weight: 500;
    color: white;
  }

  .peer-os {
    font-size: 0.875rem;
    color: rgb(148 163 184);
  }

  .selected-count {
    margin-top: 0.75rem;
    font-size: 0.8125rem;
    color: rgb(14 165 233);
    text-align: center;
  }

  .send-btn {
    width: 100%;
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 600;
    color: white;
    background-color: rgb(14 165 233);
    transition: all 0.2s;
  }

  .send-btn:hover {
    background-color: rgb(56 189 248);
  }

  .error {
    padding: 1rem;
    border-radius: 0.75rem;
    text-align: center;
    color: rgb(248 113 113);
    background-color: rgba(127 29 29 / 0.3);
  }

  .transfer-section {
    padding: 1.5rem;
    border-radius: 0.75rem;
    background-color: rgba(30 41 59 / 0.5);
  }

  .peer-transfers {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .peer-transfer-item {
    padding: 0.75rem;
    border-radius: 0.5rem;
    background-color: rgba(51 65 85 / 0.5);
  }

  .peer-transfer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .peer-transfer-name {
    font-weight: 500;
    color: white;
    font-size: 0.875rem;
  }

  .peer-transfer-status {
    font-size: 0.75rem;
    color: rgb(148 163 184);
  }

  .peer-transfer-status.completed {
    color: rgb(34 197 94);
  }

  .peer-transfer-status.error {
    color: rgb(248 113 113);
  }

  .mini-progress {
    height: 0.25rem;
    border-radius: 9999px;
    background-color: rgb(51 65 85);
    overflow: hidden;
  }

  .mini-progress-bar {
    height: 100%;
    border-radius: 9999px;
    background-color: rgb(14 165 233);
    transition: width 0.3s;
  }

  .loading {
    padding: 3rem 0;
    text-align: center;
    color: rgb(148 163 184);
  }

  .share-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(51 65 85 / 0.5);
  }

  .share-btn {
    width: 100%;
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(203 213 225);
    background-color: rgba(51 65 85 / 0.5);
    transition: all 0.2s;
  }

  .share-btn:hover {
    background-color: rgb(51 65 85);
    color: white;
  }

  .share-link-box {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .share-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-family: monospace;
    color: rgb(203 213 225);
    background-color: rgb(15 23 42);
    border: 1px solid rgb(51 65 85);
  }

  .copy-btn {
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: white;
    background-color: rgb(14 165 233);
    transition: all 0.2s;
  }

  .copy-btn:hover {
    background-color: rgb(56 189 248);
  }

  .scan-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    background-color: rgb(51 65 85);
    transition: all 0.2s;
  }

  .scan-btn:hover {
    background-color: rgb(71 85 105);
  }

  .mobile-share-btn {
    width: 100%;
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 600;
    color: white;
    background-color: rgb(34 197 94);
    transition: all 0.2s;
  }

  .mobile-share-btn:hover {
    background-color: rgb(74 222 128);
  }
</style>
