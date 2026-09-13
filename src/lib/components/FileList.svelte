<script lang="ts">
  import { formatBytes } from '$lib/utils/streaming';

  export let files: File[] = [];
  export let showRemove: boolean = true;

  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    remove: number;
    clear: void;
  }>();

  function handleRemove(index: number) {
    dispatch('remove', index);
  }

  function handleClear() {
    dispatch('clear');
  }

  function getFileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    if (type.includes('text') || type.includes('json')) return '📝';
    return '📁';
  }

  $: totalSize = files.reduce((sum, f) => sum + f.size, 0);
</script>

{#if files.length > 0}
  <div class="file-list">
    <div class="header">
      <h3 class="title">
        {files.length} {files.length === 1 ? 'file' : 'files'}
      </h3>
      <div class="actions">
        <span class="total-size">{formatBytes(totalSize)}</span>
        {#if showRemove}
          <button class="clear-btn" on:click={handleClear}> Clear all </button>
        {/if}
      </div>
    </div>

    <ul class="files">
      {#each files as file, index}
        <li class="file-item">
          <span class="icon">{getFileIcon(file.type)}</span>
          <div class="info">
            <span class="name">{file.name}</span>
            <span class="size">{formatBytes(file.size)}</span>
          </div>
          {#if showRemove}
            <button
              class="remove-btn"
              on:click={() => handleRemove(index)}
              aria-label="Remove {file.name}"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .file-list {
    width: 100%;
    padding: 1rem;
    border-radius: 0.75rem;
    background-color: rgba(30 41 59 / 0.5);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .title {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(203 213 225);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .total-size {
    font-size: 0.875rem;
    color: rgb(148 163 184);
  }

  .clear-btn {
    font-size: 0.875rem;
    color: rgb(56 189 248);
  }

  .clear-btn:hover {
    color: rgb(125 211 252);
  }

  .files {
    max-height: 15rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background-color: rgba(51 65 85 / 0.5);
  }

  .icon {
    font-size: 1.25rem;
  }

  .info {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  .name {
    font-size: 0.875rem;
    color: rgb(226 232 240);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .size {
    font-size: 0.75rem;
    color: rgb(148 163 184);
  }

  .remove-btn {
    padding: 0.25rem;
    border-radius: 0.25rem;
    color: rgb(148 163 184);
  }

  .remove-btn:hover {
    background-color: rgb(75 85 99);
    color: rgb(226 232 240);
  }
</style>
