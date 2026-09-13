<script lang="ts">
  import { onMount } from 'svelte';
  import Toast from '$lib/components/Toast.svelte';
  import {
    createCloneSession,
    getCloneSession,
    updateCategorySelection,
    toggleAllCategories,
    startCloneTransfer,
    completeCloneTransfer,
    clearCloneSession,
    type CloneSession,
  } from '$lib/utils/clone';
  import { formatBytes } from '$lib/utils/streaming';

  let session: CloneSession | null = null;
  let step: 'welcome' | 'select' | 'transfer' | 'complete' = 'welcome';
  let sourceDevice = '';
  let targetDevice = '';

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
    const existing = getCloneSession();
    if (existing) {
      session = existing;
      if (existing.status === 'selecting') step = 'select';
      else if (existing.status === 'transferring') step = 'transfer';
      else if (existing.status === 'completed') step = 'complete';
    }
  });

  function startSession() {
    if (!sourceDevice.trim() || !targetDevice.trim()) {
      showToast('Please enter both device names', 'warning');
      return;
    }

    session = createCloneSession(sourceDevice, targetDevice);
    step = 'select';
    showToast('Clone session created', 'success');
  }

  function handleToggleCategory(categoryId: string) {
    if (!session) return;
    const category = session.categories.find((c) => c.id === categoryId);
    if (category) {
      updateCategorySelection(session.id, categoryId, !category.selected);
      session = getCloneSession();
    }
  }

  function handleToggleAll() {
    if (!session) return;
    const allSelected = session.categories.every((c) => c.selected);
    toggleAllCategories(session.id, !allSelected);
    session = getCloneSession();
  }

  function startTransfer() {
    if (!session) return;

    const selectedCount = session.categories.filter((c) => c.selected).length;
    if (selectedCount === 0) {
      showToast('Please select at least one category', 'warning');
      return;
    }

    startCloneTransfer(session.id);
    session = getCloneSession();
    step = 'transfer';
    showToast('Transfer started', 'info');

    // Simulate transfer completion for demo
    simulateTransfer();
  }

  async function simulateTransfer() {
    if (!session) return;

    // Simulate progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 100));
      if (session) {
        session.transferredSize = (session.totalSize * i) / 100;
        session = { ...session };
      }
    }

    completeCloneTransfer(session.id);
    session = getCloneSession();
    step = 'complete';
    showToast('Migration complete!', 'success');
  }

  function resetSession() {
    clearCloneSession();
    session = null;
    step = 'welcome';
    sourceDevice = '';
    targetDevice = '';
  }

  $: selectedCategories = session?.categories.filter((c) => c.selected) || [];
  $: selectedCount = selectedCategories.length;
  $: totalSelectedSize = selectedCategories.reduce((sum, c) => sum + c.estimatedSize, 0);
  $: allSelected = session ? session.categories.every((c) => c.selected) : false;
</script>

