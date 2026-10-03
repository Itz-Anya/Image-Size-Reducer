import { browser } from '$app/environment';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { outputName, saveBlob } from './utils';

export type Status = 'waiting' | 'processing' | 'done' | 'failed' | 'cancelled';
export type Preset = 'balanced' | 'small' | 'quality' | 'custom';
export type Format = 'original' | 'image/jpeg' | 'image/png' | 'image/webp';

export interface Item {
  id: string;
  file: File;
  url: string;
  status: Status;
  ow?: number;
  oh?: number;
  w?: number;
  h?: number;
  out?: Blob;
  outUrl?: string;
  error?: string;
}
export interface Settings { preset: Preset; quality: number; format: Format; maxDim: number }

export const PRESETS: Record<Exclude<Preset, 'custom'>, Omit<Settings, 'preset'>> = {
  balanced: { quality: 0.75, format: 'original', maxDim: 0 },
  small: { quality: 0.5, format: 'image/webp', maxDim: 2048 },
  quality: { quality: 0.9, format: 'original', maxDim: 0 }
};
const DEFAULTS: Settings = { preset: 'balanced', ...PRESETS.balanced };
const LIMIT = 3;
const MAX_PIXELS = 268_000_000;

class ImageQueue {
  items = $state<Item[]>([]);
  settings = $state<Settings>({ ...DEFAULTS });
  active = $state(false);
  zipping = $state(false);
  private controllers = new Map<string, AbortController>();
  private running = 0;

  done = $derived(this.items.filter((i) => i.status === 'done'));
  count = (s: Status) => this.items.filter((i) => i.status === s).length;
  originalDone = $derived(this.done.reduce((n, i) => n + i.file.size, 0));
  outputDone = $derived(this.done.reduce((n, i) => n + (i.out?.size ?? 0), 0));

  load() {
    if (!browser) return;
    try {
      const s = JSON.parse(localStorage.getItem('isr:settings') ?? 'null');
      if (s) Object.assign(this.settings, s);
    } catch { /* ignore corrupt preferences */ }
  }
  save() {
    if (browser) localStorage.setItem('isr:settings', JSON.stringify(this.settings));
  }
  applyPreset(p: Preset) {
    this.settings.preset = p;
    if (p !== 'custom') Object.assign(this.settings, PRESETS[p]);
  }
  reset() { this.settings = { ...DEFAULTS }; }

  add(files: Iterable<File>): string[] {
    const rejected: string[] = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) { rejected.push(`${f.name}: not an image`); continue; }
      if (this.items.some((i) => i.file.name === f.name && i.file.size === f.size && i.file.lastModified === f.lastModified)) {
        rejected.push(`${f.name}: already added`); continue;
      }
      this.items.push({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f), status: 'waiting' });
    }
    if (this.items.length) this.active = true;
    this.pump();
    return rejected;
  }

  start() { this.active = true; this.pump(); }

  cancelAll() {
    this.active = false;
    for (const i of this.items) {
      if (i.status === 'waiting') i.status = 'cancelled';
      if (i.status === 'processing') this.controllers.get(i.id)?.abort();
    }
  }

  retry(id: string) {
    const i = this.items.find((x) => x.id === id);
    if (!i || i.status === 'processing') return;
    this.release(i);
    i.status = 'waiting';
    i.error = undefined;
    this.active = true;
    this.pump();
  }

  recompressAll() {
    for (const i of this.items) if (i.status !== 'processing') { this.release(i); i.status = 'waiting'; }
    this.start();
  }

  remove(id: string) {
    const i = this.items.find((x) => x.id === id);
    if (!i) return;
    this.controllers.get(id)?.abort();
    this.release(i);
    URL.revokeObjectURL(i.url);
    this.items = this.items.filter((x) => x.id !== id);
  }

  clear() {
    this.cancelAll();
    for (const i of this.items) { this.release(i); URL.revokeObjectURL(i.url); }
    this.items = [];
  }

  async zip(ids?: Set<string>) {
    const list = this.done.filter((i) => !ids || ids.has(i.id));
    if (!list.length || this.zipping) return;
    this.zipping = true;
    try {
      const z = new JSZip();
      const used = new Set<string>();
      for (const i of list) {
        let name = outputName(i.file.name, i.out!.type);
        for (let n = 2; used.has(name); n++) name = outputName(i.file.name, i.out!.type).replace(/(\.\w+)$/, `-${n}$1`);
        used.add(name);
        z.file(name, i.out!);
      }
      const blob = await z.generateAsync({ type: 'blob', compression: 'STORE' });
      saveBlob(blob, `image-size-reducer-${new Date().toISOString().slice(0, 10)}.zip`);
    } finally {
      this.zipping = false;
    }
  }

  download(id: string) {
    const i = this.items.find((x) => x.id === id);
    if (i?.out) saveBlob(i.out, outputName(i.file.name, i.out.type));
  }

  private release(i: Item) {
    if (i.outUrl) URL.revokeObjectURL(i.outUrl);
    i.out = i.outUrl = undefined;
    i.w = i.h = undefined;
  }

  private pump() {
    while (this.active && this.running < LIMIT) {
      const next = this.items.find((i) => i.status === 'waiting');
      if (!next) break;
      void this.run(next);
    }
  }

  private async run(item: Item) {
    const id = item.id;
    const ctrl = new AbortController();
    this.controllers.set(id, ctrl);
    this.running++;
    item.status = 'processing';
    const alive = () => this.items.find((i) => i.id === id);
    try {
      const src = await createImageBitmap(item.file);
      item.ow = src.width; item.oh = src.height;
      src.close();
      if (item.ow * item.oh > MAX_PIXELS) throw new Error('Image is too large for this browser to process.');
      const s = this.settings;
      const out = await imageCompression(item.file, {
        initialQuality: s.quality,
        maxWidthOrHeight: s.maxDim || undefined,
        alwaysKeepResolution: !s.maxDim,
        fileType: s.format === 'original' ? undefined : s.format,
        useWebWorker: true,
        signal: ctrl.signal
      });
      const bmp = await createImageBitmap(out);
      const w = bmp.width, h = bmp.height;
      bmp.close();
      const target = alive();
      if (!target || ctrl.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      target.out = out; target.outUrl = URL.createObjectURL(out);
      target.w = w; target.h = h; target.status = 'done';
    } catch (e) {
      const target = alive();
      if (target) {
        if (ctrl.signal.aborted) target.status = 'cancelled';
        else { target.status = 'failed'; target.error = e instanceof Error && e.message ? e.message : 'Unsupported or corrupt image.'; }
      }
    } finally {
      this.controllers.delete(id);
      this.running--;
      this.pump();
    }
  }
}

export const queue = new ImageQueue();
