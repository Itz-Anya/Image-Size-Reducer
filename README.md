# Image Size Reducer

Free, open-source batch image compressor. Everything runs in your browser; images are never uploaded.

Repo: https://github.com/Itz-Anya/Image-Size-Reducer · License: MIT · Built by Murali and Anya

## Features
- Drag and drop or pick many images, add more while others process
- Presets (Balanced, High Compression, High Quality, Custom), quality slider, JPEG/PNG/WebP output, max-dimension resize
- Concurrency-limited queue (3 at a time) with per-image cancel, retry, remove
- Real sizes and savings from actual output blobs
- Per-image download and ZIP download (JSZip)
- Light/dark theme, saved settings (never image data)

## Develop
```bash
npm install
npm run dev
npm run check
npm run build
```
Put your logo at `static/logo.png`.

## Deploy to Vercel
Import the repo in Vercel. The SvelteKit preset and `@sveltejs/adapter-vercel` need no configuration or environment variables.

## Privacy
Compression uses `browser-image-compression` (Canvas + Web Worker) on your device. No image is sent anywhere, and nothing but theme and settings is stored in `localStorage`.

## Notes
- PNG output is lossless in browsers; the quality slider affects JPEG and WebP. Use WebP or a max dimension to shrink PNGs.
- AVIF encoding is not offered because browsers cannot encode it through Canvas reliably.
- Animated GIF/WebP are flattened to a single frame.

## Contributing
Issues and pull requests are welcome. Run `npm run check` before submitting.
