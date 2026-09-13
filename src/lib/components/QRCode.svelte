<script lang="ts">
  import QRCode from 'qrcode';
  import { onMount } from 'svelte';

  export let value: string;
  export let size: number = 200;
  export let level: 'L' | 'M' | 'Q' | 'H' = 'M';

  let canvas: HTMLCanvasElement;
  let qrDataURL: string = '';

  onMount(async () => {
    await generateQR();
  });

  async function generateQR() {
    if (!value) return;

    try {
      qrDataURL = await QRCode.toDataURL(value, {
        width: size,
        margin: 2,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff',
        },
        errorCorrectionLevel: level,
      });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  }

  $: if (value) {
    generateQR();
  }
</script>

<div class="qr-container" style="width: {size}px; height: {size}px;">
  {#if qrDataURL}
    <img src={qrDataURL} alt="QR Code" class="qr-image" />
  {:else}
    <div class="loading">
      <div class="spinner" />
    </div>
  {/if}
</div>

<style>
  .qr-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 0.75rem;
    background-color: white;
  }

  .qr-image {
    height: 100%;
    width: 100%;
    object-fit: contain;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner {
    height: 2rem;
    width: 2rem;
    border: 2px solid rgb(203 213 225);
    border-top-color: rgb(14 165 233);
    border-radius: 9999px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
