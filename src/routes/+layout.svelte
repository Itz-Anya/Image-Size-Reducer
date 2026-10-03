<script lang="ts">
  import '../app.css';
  import { browser } from '$app/environment';
  import { Github, Moon, Sun } from 'lucide-svelte';
  let { children } = $props();
  const REPO = 'https://github.com/Itz-Anya/Image-Size-Reducer';
  let dark = $state(browser && document.documentElement.classList.contains('dark'));
  function toggle() {
    dark = !dark;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('isr:theme', JSON.stringify(dark ? 'dark' : 'light'));
  }
</script>

<svelte:head>
  <title>Image Size Reducer - Free Online Image Compressor</title>
  <meta name="description" content="Compress multiple images for free directly in your browser. Reduce image file sizes, compare quality, and download optimized images securely without uploading files." />
  <meta property="og:title" content="Image Size Reducer - Free Online Image Compressor" />
  <meta property="og:description" content="Compress multiple images for free directly in your browser. Reduce image file sizes, compare quality, and download optimized images securely without uploading files." />
  <meta property="og:image" content="/logo.png" />
  <meta property="og:type" content="website" />
</svelte:head>

<header class="sticky top-0 z-20 border-b border-line/70 bg-bg/70 backdrop-blur-xl">
  <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
    <a href="/" class="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
      <img src="/logo.png" alt="" width="28" height="28" class="rounded-lg" />
      Image Size Reducer
    </a>
    <nav class="flex items-center gap-0.5 text-sm font-medium" aria-label="Main">
      <a href="/" class="hidden rounded-full px-3 py-2 text-mute hover:text-ink sm:block">Home</a>
      <a href="/#features" class="rounded-full px-3 py-2 text-mute hover:text-ink">Features</a>
      <a href="/#about" class="rounded-full px-3 py-2 text-mute hover:text-ink">About</a>
      <a href={REPO} target="_blank" rel="noopener" class="icon-btn" aria-label="GitHub repository"><Github size={18} /></a>
      <button class="icon-btn" onclick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
        {#if dark}<Sun size={18} />{:else}<Moon size={18} />{/if}
      </button>
    </nav>
  </div>
</header>

<main>{@render children()}</main>

<footer class="mt-24 border-t border-line/70">
  <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-mute sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-2.5">
      <img src="/logo.png" alt="" width="22" height="22" class="rounded-md" />
      <p><span class="font-display font-semibold text-ink">Image Size Reducer</span> · Free and open-source image compression.</p>
    </div>
    <nav class="flex flex-wrap gap-x-5 gap-y-1" aria-label="Footer">
      <a class="hover:text-ink" href="/#features">Features</a>
      <a class="hover:text-ink" href="/#about">About</a>
      <a class="hover:text-ink" href="/#privacy">Privacy</a>
      <a class="hover:text-ink" href="{REPO}/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>
    </nav>
  </div>
  <p class="mx-auto max-w-6xl px-4 pb-8 text-xs text-mute">© 2026 Image Size Reducer. Built by Murali and Anya.</p>
</footer>
