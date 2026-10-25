import { limits } from '../config/wedding';
/** Fit within a total pixel budget (4 MP by default), keep aspect ratio, never upscale. */
export function fitWithin(w: number, h: number, maxPixels = limits.maxPixels) {
  const s = Math.min(1, Math.sqrt(maxPixels / (w * h)));
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
}
export class UnsupportedImageError extends Error {}
export function isImageFile(f: File) { return f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name); }

const MAX_BYTES = 3.8 * 1024 * 1024; // server accepts 4 MB; keep headroom
/** Encode as JPEG, lowering quality and then size until the file fits under MAX_BYTES. */
type Crop = { x: number; y: number; w: number; h: number };
/** Centre region of a w x h frame that stays visible at the given digital zoom (1 = whole frame). */
export function centerCrop(w: number, h: number, zoom: number): Crop {
  const z = Math.max(1, zoom); const cw = Math.max(1, Math.round(w / z)); const ch = Math.max(1, Math.round(h / z));
  return { x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: cw, h: ch };
}
async function toJpeg(src: CanvasImageSource, sw: number, sh: number, name: string, crop?: Crop): Promise<{ file: File; width: number; height: number }> {
  let { width, height } = fitWithin(sw, sh);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
  const encode = (q: number) => new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', q));
  try {
    for (;;) {
      canvas.width = width; canvas.height = height;
      if (crop) ctx.drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, width, height); else ctx.drawImage(src, 0, 0, width, height);
      let q = limits.jpegQuality; let blob = await encode(q);
      while (blob && blob.size > MAX_BYTES && q > 0.55) { q -= 0.1; blob = await encode(q); }
      if (!blob) throw new Error('JPEG encoding failed');
      if (blob.size <= MAX_BYTES || Math.max(width, height) < 1000) return { file: new File([blob], name, { type: 'image/jpeg' }), width, height };
      width = Math.round(width * 0.85); height = Math.round(height * 0.85);
    }
  } finally { canvas.width = canvas.height = 0; } // release pixel memory
}
/** zoom > 1 = digital zoom: keep only the centre of the frame, matching the zoomed preview. */
export function processVideoFrame(v: HTMLVideoElement, zoom = 1) {
  const name = `camera-${Date.now()}.jpg`;
  if (zoom <= 1) return toJpeg(v, v.videoWidth, v.videoHeight, name);
  const c = centerCrop(v.videoWidth, v.videoHeight, zoom);
  return toJpeg(v, c.w, c.h, name, c);
}

export async function processImageFile(f: File) {
  if (!isImageFile(f)) throw new UnsupportedImageError('This is not a photo.');
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }); }
  catch { throw new UnsupportedImageError(/hei[cf]/i.test(f.type + f.name)
    ? 'This browser cannot read HEIC photos. Try Safari, or share as JPEG.' : 'This photo could not be read (unsupported or damaged).'); }
  try { return await toJpeg(bmp, bmp.width, bmp.height, f.name.replace(/\.[^.]+$/, '') + '.jpg'); }
  finally { bmp.close(); }
}
