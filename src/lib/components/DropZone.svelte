<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    files: File[];
  }>();

  let isDragging = false;
  let fileInput: HTMLInputElement;

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;

    if (e.dataTransfer?.files) {
      dispatch('files', Array.from(e.dataTransfer.files));
    }
  }

  function handleClick() {
    fileInput?.click();
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      dispatch('files', Array.from(input.files));
      input.value = '';
    }
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<div
  class="drop-zone"
  class:dragging={isDragging}
  class:disabled
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
  on:click={handleClick}
  on:keydown={handleClick}
  role="button"
  tabindex="0"
>
  <input
    bind:this={fileInput}
    type="file"
    multiple
    on:change={handleFileChange}
    class="hidden"
  />

  <div class="icon">
    {#if isDragging}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-12 w-12"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    {:else}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-12 w-12"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    {/if}
  </div>

  <div class="text">
    {#if isDragging}
      <p class="text-lg font-semibold">Release to add files</p>
    {:else}
      <p class="text-lg font-semibold">Drag & drop files here</p>
      <p class="text-sm opacity-70">or click to browse</p>
    {/if}
  </div>
</div>

<style>
  .drop-zone {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    border-radius: 1rem;
    border: 2px dashed;
    min-height: 200px;
    cursor: pointer;
    transition: all 0.2s;
    border-color: rgb(71 85 105);
    background-color: rgba(30 41 59 / 0.5);
  }

  .drop-zone:hover {
    border-color: rgb(14 165 233);
    background-color: rgb(30 41 59);
  }

  .drop-zone.dragging {
    border-color: rgb(56 189 248);
    background-color: rgba(12 74 110 / 0.2);
    transform: scale(1.02);
  }

  .drop-zone.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    margin-bottom: 1rem;
    color: rgb(148 163 184);
  }

  .drop-zone.dragging .icon {
    color: rgb(56 189 248);
  }

  .text {
    text-align: center;
    color: rgb(203 213 225);
  }

  .hidden {
    display: none;
  }
</style>
