<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { isMobile } from '$lib/utils/mobile';

  export let show: boolean = false;

  const dispatch = createEventDispatcher<{
    scanned: string;
    close: void;
  }>();

  let scanning = false;
  let manualInput = '';
  let showManual = false;
  let error: string | null = null;

  async function startScan() {
    scanning = true;
    error = null;

    try {
      // Try native camera scan first
      if (isMobile()) {
        const { scanQRCode } = await import('$lib/utils/mobile');
        const result = await scanQRCode();
        if (result) {
          dispatch('scanned', result);
          close();
          return;
        }
      }

      // Fallback: try browser camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      // In a real implementation, we'd use a barcode detection library here
      // For now, show manual input as fallback
      showManual = true;
      scanning = false;

      // Stop camera
      stream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      error = 'Camera access denied or not available';
      scanning = false;
      showManual = true;
    }
  }

  function handleManualSubmit() {
    if (manualInput.trim()) {
      dispatch('scanned', manualInput.trim());
      close();
    }
  }

  function close() {
    show = false;
    scanning = false;
    error = null;
    manualInput = '';
    showManual = false;
    dispatch('close');
  }
</script>

{#if show}
  <div class="scanner-overlay">
    <div class="scanner-modal">
      <div class="scanner-header">
        <h2 class="scanner-title">Scan QR Code</h2>
        <button class="close-btn" on:click={close}>×</button>
      </div>

      <div class="scanner-content">
        {#if scanning}
          <div class="camera-view">
            <div class="camera-placeholder">
              <div class="scan-line" />
            </div>
            <p class="scan-hint">Point camera at QR code</p>
          </div>
        {:else if showManual}
          <div class="manual-input">
            <p class="manual-hint">
              {error || 'Enter the Room ID or Share Link manually'}
            </p>
            <form on:submit|preventDefault={handleManualSubmit}>
              <input
                type="text"
                bind:value={manualInput}
                placeholder="Enter Room ID or paste link"
                class="input-field"
              />
              <button type="submit" class="submit-btn" disabled={!manualInput.trim()}>
                Connect
              </button>
            </form>
          </div>
        {:else}
          <div class="camera-view">
            <div class="camera-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" class="camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <button class="scan-btn" on:click={startScan}>
              Start Camera
            </button>
          </div>
        {/if}
      </div>

      <div class="scanner-footer">
        <button class="link-btn" on:click={() => (showManual = !showManual)}>
          {showManual ? 'Use Camera' : 'Enter Manually'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .scanner-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    background-color: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
  }

  .scanner-modal {
    width: 90%;
    max-width: 24rem;
    border-radius: 1rem;
    overflow: hidden;
    background-color: rgb(15 23 42);
    border: 1px solid rgb(51 65 85);
  }

  .scanner-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgb(51 65 85);
  }

  .scanner-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
  }

  .close-btn {
    font-size: 1.5rem;
    color: rgb(148 163 184);
    line-height: 1;
  }

  .close-btn:hover {
    color: white;
  }

  .scanner-content {
    padding: 1.5rem;
  }

  .camera-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .camera-placeholder {
    position: relative;
    width: 12rem;
    height: 12rem;
    border-radius: 0.75rem;
    background-color: rgb(30 41 59);
    border: 2px dashed rgb(71 85 105);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .scan-line {
    position: absolute;
    width: 80%;
    height: 2px;
    background-color: rgb(14 165 233);
    animation: scan 2s linear infinite;
  }

  @keyframes scan {
    0% { top: 10%; }
    50% { top: 90%; }
    100% { top: 10%; }
  }

  .camera-icon {
    width: 3rem;
    height: 3rem;
    color: rgb(71 85 105);
  }

  .scan-hint {
    font-size: 0.875rem;
    color: rgb(148 163 184);
  }

  .scan-btn {
    padding: 0.625rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    color: white;
    background-color: rgb(14 165 233);
    transition: all 0.2s;
  }

  .scan-btn:hover {
    background-color: rgb(56 189 248);
  }

  .manual-input {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .manual-hint {
    font-size: 0.875rem;
    color: rgb(148 163 184);
    text-align: center;
  }

  .input-field {
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: white;
    background-color: rgb(30 41 59);
    border: 1px solid rgb(51 65 85);
  }

  .input-field:focus {
    outline: none;
    border-color: rgb(14 165 233);
  }

  .submit-btn {
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    color: white;
    background-color: rgb(14 165 233);
    transition: all 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    background-color: rgb(56 189 248);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .scanner-footer {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid rgb(51 65 85);
    text-align: center;
  }

  .link-btn {
    font-size: 0.875rem;
    color: rgb(14 165 233);
  }

  .link-btn:hover {
    color: rgb(56 189 248);
  }
</style>
