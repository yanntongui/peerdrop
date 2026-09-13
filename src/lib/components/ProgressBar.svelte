<script lang="ts">
  import { formatBytes, formatTime, formatSpeed } from '$lib/utils/streaming';

  export let progress: number = 0; // 0-100
  export let bytesTransferred: number = 0;
  export let totalBytes: number = 0;
  export let speed: number = 0; // bytes per second
  export let eta: number = 0; // seconds remaining
  export let status: 'pending' | 'transferring' | 'completed' | 'error' = 'pending';
  export let error: string | null = null;

  $: percent = Math.min(100, Math.max(0, progress));
</script>

<div class="progress-container">
  <!-- Progress bar -->
  <div class="bar-wrapper">
    <div
      class="bar"
      class:transferring={status === 'transferring'}
      class:completed={status === 'completed'}
      class:error={status === 'error'}
      style="width: {percent}%"
    />
  </div>

  <!-- Stats -->
  <div class="stats">
    <div class="left">
      {#if status === 'pending'}
        <span class="status pending">Waiting...</span>
      {:else if status === 'transferring'}
        <span class="status transferring">Transferring...</span>
      {:else if status === 'completed'}
        <span class="status completed">Complete</span>
      {:else if status === 'error'}
        <span class="status error">Error</span>
      {/if}
    </div>

    <div class="right">
      {#if totalBytes > 0}
        <span class="stat">
          {formatBytes(bytesTransferred)} / {formatBytes(totalBytes)}
        </span>
      {/if}

      {#if speed > 0}
        <span class="stat">{formatSpeed(speed)}</span>
      {/if}

      {#if eta > 0 && status === 'transferring'}
        <span class="stat">{formatTime(eta)}</span>
      {/if}

      <span class="stat percent">{Math.round(percent)}%</span>
    </div>
  </div>

  <!-- Error message -->
  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}
</div>

<style>
  .progress-container {
    width: 100%;
  }

  .bar-wrapper {
    height: 0.5rem;
    width: 100%;
    overflow: hidden;
    border-radius: 9999px;
    background-color: rgb(51 65 85);
  }

  .bar {
    height: 100%;
    border-radius: 9999px;
    transition: all 0.3s;
    background-color: rgb(100 116 139);
  }

  .bar.transferring {
    background-color: rgb(14 165 233);
    animation: pulse 2s infinite;
  }

  .bar.completed {
    background-color: rgb(34 197 94);
  }

  .bar.error {
    background-color: rgb(239 68 68);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .stats {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status {
    font-weight: 500;
  }

  .status.pending { color: rgb(148 163 184); }
  .status.transferring { color: rgb(56 189 248); }
  .status.completed { color: rgb(74 222 128); }
  .status.error { color: rgb(248 113 113); }

  .stat { color: rgb(148 163 184); }
  .percent { font-weight: 600; color: rgb(226 232 240); }

  .error-message {
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: rgb(248 113 113);
    background-color: rgba(127 29 29 / 0.3);
  }
</style>
