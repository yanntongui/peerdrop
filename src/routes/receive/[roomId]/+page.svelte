<script lang="ts">
  import { page } from '$app/stores';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { createIdentityPacket, type DeviceData } from '$lib/utils/identity';
  import { WebRTCManager } from '$lib/utils/webrtc';
  import { saveFileToDisk, writeChunk, closeFileWriter } from '$lib/utils/streaming';
  import { updateTransferProgress, getResumeInfo, generateTransferId } from '$lib/utils/resume';
  import { onMount } from 'svelte';

  $: roomId = $page.params.roomId;

  let deviceInfo: DeviceData | null = null;
  let webrtc: WebRTCManager | null = null;
  let senderInfo: DeviceData | null = null;

  let transferStatus: 'connecting' | 'waiting' | 'receiving' | 'completed' | 'error' = 'connecting';
  let receivedFiles: any[] = [];
  let currentFile: any = null;
  let transferProgress = 0;
  let transferSpeed = 0;
  let bytesReceived = 0;
  let totalBytes = 0;
  let error: string | null = null;
  let transferId: string = '';

  let fileWriter: FileSystemWritableFileStream | null = null;
  let startTime: number = Date.now();

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
    transferId = generateTransferId();
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
      senderInfo = device;
      transferStatus = 'waiting';
      showToast(`${device.alias} connected`, 'success');
    };

    webrtc.onPeerDisconnected = () => {
      if (transferStatus === 'receiving') {
        showToast('Connection lost. Transfer paused.', 'warning');
      }
    };

    webrtc.onData = (peerId, data) => {
      handleData(peerId, data);
    };

    webrtc.onError = (err) => {
      error = err.message;
      transferStatus = 'error';
      showToast(err.message, 'error');
    };

    try {
      await webrtc.connect();
    } catch (err) {
      error = 'Failed to connect to signaling server';
      transferStatus = 'error';
      showToast(error, 'error');
      console.error(err);
    }
  }

  async function handleData(peerId: string, data: any) {
    switch (data.type) {
      case 'transfer-request': {
        senderInfo = webrtc?.getPeers().find((p) => p.peerId === peerId)?.deviceInfo || null;
        receivedFiles = data.files;
        totalBytes = data.files.reduce((sum: number, f: any) => sum + f.size, 0);
        if (data.transferId) transferId = data.transferId;

        // Check if we can resume
        const firstFile = data.files[0];
        if (firstFile) {
          const resumeInfo = getResumeInfo(transferId, firstFile.id);
          if (resumeInfo.canResume) {
            showToast(`Resuming transfer (${Math.round(resumeInfo.percent)}% done)`, 'info');
          }
        }

        webrtc?.send(peerId, { type: 'transfer-accepted' });
        transferStatus = 'receiving';
        startTime = Date.now();
        showToast('Transfer started', 'info');
        break;
      }

      case 'file-chunk':
        await handleFileChunk(data);
        break;

      case 'transfer-complete':
        await handleTransferComplete();
        break;
    }
  }

  async function handleFileChunk(data: any) {
    const { fileId, chunk } = data;

    if (!currentFile || currentFile.id !== fileId) {
      if (fileWriter) {
        await closeFileWriter(fileWriter);
        fileWriter = null;
      }

      currentFile = receivedFiles.find((f) => f.id === fileId);
      if (currentFile) {
        fileWriter = await saveFileToDisk(currentFile.name, currentFile.type, currentFile.size);
      }
    }

    if (fileWriter) {
      const uint8Array = new Uint8Array(chunk.data);
      await writeChunk(fileWriter, uint8Array.buffer);
    }

    // Save progress for resume
    updateTransferProgress(
      transferId,
      fileId,
      chunk.index,
      totalBytes,
      chunk.size,
      currentFile?.totalChunks || 0,
      currentFile?.name || 'unknown'
    );

    bytesReceived += chunk.size;
    transferProgress = (bytesReceived / totalBytes) * 100;
    transferSpeed = bytesReceived / ((Date.now() - startTime) / 1000);
  }

  async function handleTransferComplete() {
    if (fileWriter) {
      await closeFileWriter(fileWriter);
      fileWriter = null;
    }

    transferStatus = 'completed';
    showToast(`Received ${receivedFiles.length} file${receivedFiles.length > 1 ? 's' : ''}`, 'success');
  }
</script>

<div class="container">
  <header class="header">
    <h1 class="logo">
      <span class="icon">📥</span>
      PeerDrop
    </h1>
    <p class="tagline">Receiving files...</p>
  </header>

  <main class="main">
    {#if transferStatus === 'connecting'}
      <section class="status-section">
        <div class="spinner" />
        <p>Connecting to sender...</p>
      </section>

    {:else if transferStatus === 'waiting'}
      <section class="status-section">
        <div class="spinner" />
        <p>Waiting for transfer to start...</p>
        {#if senderInfo}
          <p class="sender-info">
            From: {senderInfo.alias} ({senderInfo.os})
          </p>
        {/if}
      </section>

    {:else if transferStatus === 'receiving'}
      <section class="transfer-section">
        <h2 class="step-title">Receiving files...</h2>
        {#if senderInfo}
          <p class="sender-info">
            From: {senderInfo.alias}
          </p>
        {/if}
        <ProgressBar
          progress={transferProgress}
          bytesTransferred={bytesReceived}
          {totalBytes}
          speed={transferSpeed}
          eta={(totalBytes - bytesReceived) / transferSpeed}
          status="transferring"
        />
      </section>

    {:else if transferStatus === 'completed'}
      <section class="completed-section">
        <div class="success-icon">✅</div>
        <h2 class="step-title">Transfer complete!</h2>
        <p class="success-message">
          {receivedFiles.length}
          {receivedFiles.length === 1 ? 'file' : 'files'} received successfully.
        </p>
        <p class="save-location">Files saved to your Downloads folder.</p>
      </section>

    {:else if transferStatus === 'error'}
      <section class="error-section">
        <div class="error-icon">❌</div>
        <h2 class="step-title">Transfer failed</h2>
        <p class="error-message">{error}</p>
        <a href="/" class="back-link">← Back to Home</a>
      </section>
    {/if}
  </main>
</div>

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

  .status-section,
  .transfer-section,
  .completed-section,
  .error-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    border-radius: 0.75rem;
    text-align: center;
    background-color: rgba(30 41 59 / 0.5);
  }

  .spinner {
    margin-bottom: 1rem;
    height: 3rem;
    width: 3rem;
    border: 4px solid rgb(75 85 99);
    border-top-color: rgb(14 165 233);
    border-radius: 9999px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .sender-info {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: rgb(148 163 184);
  }

  .step-title {
    margin-bottom: 1rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
  }

  .success-icon {
    margin-bottom: 1rem;
    font-size: 3.75rem;
  }

  .success-message {
    color: rgb(203 213 225);
  }

  .save-location {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: rgb(148 163 184);
  }

  .error-icon {
    margin-bottom: 1rem;
    font-size: 3.75rem;
  }

  .error-message {
    color: rgb(248 113 113);
  }

  .back-link {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: rgb(14 165 233);
    text-decoration: none;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: rgb(56 189 248);
  }
</style>
