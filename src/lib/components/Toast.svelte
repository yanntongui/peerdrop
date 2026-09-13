<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';

  export let message: string = '';
  export let type: 'info' | 'success' | 'warning' | 'error' = 'info';
  export let duration: number = 5000;
  export let show: boolean = false;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  let timeout: ReturnType<typeof setTimeout>;

  onMount(() => {
    if (show && duration > 0) {
      startTimer();
    }
  });

  function startTimer() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      close();
    }, duration);
  }

  function close() {
    show = false;
    clearTimeout(timeout);
    dispatch('close');
  }

  $: if (show && duration > 0) {
    startTimer();
  }
</script>

{#if show}
  <div class="toast {type}">
    <div class="content">
      <span class="icon">
        {#if type === 'success'}
          ✓
        {:else if type === 'error'}
          ✕
        {:else if type === 'warning'}
          ⚠
        {:else}
          ℹ
        {/if}
      </span>
      <span class="message">{message}</span>
    </div>
    <button class="close-btn" on:click={close}>×</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 300px;
    max-width: 450px;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
    z-index: 1000;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast.info {
    background-color: rgb(30 41 59);
    border: 1px solid rgb(51 65 85);
    color: rgb(203 213 225);
  }

  .toast.success {
    background-color: rgb(5 46 22);
    border: 1px solid rgb(22 101 52);
    color: rgb(134 239 172);
  }

  .toast.warning {
    background-color: rgb(69 26 3);
    border: 1px solid rgb(120 53 15);
    color: rgb(253 224 71);
  }

  .toast.error {
    background-color: rgb(69 10 10);
    border: 1px solid rgb(127 29 29);
    color: rgb(252 165 165);
  }

  .content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .message {
    font-size: 0.875rem;
  }

  .close-btn {
    padding: 0.25rem;
    font-size: 1.25rem;
    line-height: 1;
    color: inherit;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .close-btn:hover {
    opacity: 1;
  }
</style>
