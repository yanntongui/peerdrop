<script lang="ts">
  import '../app.css';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  });
</script>

<nav class="navbar">
  <a href="/" class="brand">
    <span class="brand-icon">📁</span>
    <span class="brand-name">PeerDrop</span>
  </a>
  <div class="nav-actions">
    <ThemeToggle />
  </div>
</nav>

<slot />

<style>
  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid rgba(51 65 85 / 0.5);
    background-color: rgba(15 23 42 / 0.8);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: white;
  }

  .brand-icon {
    font-size: 1.5rem;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 700;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