<div class="container">
  <header class="header">
    <h1 class="logo">
      <span class="icon">📱</span>
      Phone Clone
    </h1>
    <p class="tagline">Transfer everything from your old device to your new one</p>
  </header>

  <main class="main">
    {#if step === 'welcome'}
      <section class="welcome-section">
        <div class="welcome-icon">🔄</div>
        <h2 class="section-title">Ready to migrate?</h2>
        <p class="section-desc">
          Phone Clone will transfer your contacts, photos, messages, and more
          from your old device to your new one.
        </p>

        <div class="device-inputs">
          <div class="input-group">
            <label class="input-label" for="source">Old device name</label>
            <input
              id="source"
              type="text"
              class="input-field"
              placeholder="e.g., iPhone 13"
              bind:value={sourceDevice}
            />
          </div>
          <div class="input-group">
            <label class="input-label" for="target">New device name</label>
            <input
              id="target"
              type="text"
              class="input-field"
              placeholder="e.g., iPhone 15"
              bind:value={targetDevice}
            />
          </div>
        </div>

        <button class="primary-btn" on:click={startSession}>
          Start Migration
        </button>
      </section>

    {:else if step === 'select'}
      <section class="select-section">
        <div class="section-header">
          <h2 class="section-title">Select what to transfer</h2>
          <button class="toggle-all-btn" on:click={handleToggleAll}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div class="device-labels">
          <span class="device-label">📤 {sourceDevice}</span>
          <span class="arrow">→</span>
          <span class="device-label">📥 {targetDevice}</span>
        </div>

        <div class="categories">
          {#each session?.categories || [] as category}
            <button
              class="category-item"
              class:selected={category.selected}
              on:click={() => handleToggleCategory(category.id)}
            >
              <div class="category-checkbox">
                {#if category.selected}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                {/if}
              </div>
              <span class="category-icon">{category.icon}</span>
              <div class="category-info">
                <span class="category-name">{category.name}</span>
                <span class="category-desc">{category.description}</span>
              </div>
              <div class="category-meta">
                <span class="category-size">{formatBytes(category.estimatedSize)}</span>
                <span class="category-count">{category.itemCount} items</span>
              </div>
            </button>
          {/each}
        </div>

        <div class="summary">
          <p class="summary-text">
            {selectedCount} categor{selectedCount === 1 ? 'y' : 'ies'} selected
            · {formatBytes(totalSelectedSize)}
          </p>
        </div>

        <button class="primary-btn" on:click={startTransfer}>
          Start Transfer
        </button>
      </section>

    {:else if step === 'transfer'}
      <section class="transfer-section">
        <div class="spinner" />
        <h2 class="section-title">Transferring...</h2>

        <div class="progress-info">
          <p class="progress-text">
            {formatBytes(session?.transferredSize || 0)} / {formatBytes(session?.totalSize || 0)}
          </p>
          <div class="progress-bar">
            <div
              class="progress-fill"
              style="width: {session ? (session.transferredSize / session.totalSize) * 100 : 0}%"
            />
          </div>
        </div>

        <div class="device-labels">
          <span class="device-label">📤 {sourceDevice}</span>
          <span class="arrow">→</span>
          <span class="device-label">📥 {targetDevice}</span>
        </div>

        <div class="transfer-categories">
          {#each selectedCategories as category}
            <div class="transfer-category">
              <span class="category-icon">{category.icon}</span>
              <span class="category-name">{category.name}</span>
            </div>
          {/each}
        </div>
      </section>

    {:else if step === 'complete'}
      <section class="complete-section">
        <div class="success-icon">✅</div>
        <h2 class="section-title">Migration complete!</h2>
        <p class="section-desc">
          Successfully transferred {selectedCount} categor{selectedCount === 1 ? 'y' : 'ies'}
          from {sourceDevice} to {targetDevice}
        </p>

        <div class="device-labels">
          <span class="device-label">📤 {sourceDevice}</span>
          <span class="arrow">✓</span>
          <span class="device-label">📥 {targetDevice}</span>
        </div>

        <button class="secondary-btn" on:click={resetSession}>
          Start New Migration
        </button>
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

  .welcome-section,
  .select-section,
  .transfer-section,
  .complete-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    border-radius: 0.75rem;
    background-color: rgba(30 41 59 / 0.5);
  }

  .welcome-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.5rem;
  }

  .section-desc {
    color: rgb(148 163 184);
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .toggle-all-btn {
    font-size: 0.8125rem;
    color: rgb(14 165 233);
  }

  .toggle-all-btn:hover {
    color: rgb(56 189 248);
  }

  .device-inputs {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 24rem;
    margin-bottom: 1.5rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .input-label {
    font-size: 0.8125rem;
    color: rgb(148 163 184);
  }

  .input-field {
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: white;
    background-color: rgb(15 23 42);
    border: 1px solid rgb(51 65 85);
  }

  .input-field:focus {
    outline: none;
    border-color: rgb(14 165 233);
  }

  .device-labels {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .device-label {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    background-color: rgb(51 65 85);
  }

  .arrow {
    font-size: 1.25rem;
    color: rgb(148 163 184);
  }

  .categories {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    margin-bottom: 1rem;
  }

  .category-item {
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

  .category-item:hover {
    background-color: rgb(51 65 85);
  }

  .category-item.selected {
    outline: 2px solid rgb(14 165 233);
    background-color: rgba(14 165 233 / 0.1);
  }

  .category-checkbox {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    border: 2px solid rgb(100 116 139);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .category-item.selected .category-checkbox {
    background-color: rgb(14 165 233);
    border-color: rgb(14 165 233);
  }

  .category-checkbox svg {
    width: 0.875rem;
    height: 0.875rem;
    color: white;
  }

  .category-icon {
    font-size: 1.5rem;
  }

  .category-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .category-name {
    font-weight: 500;
    color: white;
    font-size: 0.9375rem;
  }

  .category-desc {
    font-size: 0.75rem;
    color: rgb(148 163 184);
  }

  .category-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.75rem;
    color: rgb(148 163 184);
  }

  .summary {
    padding: 0.75rem;
    border-radius: 0.5rem;
    background-color: rgba(14 165 233 / 0.1);
    margin-bottom: 1rem;
    width: 100%;
    text-align: center;
  }

  .summary-text {
    font-size: 0.875rem;
    color: rgb(56 189 248);
  }

  .primary-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 600;
    color: white;
    background-color: rgb(14 165 233);
    transition: all 0.2s;
    min-width: 12rem;
  }

  .primary-btn:hover {
    background-color: rgb(56 189 248);
  }

  .secondary-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 600;
    color: rgb(14 165 233);
    background-color: transparent;
    border: 2px solid rgb(14 165 233);
    transition: all 0.2s;
    min-width: 12rem;
  }

  .secondary-btn:hover {
    background-color: rgba(14 165 233 / 0.1);
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

  .progress-info {
    width: 100%;
    max-width: 24rem;
    margin-bottom: 1.5rem;
  }

  .progress-text {
    font-size: 0.875rem;
    color: rgb(148 163 184);
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .progress-bar {
    height: 0.5rem;
    border-radius: 9999px;
    background-color: rgb(51 65 85);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 9999px;
    background-color: rgb(14 165 233);
    transition: width 0.3s;
  }

  .transfer-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .transfer-category {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: rgb(203 213 225);
    background-color: rgb(51 65 85);
  }
</style>
