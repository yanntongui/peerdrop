<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import FileList from '$lib/components/FileList.svelte';
  import QRCode from '$lib/components/QRCode.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import { createIdentityPacket, type DeviceData } from '$lib/utils/identity';
  import { WebRTCManager } from '$lib/utils/webrtc';
  import { generateFileMeta, streamFile, formatBytes } from '$lib/utils/streaming';
  import { onMount } from 'svelte';

  // State
  let files: File[] = [];
  let deviceInfo: DeviceData | null = null;
  let roomId: string = '';
  let webrtc: WebRTCManager | null = null;

  // Transfer state
  let peers: { id: string; device: DeviceData }[] = [];
  let selectedPeer: string | null = null;
  let transferStatus: 'idle' | 'connecting' | 'waiting' | 'transferring' | 'completed' | 'error' =
    'idle';
  let transferProgress = 0;
  let transferSpeed = 0;
  let transferEta = 0;
  let error: string | null = null;

  onMount(async () => {
    // Create device identity
    deviceInfo = await createIdentityPacket();

    // Generate room ID
    roomId = crypto.randomUUID().slice(0, 8);

    // Connect to signaling server
    await connectToSignaling();
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
    };

    webrtc.onPeerDisconnected = (peerId) => {
      peers = peers.filter((p) => p.id !== peerId);
      if (selectedPeer === peerId) {
        selectedPeer = null;
      }
    };

    webrtc.onData = (peerId, data) => {
      if (data.type === 'transfer-accepted') {
        startTransfer(peerId);
      }
    };

    try {
      await webrtc.connect();
    } catch (err) {
      error = 'Failed to connect to signaling server';
      console.error(err);
    }
  }

  function handleFiles(event: CustomEvent<File[]>) {
    files = event.detail;
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

  async function sendTransferRequest() {
    if (!webrtc || !selectedPeer || files.length === 0) return;

    transferStatus = 'connecting';
    error = null;

    // Generate file metadata
    const fileMetas = await Promise.all(files.map(generateFileMeta));

    // Send transfer request
    webrtc.send(selectedPeer, {
      type: 'transfer-request',
      files: fileMetas,
    });

    transferStatus = 'waiting';
  }

  async function startTransfer(peerId: string) {
    if (!webrtc || files.length === 0) return;

    transferStatus = 'transferring';

    try {
      for (const file of files) {
        let bytesTransferred = 0;

        for await (const chunk of streamFile(file)) {
          // Send chunk via WebRTC
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

          // Update progress
          const totalSize = files.reduce((sum, f) => sum + f.size, 0);
          transferProgress = (bytesTransferred / totalSize) * 100;
          transferSpeed = bytesTransferred / ((Date.now() - startTime) / 1000);
          transferEta = (totalSize - bytesTransferred) / transferSpeed;
        }
      }

      // Send transfer complete
      webrtc.send(peerId, {
        type: 'transfer-complete',
        totalFiles: files.length,
      });

      transferStatus = 'completed';
    } catch (err) {
      transferStatus = 'error';
      error = 'Transfer failed';
      console.error(err);
    }
  }

  let startTime: number = 0;

  $: if (transferStatus === 'transferring') {
    startTime = Date.now();
  }
</script>

<div class="container">
  <!-- Header -->
  <header class="header">
    <h1 class="logo">
      <span class="icon">📁</span>
      PeerDrop
    </h1>
    <p class="tagline">Share files directly. No servers. No limits.</p>
  </header>

  <!-- Main content -->
  <main class="main">
    {#if !deviceInfo}
      <div class="loading">Initializing...</div>
    {:else if transferStatus === 'idle'}
      <!-- Step 1: Select files -->
      <section class="step">
        <h2 class="step-title">1. Select files</h2>
        <DropZone on:files={handleFiles} />
        <FileList {files} on:remove={handleRemoveFile} on:clear={handleClearFiles} />
      </section>

      <!-- Step 2: Connect to peer -->
      <section class="step">
        <h2 class="step-title">2. Scan QR Code</h2>
        <div class="qr-section">
          <QRCode value="https://peerdrop.app/receive/{roomId}" size={200} />
          <div class="room-info">
            <span class="label">Room ID:</span>
            <span class="room-id">{roomId}</span>
          </div>
        </div>
      </section>

      <!-- Step 3: Select peer -->
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

      <!-- Send button -->
      {#if files.length > 0 && selectedPeer}
        <button class="send-btn" on:click={sendTransferRequest}>
          Send {files.length} {files.length === 1 ? 'file' : 'files'}
        </button>
      {/if}

      <!-- Error -->
      {#if error}
        <div class="error">{error}</div>
      {/if}

    {:else if transferStatus === 'transferring' || transferStatus === 'completed'}
      <!-- Transfer progress -->
      <section class="transfer-section">
        <h2 class="step-title">
          {transferStatus === 'completed' ? 'Transfer complete!' : 'Transferring...'}
        </h2>
        <ProgressBar
          progress={transferProgress}
          bytesTransferred={transferSpeed * ((Date.now() - startTime) / 1000)}
          totalBytes={files.reduce((sum, f) => sum + f.size, 0)}
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
</style>
