<script lang="ts">
  import { onMount } from 'svelte';
  import { queue, type Item, type Preset } from '$lib/queue.svelte';
  import { formatBytes, reduction } from '$lib/utils';
  import { Plus, ImagePlus, Download, Trash2, RotateCw, X, ShieldCheck, Layers, Lock, SlidersHorizontal, FileImage, Scale, Archive, Loader, Search } from 'lucide-svelte';

  const REPO = 'https://github.com/Itz-Anya/Image-Size-Reducer';
  const presets: [Preset, string, string][] = [
    ['balanced', 'Balanced', '75% quality, original format'],
    ['small', 'High compression', '50% quality, WebP, max 2048 px'],
    ['quality', 'High quality', '90% quality, original format'],
    ['custom', 'Custom', 'Your own values']
  ];
  const labels = { waiting: 'Waiting', processing: 'Processing', done: 'Done', failed: 'Failed', cancelled: 'Cancelled' } as const;

  let input: HTMLInputElement;
  let over = $state(false);
  let ready = $state(false);
  let notes = $state<string[]>([]);
  let search = $state('');
  let sort = $state('added');
  let filter = $state('all');
  let confirmClear = $state(false);

  onMount(() => { queue.load(); ready = true; });
  $effect(() => { JSON.stringify(queue.settings); if (ready) queue.save(); });

  function addFiles(files: Iterable<File>) { notes = queue.add(files); }
  function onDrop(e: DragEvent) { e.preventDefault(); over = false; if (e.dataTransfer) addFiles(e.dataTransfer.files); }
  function onPick() { if (input.files) addFiles(input.files); input.value = ''; }

  const pct = (i: Item) => (i.out ? reduction(i.file.size, i.out.size) : 0);
  const visible = $derived.by(() => {
    const q = search.trim().toLowerCase();
    const list = queue.items.filter((i) => (!q || i.file.name.toLowerCase().includes(q)) && (filter === 'all' || i.status === filter));
    const by: Record<string, (a: Item, b: Item) => number> = {
      name: (a, b) => a.file.name.localeCompare(b.file.name),
      original: (a, b) => b.file.size - a.file.size,
      compressed: (a, b) => (b.out?.size ?? -1) - (a.out?.size ?? -1),
      reduction: (a, b) => pct(b) - pct(a)
    };
    return by[sort] ? [...list].sort(by[sort]) : list;
  });
  const total = $derived(queue.items.length);
  const finished = $derived(queue.items.filter((i) => i.status !== 'waiting' && i.status !== 'processing').length);
  const working = $derived(finished < total);
  const saved = $derived(queue.originalDone - queue.outputDone);
  const clearAll = () => (total > 10 ? (confirmClear = true) : queue.clear());

  const features = [
    [Layers, 'Batch compression', 'Drop in a whole folder. A queue works through them three at a time.'],
    [Lock, 'Local processing', 'Everything happens in your browser. Nothing is uploaded.'],
    [SlidersHorizontal, 'Quality control', 'Presets, a quality slider, output format and a size cap.'],
    [FileImage, 'Multiple formats', 'Read what your browser can decode; export JPEG, PNG or WebP.'],
    [Scale, 'Real savings', 'Every number is measured from the actual output file.'],
    [Archive, 'Bulk downloads', 'Grab one image, or everything in a single ZIP.']
  ] as const;
</script>

