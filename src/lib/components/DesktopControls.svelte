<script lang="ts">
  import { isTauri, setAlwaysOnTop, minimizeToTray } from '$lib/utils/tauri';

  let alwaysOnTop = false;
  let isDesktop = false;

  $: isDesktop = isTauri();

  async function toggleAlwaysOnTop() {
    alwaysOnTop = !alwaysOnTop;
    await setAlwaysOnTop(alwaysOnTop);
  }

  async function handleMinimize() {
    await minimizeToTray();
  }
</script>

{#if isDesktop}
  <div class="desktop-controls">
    <button
      class="control-btn"
      class:active={alwaysOnTop}
      on:click={toggleAlwaysOnTop}
      title={alwaysOnTop ? 'Disable always on top' : 'Enable always on top'}
    >
      {#if alwaysOnTop}
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
        </svg>
      {/if}
    </button>

    <button class="control-btn" on:click={handleMinimize} title="Minimize to tray">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    </button>
  </div>
{/if}

<style>
  .desktop-controls {
    display: flex;
    gap: 0.25rem;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    color: rgb(148 163 184);
    transition: all 0.2s;
  }

  .control-btn:hover {
    color: white;
    background-color: rgba(255 255 255 / 0.1);
  }

  .control-btn.active {
    color: rgb(14 165 233);
    background-color: rgba(14 165 233 / 0.1);
  }

  .icon {
    width: 1rem;
    height: 1rem;
  }
</style>
