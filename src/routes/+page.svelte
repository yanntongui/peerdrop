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
  let selectedPeer: string | null = null;
  let transferStatus: 'idle' | 'connecting' | 'waiting' | 'transferring' | 'completed' | 'error' = 'idle';
  let transferProgress = 0;
  let transferSpeed = 0;
  let transferEta = 0;
  let error: string | null = null;
  let startTime: number = 0;

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

    // Detect mobile
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
      if (selectedPeer === peerId) {
        selectedPeer = null;
      }
      if (peer) {
        showToast(`${peer.device.alias} disconnected`, 'warning');
      }
    };

    webrtc.onData = (peerId, data) => {
      if (data.type === 'transfer-accepted') {
        startTransfer(peerId);
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

  function selectPeer(peerId: string) {
    selectedPeer = peerId;
  }

  async function createShareLinkAction() {
    if (files.length === 0) return;

    const fileMetas = await Promise.all(files.map(generateFileMeta));
    shareLink = await createShareLink(roomId, fileMetas, {
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    });
    showShareLink = true;
    showToast('Share link created', 'success');
  }

  function handleQRScanned(result: string) {
    // Parse QR result - could be a URL or room ID
    const urlMatch = result.match(/\/receive\/([a-zA-Z0-9-]+)/);
    if (urlMatch) {
      window.location.href = `/receive/${urlMatch[1]}`;
    } else {
      // Assume it's a room ID
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
    if (!webrtc || !selectedPeer || files.length === 0) return;

    transferStatus = 'connecting';
    error = null;

    const fileMetas = await Promise.all(files.map(generateFileMeta));

    webrtc.send(selectedPeer, {
      type: 'transfer-request',
      files: fileMetas,
      transferId: generateTransferId(),
    });

    transferStatus = 'waiting';
    showToast('Transfer request sent', 'info');
  }

  async function startTransfer(peerId: string) {
    if (!webrtc || files.length === 0) return;

    transferStatus = 'transferring';
    startTime = Date.now();

    try {
      for (const file of files) {
        let bytesTransferred = 0;

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

          const totalSize = files.reduce((sum, f) => sum + f.size, 0);
          transferProgress = (bytesTransferred / totalSize) * 100;
          transferSpeed = bytesTransferred / ((Date.now() - startTime) / 1000);
          transferEta = (totalBytes - bytesTransferred) / transferSpeed;
        }
      }

      webrtc.send(peerId, {
        type: 'transfer-complete',
        totalFiles: files.length,
      });

      transferStatus = 'completed';
      showToast('Transfer complete!', 'success');
    } catch (err) {
      transferStatus = 'error';
      error = 'Transfer failed';
      showToast(error, 'error');
      console.error(err);
    }
  }

  $: totalBytes = files.reduce((sum, f) => sum + f.size, 0);
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
        <h2 class="step-title">3. Connected devices</h2>
        {#if peers.length === 0}
          <p class="no-peers">Waiting for devices to connect...</p>
        {:else}
          <div class="peer-list">
            {#each peers as peer}
              <button
                class="peer-item"
                class:selected={selectedPeer === peer.id}
                on:click={() => selectPeer(peer.id)}
              >
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
        {/if}
      </section>

      {#if files.length > 0 && selectedPeer}
        <button class="send-btn" on:click={sendTransferRequest}>
          Send {files.length} {files.length === 1 ? 'file' : 'files'}
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
          {transferStatus === 'completed' ? 'Transfer complete!' : 'Transferring...'}
        </h2>
        <ProgressBar
          progress={transferProgress}
          bytesTransferred={transferSpeed * ((Date.now() - startTime) / 1000)}
          {totalBytes}
          speed={transferSpeed}
          eta={transferEta}
          status={transferStatus === 'completed' ? 'completed' : 'transferring'}
        />
        {#if transferStatus === 'completed'}
          <button class="send-btn" on:click={() => (transferStatus = 'idle')}>
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

  .step-title {
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
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
