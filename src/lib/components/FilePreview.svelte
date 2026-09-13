<script lang="ts">
  import { onMount } from 'svelte';
  import { formatBytes } from '$lib/utils/streaming';

  export let file: File;

  let previewUrl: string | null = null;
  let previewType: 'image' | 'video' | 'text' | 'audio' | 'other' = 'other';
  let textContent: string | null = null;
  let loaded = false;

  onMount(() => {
    detectPreviewType();
  });

  function detectPreviewType() {
    if (file.type.startsWith('image/')) {
      previewType = 'image';
      loadImagePreview();
    } else if (file.type.startsWith('video/')) {
      previewType = 'video';
      loadVideoPreview();
    } else if (file.type.startsWith('audio/')) {
      previewType = 'audio';
    } else if (
      file.type.startsWith('text/') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.html') ||
      file.name.endsWith('.css')
    ) {
      previewType = 'text';
      loadTextPreview();
    } else {
      previewType = 'other';
      loaded = true;
    }
  }

  function loadImagePreview() {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewUrl = e.target?.result as string;
      loaded = true;
    };
    reader.readAsDataURL(file);
  }

  function loadVideoPreview() {
    const url = URL.createObjectURL(file);
    previewUrl = url;
    loaded = true;
  }

  function loadTextPreview() {
    const reader = new FileReader();
    reader.onload = (e) => {
      textContent = (e.target?.result as string).slice(0, 500);
      loaded = true;
    };
    reader.readAsText(file);
  }

  function getFileIcon(): string {
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc': case 'docx': return '📝';
      case 'xls': case 'xlsx': return '📊';
      case 'ppt': case 'pptx': return '📑';
      case 'zip': case 'rar': case '7z': return '📦';
      case 'mp3': case 'wav': case 'flac': return '🎵';
      case 'mp4': case 'avi': case 'mov': return '🎬';
      case 'js': case 'ts': case 'py': return '💻';
      default: return '📁';
    }
  }
</script>

<div class="preview-container">
  {#if !loaded}
    <div class="preview-loading">
      <div class="mini-spinner" />
    </div>
  {:else if previewType === 'image' && previewUrl}
    <img src={previewUrl} alt={file.name} class="preview-image" />
  {:else if previewType === 'video' && previewUrl}
    <video src={previewUrl} class="preview-video" preload="metadata" muted />
  {:else if previewType === 'text' && textContent}
    <pre class="preview-text">{textContent}</pre>
  {:else if previewType === 'audio'}
    <div class="preview-audio">
      <span class="audio-icon">🎵</span>
    </div>
  {:else}
    <div class="preview-icon">
      <span class="icon-emoji">{getFileIcon()}</span>
    </div>
  {/if}

  <div class="preview-info">
    <span class="preview-name" title={file.name}>{file.name}</span>
    <span class="preview-size">{formatBytes(file.size)}</span>
  </div>
</div>

<style>
  .preview-container {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0.75rem;
    background-color: rgb(30 41 59);
    border: 1px solid rgb(51 65 85);
  }

  .preview-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 8rem;
    background-color: rgb(15 23 42);
  }

  .mini-spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid rgb(75 85 99);
    border-top-color: rgb(14 165 233);
    border-radius: 9999px;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .preview-image {
    width: 100%;
    height: 10rem;
    object-fit: cover;
  }

  .preview-video {
    width: 100%;
    height: 10rem;
    object-fit: cover;
  }

  .preview-text {
    padding: 0.75rem;
    font-size: 0.625rem;
    font-family: monospace;
    color: rgb(203 213 225);
    background-color: rgb(15 23 42);
    height: 8rem;
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.4;
  }

  .preview-audio {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 8rem;
    background-color: rgb(15 23 42);
  }

  .audio-icon {
    font-size: 2.5rem;
  }

  .preview-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 8rem;
    background-color: rgb(15 23 42);
  }

  .icon-emoji {
    font-size: 2.5rem;
  }

  .preview-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 0.75rem;
  }

  .preview-name {
    font-size: 0.8125rem;
    font-weight: 500;
    color: white;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    margin-right: 0.5rem;
  }

  .preview-size {
    font-size: 0.75rem;
    color: rgb(148 163 184);
    white-space: nowrap;
  }
</style>
