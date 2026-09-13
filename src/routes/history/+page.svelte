<script lang="ts">
  import {
    getTransferHistory,
    clearTransferHistory,
    formatDuration,
    formatSpeed,
    type TransferRecord,
  } from '$lib/utils/history';
  import { formatBytes } from '$lib/utils/streaming';
  import Toast from '$lib/components/Toast.svelte';
  import { onMount } from 'svelte';

  let history: TransferRecord[] = [];
  let filter: 'all' | 'sent' | 'received' = 'all';
  let searchQuery = '';

  // Toast
  let toastShow = false;
  let toastMessage = '';
  let toastType: 'info' | 'success' | 'warning' | 'error' = 'info';

  function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    toastMessage = message;
    toastType = type;
    toastShow = true;
  }

  onMount(() => {
    history = getTransferHistory();
  });

  $: filteredHistory = history
    .filter((r) => filter === 'all' || r.direction === filter)
    .filter(
      (r) =>
        !searchQuery ||
        r.peerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.files.some((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  function handleClear() {
    if (confirm('Clear all transfer history?')) {
      clearTransferHistory();
      history = [];
      showToast('History cleared', 'success');
    }
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<div class="container">
  <header class="header">
    <h1 class="title">Transfer History</h1>
    <p class="subtitle">{history.length} transfer{history.length !== 1 ? 's' : ''}</p>
  </header>

  <div class="toolbar">
    <div class="filters">
      <button class="filter-btn" class:active={filter === 'all'} on:click={() => (filter = 'all')}>
        All
      </button>
      <button class="filter-btn" class:active={filter === 'sent'} on:click={() => (filter = 'sent')}>
        Sent
      </button>
      <button
        class="filter-btn"
        class:active={filter === 'received'}
        on:click={() => (filter = 'received')}
      >
        Received
      </button>
    </div>

    <input
      type="text"
      class="search-input"
      placeholder="Search files or peers..."
      bind:value={searchQuery}
    />

    {#if history.length > 0}
      <button class="clear-btn" on:click={handleClear}>Clear</button>
    {/if}
  </div>

  {#if filteredHistory.length === 0}
    <div class="empty">
      <span class="empty-icon">📭</span>
      <p>{history.length === 0 ? 'No transfers yet' : 'No matches found'}</p>
    </div>
  {:else}
    <div class="list">
      {#each filteredHistory as record}
        <div class="record">
          <div class="record-header">
            <span class="record-icon">{record.direction === 'sent' ? '📤' : '📥'}</span>
            <div class="record-info">
              <span class="record-peer">{record.peerName}</span>
              <span class="record-date">{formatDate(record.startedAt)}</span>
            </div>
            <span class="record-status" class:failed={record.status === 'failed'}>
              {record.status}
            </span>
          </div>

          <div class="record-files">
            {#each record.files.slice(0, 3) as file}
              <span class="file-chip">{file.name}</span>
            {/each}
            {#if record.files.length > 3}
              <span class="file-chip more">+{record.files.length - 3} more</span>
            {/if}
          </div>

          <div class="record-meta">
            <span>{formatBytes(record.totalSize)}</span>
            <span>{formatDuration(record.duration)}</span>
            {#if record.speed > 0}
              <span>{formatSpeed(record.speed)}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
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
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
  }

  .subtitle {
    font-size: 0.875rem;
    color: rgb(148 163 184);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }

  .filters {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: 0.5rem;
    background-color: rgb(30 41 59);
  }

  .filter-btn {
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    color: rgb(148 163 184);
    transition: all 0.2s;
  }

  .filter-btn.active {
    color: white;
    background-color: rgb(51 65 85);
  }

  .search-input {
    flex: 1;
    min-width: 10rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    color: white;
    background-color: rgb(30 41 59);
    border: 1px solid rgb(51 65 85);
  }

  .search-input:focus {
    outline: none;
    border-color: rgb(14 165 233);
  }

  .clear-btn {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    color: rgb(248 113 113);
    background-color: rgba(127 29 29 / 0.2);
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background-color: rgba(127 29 29 / 0.4);
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem;
    color: rgb(148 163 184);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .record {
    padding: 1rem;
    border-radius: 0.75rem;
    background-color: rgba(30 41 59 / 0.5);
  }

  .record-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .record-icon {
    font-size: 1.25rem;
  }

  .record-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .record-peer {
    font-weight: 500;
    color: white;
    font-size: 0.875rem;
  }

  .record-date {
    font-size: 0.75rem;
    color: rgb(148 163 184);
  }

  .record-status {
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    background-color: rgb(22 101 52);
    color: rgb(134 239 172);
  }

  .record-status.failed {
    background-color: rgb(127 29 29);
    color: rgb(252 165 165);
  }

  .record-files {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .file-chip {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.6875rem;
    color: rgb(203 213 225);
    background-color: rgb(51 65 85);
    max-width: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-chip.more {
    color: rgb(14 165 233);
  }

  .record-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: rgb(148 163 184);
  }
</style>
