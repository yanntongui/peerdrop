<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let status: 'idle' | 'connecting' | 'waiting' | 'transferring' | 'paused' | 'completed' | 'error' = 'idle';

  const dispatch = createEventDispatcher<{
    cancel: void;
    pause: void;
    resume: void;
  }>();

  function handleCancel() {
    dispatch('cancel');
  }

  function handlePauseResume() {
    if (status === 'transferring') {
      dispatch('pause');
    } else if (status === 'paused') {
      dispatch('resume');
    }
  }
</script>

{#if status === 'transferring' || status === 'paused'}
  <div class="controls">
    <button class="control-btn pause-btn" on:click={handlePauseResume}>
      {#if status === 'transferring'}
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
        Pause
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21" />
        </svg>
        Resume
      {/if}
    </button>

    <button class="control-btn cancel-btn" on:click={handleCancel}>
      <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      Cancel
    </button>
  </div>
{/if}

<style>
  .controls {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    flex: 1;
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .icon {
    width: 1rem;
    height: 1rem;
  }

  .pause-btn {
    color: white;
    background-color: rgb(51 65 85);
  }

  .pause-btn:hover {
    background-color: rgb(71 85 105);
  }

  .cancel-btn {
    color: rgb(248 113 113);
    background-color: rgba(127 29 29 / 0.3);
  }

  .cancel-btn:hover {
    background-color: rgba(185 28 28 / 0.3);
  }
</style>
