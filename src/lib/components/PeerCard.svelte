<script lang="ts">
  import type { DeviceData } from '$lib/utils/identity';

  export let peer: DeviceData;
  export let selected: boolean = false;
  export let connected: boolean = false;

  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    select: void;
  }>();

  function handleSelect() {
    dispatch('select');
  }

  function getDeviceIcon(type: DeviceData['deviceType']): string {
    switch (type) {
      case 'mobile':
        return '📱';
      case 'desktop':
        return '💻';
      case 'tablet':
        return '📟';
      default:
        return '🌐';
    }
  }

  function getStatusColor(): string {
    if (connected) return 'rgb(34 197 94)'; // green
    if (selected) return 'rgb(14 165 233)'; // sky
    return 'rgb(100 116 139)'; // slate
  }
</script>

<button
  class="peer-card"
  class:selected
  class:connected
  on:click={handleSelect}
>
  <div class="avatar">
    <span class="icon">{getDeviceIcon(peer.deviceType)}</span>
    <span class="status-dot" style="background-color: {getStatusColor()}" />
  </div>
  <div class="info">
    <span class="name">{peer.alias}</span>
    <span class="details">
      {peer.os}
      {#if connected}
        <span class="connected-badge">Connected</span>
      {/if}
    </span>
  </div>
  <div class="capabilities">
    {#each peer.capabilities.slice(0, 3) as cap}
      <span class="cap-badge">{cap}</span>
    {/each}
  </div>
</button>

<style>
  .peer-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding: 1rem;
    border-radius: 0.75rem;
    text-align: left;
    transition: all 0.2s;
    background-color: rgba(51 65 85 / 0.5);
    border: 2px solid transparent;
  }

  .peer-card:hover {
    background-color: rgb(51 65 85);
  }

  .peer-card.selected {
    border-color: rgb(14 165 233);
    background-color: rgba(14 165 233 / 0.1);
  }

  .peer-card.connected {
    border-color: rgb(34 197 94);
  }

  .avatar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    background-color: rgb(30 41 59);
  }

  .icon {
    font-size: 1.5rem;
  }

  .status-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    border-radius: 9999px;
    border: 2px solid rgb(30 41 59);
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name {
    font-weight: 500;
    color: white;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .details {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: rgb(148 163 184);
  }

  .connected-badge {
    padding: 0.125rem 0.375rem;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    border-radius: 9999px;
    background-color: rgb(34 197 94);
    color: white;
  }

  .capabilities {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .cap-badge {
    padding: 0.125rem 0.375rem;
    font-size: 0.625rem;
    border-radius: 0.25rem;
    background-color: rgb(30 41 59);
    color: rgb(148 163 184);
    text-transform: uppercase;
  }
</style>
