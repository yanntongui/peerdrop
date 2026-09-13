<script lang="ts">
  import { page } from '$app/stores';
  import Toast from '$lib/components/Toast.svelte';
  import { validateShareLink, type ShareLink } from '$lib/utils/sharelink';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  $: linkId = $page.params.linkId;

  let link: ShareLink | null = null;
  let loading = true;
  let error: string | null = null;
  let password = '';
  let passwordRequired = false;
  let validating = false;

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
    await validateLink();
  });

  async function validateLink(pwd?: string) {
    validating = true;
    error = null;

    const result = await validateShareLink(linkId, pwd);

    if (result.valid && result.link) {
      link = result.link;
      passwordRequired = false;
      showToast('Link validated', 'success');
    } else {
      error = result.error || 'Invalid link';

      if (result.error === 'Password required') {
        passwordRequired = true;
        error = null;
      } else {
        showToast(error, 'error');
      }
    }

    loading = false;
    validating = false;
  }

  function handlePasswordSubmit() {
    validateLink(password);
  }

  function acceptTransfer() {
    if (!link) return;
    goto(`/receive/${link.roomId}`);
  }
</script>

<div class="container">
  <header class="header">
    <h1 class="logo">
      <span class="icon">🔗</span>
      PeerDrop
    </h1>
    <p class="tagline">Shared files</p>
  </header>

  <main class="main">
    {#if loading}
      <section class="status-section">
        <div class="spinner" />
        <p>Validating link...</p>
      </section>

    {:else if passwordRequired}
      <section class="form-section">
        <h2 class="step-title">🔒 Password Required</h2>
        <p class="description">This link is password protected.</p>
        <form on:submit|preventDefault={handlePasswordSubmit} class="password-form">
          <input
            type="password"
            bind:value={password}
            placeholder="Enter password"
            class="password-input"
          />
          <button type="submit" class="submit-btn" disabled={validating || !password}>
            {validating ? 'Validating...' : 'Continue'}
          </button>
        </form>
      </section>

    {:else if error}
      <section class="error-section">
        <div class="error-icon">❌</div>
        <h2 class="step-title">Invalid Link</h2>
        <p class="error-message">{error}</p>
        <a href="/" class="back-link">← Back to Home</a>
      </section>

    {:else if link}
      <section class="link-section">
        <div class="success-icon">📦</div>
        <h2 class="step-title">Files Ready</h2>
        <p class="description">
          {link.files.length} {link.files.length === 1 ? 'file' : 'files'} shared
        </p>

        <div class="file-list">
          {#each link.files as file}
            <div class="file-item">
              <span class="file-name">{file.name}</span>
              <span class="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          {/each}
        </div>

        <div class="link-meta">
          {#if link.expiresAt}
            <span class="meta-item">⏰ Expires: {new Date(link.expiresAt).toLocaleString()}</span>
          {/if}
          {#if link.maxDownloads > 0}
            <span class="meta-item">📥 {link.currentDownloads}/{link.maxDownloads} downloads</span>
          {/if}
        </div>

        <button class="accept-btn" on:click={acceptTransfer}>
          Accept & Receive Files
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

  .status-section,
  .form-section,
  .error-section,
  .link-section {
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

  .step-title {
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
  }

  .description {
    color: rgb(148 163 184);
    margin-bottom: 1rem;
  }

  .success-icon {
    font-size: 3.75rem;
    margin-bottom: 1rem;
  }

  .error-icon {
    font-size: 3.75rem;
    margin-bottom: 1rem;
  }

  .error-message {
    color: rgb(248 113 113);
  }

  .password-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 20rem;
  }

  .password-input {
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: white;
    background-color: rgb(15 23 42);
    border: 1px solid rgb(51 65 85);
  }

  .password-input:focus {
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

  .file-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
    background-color: rgba(51 65 85 / 0.5);
  }

  .file-name {
    font-size: 0.875rem;
    color: white;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    margin-right: 0.5rem;
  }

  .file-size {
    font-size: 0.75rem;
    color: rgb(148 163 184);
    white-space: nowrap;
  }

  .link-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .meta-item {
    font-size: 0.75rem;
    color: rgb(148 163 184);
  }

  .accept-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 600;
    color: white;
    background-color: rgb(34 197 94);
    transition: all 0.2s;
  }

  .accept-btn:hover {
    background-color: rgb(74 222 128);
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
