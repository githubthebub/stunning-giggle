/*
 * scanner.js — camera control, frame capture, image preprocessing, and OCR.
 * Tesseract.js is loaded lazily from a CDN the first time a scan runs, so
 * the app boots instantly and search/dex work fully offline.
 */

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

let stream = null;
let facing = 'environment';
let workerPromise = null;
let progressCb = null;

export function currentFacing() {
  return facing;
}

export async function startCamera(video, requestedFacing = facing) {
  stopCamera(video);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera needs HTTPS (or localhost) and a browser with getUserMedia.');
  }
  facing = requestedFacing;
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(video) {
  if (stream) {
    for (const t of stream.getTracks()) t.stop();
    stream = null;
  }
  if (video) video.srcObject = null;
}

export async function flipCamera(video) {
  return startCamera(video, facing === 'environment' ? 'user' : 'environment');
}

/** True when the active camera has a controllable flash (phones, usually). */
export function torchSupported() {
  const track = stream && stream.getVideoTracks()[0];
  return !!(track && track.getCapabilities && track.getCapabilities().torch);
}

export async function setTorch(on) {
  const track = stream && stream.getVideoTracks()[0];
  if (!track) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: !!on }] });
    return true;
  } catch {
    return false;
  }
}

/** Grab the current video frame at full sensor resolution. */
export function captureFrame(video) {
  const c = document.createElement('canvas');
  c.width = video.videoWidth || 1280;
  c.height = video.videoHeight || 720;
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  return c;
}

/** Decode an uploaded/taken photo onto a canvas, downscaled if huge. */
export function fileToCanvas(file, maxDim = 1800) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}

/**
 * Crop a region out of a source canvas, upscale it to ~targetW wide, and
 * boost it for OCR: grayscale + a 5%–95% percentile contrast stretch, which
 * handles the glossy, dim, or holo-foil lighting cards tend to get shot in.
 */
export function preprocess(source, rect, targetW = 1200) {
  const sx = Math.max(0, Math.round(rect.x));
  const sy = Math.max(0, Math.round(rect.y));
  const sw = Math.max(1, Math.min(source.width - sx, Math.round(rect.w)));
  const sh = Math.max(1, Math.min(source.height - sy, Math.round(rect.h)));

  const scale = Math.min(3, Math.max(1, targetW / sw));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale);
  c.height = Math.round(sh * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height);

  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0;
    d[i] = lum; // stash luminance in the red channel for the second pass
    hist[lum]++;
  }
  const total = d.length / 4;
  const percentile = (q) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= total * q) return v;
    }
    return 255;
  };
  const lo = percentile(0.05);
  const hi = Math.max(lo + 1, percentile(0.95));
  for (let i = 0; i < d.length; i += 4) {
    let v = ((d[i] - lo) * 255) / (hi - lo);
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.crossOrigin = 'anonymous'; // CORS-readable so the service worker can cache it
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the OCR engine — check your connection.'));
    document.head.appendChild(s);
  });
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      if (!window.Tesseract) await loadScript(TESSERACT_CDN);
      const worker = await window.Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && progressCb) {
            progressCb(Math.round((m.progress || 0) * 100));
          }
        },
      });
      // Card names only ever use these characters; whitelisting cuts noise.
      await worker.setParameters({
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.-é ",
        preserve_interword_spaces: '1',
      });
      return worker;
    })();
    workerPromise.catch(() => { workerPromise = null; }); // allow retry after failure
  }
  return workerPromise;
}

/**
 * OCR a canvas. Returns words as [{ text, conf, y0 }] where y0 is the word's
 * top edge as a 0–1 fraction of the region height.
 */
export async function ocr(canvas, onProgress) {
  const worker = await getWorker();
  progressCb = onProgress || null;
  try {
    const { data } = await worker.recognize(canvas);
    let words = (data.words || [])
      .filter((w) => (w.confidence ?? 0) >= 35 && w.text && w.text.trim())
      .map((w) => ({
        text: w.text,
        conf: w.confidence,
        y0: w.bbox ? w.bbox.y0 / canvas.height : 0.5,
      }));
    if (!words.length && data.text) {
      words = data.text.split(/\s+/).filter(Boolean).map((t) => ({ text: t, conf: 50, y0: 0.5 }));
    }
    return words;
  } finally {
    progressCb = null;
  }
}