<div class="mx-auto max-w-6xl px-4">
  <section class="pt-12 pb-8 text-center sm:pt-16">
    <h1 class="font-display mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Reduce image size. Keep the quality.</h1>
    <p class="mx-auto mt-4 max-w-xl text-base text-mute text-balance">Compress multiple images directly in your browser. Fast, private, and completely free. No uploads, no limits on batch size.</p>
    <p class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-ok shadow-soft"><ShieldCheck size={15} /> 100% local processing · No server uploads</p>
  </section>

  <div class="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <section
      aria-label="Images"
      class="relative min-w-0 rounded-3xl border bg-surface shadow-soft transition-colors {over ? 'border-accent' : 'border-line'}"
      ondragover={(e) => { e.preventDefault(); over = true; }}
      ondragleave={(e) => { if (e.currentTarget === e.target) over = false; }}
      ondrop={onDrop}
    >
      <input bind:this={input} type="file" accept="image/*" multiple class="hidden" onchange={onPick} />

      {#if !total}
        <button class="flex w-full flex-col items-center rounded-3xl px-6 py-16 text-center transition-colors hover:bg-sunken/50 sm:py-24" onclick={() => input.click()}>
          <span class="grid size-16 place-items-center rounded-2xl bg-sunken text-accent"><ImagePlus size={28} /></span>
          <span class="font-display mt-5 text-2xl font-semibold tracking-tight">Drop your images here</span>
          <span class="mt-1 text-sm text-mute">or browse files from your device</span>
          <span class="btn btn-primary mt-6 px-6">Browse images</span>
          <span class="mt-5 text-xs text-mute">JPEG, PNG, WebP and more · Select multiple · No account required</span>
        </button>
      {:else}
        <div class="flex flex-wrap items-center gap-2 p-4">
          <div class="relative min-w-40 flex-1">
            <Search size={15} class="absolute top-1/2 left-3.5 -translate-y-1/2 text-mute" />
            <input type="search" placeholder="Search" aria-label="Search by filename" class="field pl-9" bind:value={search} />
          </div>
          <select aria-label="Sort" class="field w-auto" bind:value={sort}>
            <option value="added">Recently added</option><option value="name">Filename</option><option value="original">Original size</option><option value="compressed">Compressed size</option><option value="reduction">Reduction</option>
          </select>
          <select aria-label="Filter by status" class="field w-auto" bind:value={filter}>
            <option value="all">All</option><option value="waiting">Waiting</option><option value="processing">Processing</option><option value="done">Done</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div class="px-4 pb-3">
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm" aria-live="polite">
            <p><span class="font-semibold">{queue.done.length}</span> <span class="text-mute">of {total} compressed</span>
              {#if queue.count('failed')}<span class="text-bad"> · {queue.count('failed')} failed</span>{/if}</p>
            {#if queue.done.length}
              <p class="tabular-nums text-mute">{formatBytes(queue.originalDone)} → {formatBytes(queue.outputDone)} · <span class="font-semibold text-ok">{saved >= 0 ? 'saved' : 'added'} {formatBytes(Math.abs(saved))} ({Math.abs(reduction(queue.originalDone, queue.outputDone)).toFixed(1)}%)</span></p>
            {/if}
          </div>
          {#if working}
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Batch progress" aria-valuemin="0" aria-valuemax={total} aria-valuenow={finished}>
              <div class="h-full rounded-full bg-accent transition-[width] duration-300" style="width:{(finished / total) * 100}%"></div>
            </div>
          {/if}
        </div>

        <ul class="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3">
          <li>
            <button class="flex aspect-[4/3] h-full w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line text-sm font-medium text-mute transition-colors hover:border-accent hover:text-accent" onclick={() => input.click()}>
              <Plus size={22} /> Add images
            </button>
          </li>
          {#each visible as i (i.id)}
            <li class="group overflow-hidden rounded-2xl border border-line bg-bg/40">
              <div class="relative aspect-[4/3] bg-sunken">
                <a href={i.outUrl ?? i.url} target="_blank" rel="noopener" aria-label="Preview {i.file.name}">
                  <img src={i.outUrl ?? i.url} alt="Preview of {i.file.name}" loading="lazy" class="size-full object-cover" />
                </a>
                {#if i.status === 'processing'}
                  <div class="pointer-events-none absolute inset-0 grid place-items-center bg-black/40"><Loader size={26} class="animate-spin text-white" /></div>
                {/if}
                <span class="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur {i.status === 'failed' ? '!bg-bad' : ''}">{labels[i.status]}</span>
                <button class="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80" aria-label="Remove {i.file.name}" onclick={() => queue.remove(i.id)}><X size={14} /></button>
                {#if i.status === 'done'}
                  <span class="absolute right-2 bottom-2 rounded-full bg-ok px-2 py-0.5 text-xs font-semibold text-white tabular-nums">{pct(i) >= 0 ? '−' : '+'}{Math.abs(pct(i)).toFixed(0)}%</span>
                {/if}
              </div>
              <div class="p-3">
                <p class="truncate text-sm font-medium" title={i.file.name}>{i.file.name}</p>
                {#if i.status === 'done' && i.out}
                  <p class="mt-0.5 text-xs text-mute tabular-nums">{formatBytes(i.file.size)} → <span class="font-medium text-ink">{formatBytes(i.out.size)}</span></p>
                  <p class="text-xs text-mute tabular-nums">{i.ow}×{i.oh}{#if i.w !== i.ow} → {i.w}×{i.h}{/if}</p>
                {:else if i.status === 'failed'}
                  <p class="mt-0.5 line-clamp-2 text-xs text-bad">{i.error}</p>
                {:else}
                  <p class="mt-0.5 text-xs text-mute tabular-nums">{formatBytes(i.file.size)}{#if i.ow} · {i.ow}×{i.oh}{/if}</p>
                {/if}
                {#if i.status === 'done' || i.status === 'failed' || i.status === 'cancelled'}
                  <div class="mt-2 flex gap-1.5">
                    {#if i.status === 'done'}<button class="btn !min-h-8 flex-1 !px-3 !text-xs" onclick={() => queue.download(i.id)}><Download size={13} /> Download</button>{/if}
                    <button class="btn !min-h-8 !px-3 !text-xs {i.status === 'done' ? '' : 'flex-1'}" aria-label={i.status === 'done' ? 'Recompress' : 'Retry'} onclick={() => queue.retry(i.id)}><RotateCw size={13} />{#if i.status !== 'done'} Retry{/if}</button>
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
        {#if !visible.length}<p class="pb-6 text-center text-sm text-mute">No images match this search or filter.</p>{/if}

        <div class="flex flex-wrap items-center gap-2 border-t border-line p-4">
          <button class="btn btn-primary" disabled={!queue.done.length || queue.zipping} onclick={() => queue.zip()}>
            {#if queue.zipping}<Loader size={15} class="animate-spin" />{:else}<Download size={15} />{/if} Download all (ZIP)
          </button>
          <button class="btn" onclick={() => queue.recompressAll()} disabled={working && queue.active}><RotateCw size={15} /> Recompress all</button>
          <button class="btn" disabled={!working} onclick={() => queue.cancelAll()}>Cancel queue</button>
          <button class="btn ml-auto" onclick={clearAll}><Trash2 size={15} /> Clear all</button>
        </div>
      {/if}

      {#if over}
        <div class="pointer-events-none absolute inset-0 grid place-items-center rounded-3xl bg-surface/90 font-display text-xl font-semibold text-accent">Drop to add images</div>
      {/if}
    </section>

    <aside class="rounded-3xl border border-line bg-surface p-5 shadow-soft lg:sticky lg:top-24" aria-label="Compression settings">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg font-semibold tracking-tight">Settings</h2>
        <button class="text-sm text-mute hover:text-ink" onclick={() => queue.reset()}>Reset</button>
      </div>
      <div class="mt-4 grid gap-1.5" role="group" aria-label="Compression mode">
        {#each presets as [key, label, desc]}
          <button class="rounded-xl border px-3 py-2 text-left transition-colors {queue.settings.preset === key ? 'border-accent bg-sunken' : 'border-transparent hover:bg-sunken/60'}" aria-pressed={queue.settings.preset === key} onclick={() => queue.applyPreset(key)}>
            <span class="block text-sm font-medium">{label}</span><span class="block text-xs text-mute">{desc}</span>
          </button>
        {/each}
      </div>
      <div class="mt-5">
        <label for="q" class="flex justify-between text-sm font-medium">Quality <span class="tabular-nums text-mute">{Math.round(queue.settings.quality * 100)}%</span></label>
        <input id="q" type="range" min="1" max="100" class="mt-2 w-full accent-[var(--color-accent)]" value={Math.round(queue.settings.quality * 100)} oninput={(e) => { queue.settings.quality = +e.currentTarget.value / 100; queue.settings.preset = 'custom'; }} />
      </div>
      <div class="mt-4">
        <label for="f" class="text-sm font-medium">Output format</label>
        <select id="f" class="field mt-1.5" bind:value={queue.settings.format} onchange={() => (queue.settings.preset = 'custom')}>
          <option value="original">Original format</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option>
        </select>
      </div>
      <div class="mt-4">
        <label for="m" class="text-sm font-medium">Longest side</label>
        <select id="m" class="field mt-1.5" bind:value={queue.settings.maxDim} onchange={() => (queue.settings.preset = 'custom')}>
          <option value={0}>Original size</option>
          {#each [3840, 2560, 2048, 1920, 1280, 800] as d}<option value={d}>{d} px max</option>{/each}
        </select>
      </div>
      <p class="mt-4 text-xs leading-relaxed text-mute">Quality applies to JPEG and WebP; PNG stays lossless, so pair it with a smaller size. Aspect ratio is kept. Animated images become one frame. Metadata is removed. Change settings, then choose Recompress all.</p>
      <p class="mt-3 text-xs text-mute">Your images never leave your device. All compression happens locally in your browser.</p>
      {#if notes.length}<ul class="mt-3 text-xs text-bad" role="alert">{#each notes as n}<li>{n}</li>{/each}</ul>{/if}
    </aside>
  </div>

  <section id="features" class="scroll-mt-24 pt-24">
    <h2 class="font-display text-2xl font-semibold tracking-tight">Built for real batches</h2>
    <div class="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {#each features as [Icon, title, text]}
        <div><span class="grid size-10 place-items-center rounded-xl bg-sunken text-accent"><Icon size={19} /></span><h3 class="font-display mt-3 font-semibold">{title}</h3><p class="mt-1 text-sm text-mute">{text}</p></div>
      {/each}
    </div>
  </section>

  <section id="about" class="scroll-mt-24 pt-24">
    <h2 class="font-display text-2xl font-semibold tracking-tight">About Image Size Reducer</h2>
    <p class="mt-3 max-w-2xl text-mute">Image Size Reducer is a free, open-source image compression tool built to make image optimization simple, fast, and accessible. It allows users to reduce image file sizes directly in their browsers while maintaining control over quality and output settings.</p>
    <p class="mt-3 max-w-2xl text-mute">Contributions are welcome on <a class="font-medium text-accent underline underline-offset-4" href={REPO} target="_blank" rel="noopener">GitHub</a>. Created with care by Murali and Anya.</p>
    <div id="privacy" class="mt-10 max-w-2xl scroll-mt-24">
      <h3 class="font-display font-semibold">Privacy</h3>
      <p class="mt-2 text-sm text-mute">Images are read and compressed on your device with the Canvas API in a Web Worker. They are never uploaded and their contents are not stored. Only your theme and compression settings are kept in your browser's local storage.</p>
    </div>
  </section>
</div>

{#if confirmClear}
  <div class="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ct">
    <div class="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-soft">
      <h2 id="ct" class="font-display text-lg font-semibold">Clear {total} images?</h2>
      <p class="mt-1 text-sm text-mute">Results you haven't downloaded will be lost.</p>
      <div class="mt-5 flex justify-end gap-2">
        <button class="btn" onclick={() => (confirmClear = false)}>Keep images</button>
        <button class="btn btn-primary" onclick={() => { queue.clear(); confirmClear = false; }}>Clear all</button>
      </div>
    </div>
  </div>
{/if}
