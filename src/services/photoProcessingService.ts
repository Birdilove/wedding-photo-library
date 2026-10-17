import { limits } from '../config/wedding';
/** Fit within max on the longest side, keep aspect ratio, never upscale. */
export function fitWithin(w: number, h: number, max = limits.maxDimension) {
  const s = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
}
export class UnsupportedImageError extends Error {}
export function isImageFile(f: File) { return f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name); }

const MAX_BYTES = 3.8 * 1024 * 1024; // server accepts 4 MB; keep headroom
/** Encode as JPEG, lowering quality and then size until the file fits under MAX_BYTES. */
async function toJpeg(src: CanvasImageSource, sw: number, sh: number, name: string): Promise<{ file: File; width: number; height: number }> {
  let { width, height } = fitWithin(sw, sh);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
  const encode = (q: number) => new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', q));
  try {
    for (;;) {
      canvas.width = width; canvas.height = height; ctx.drawImage(src, 0, 0, width, height);
      let q = limits.jpegQuality; let blob = await encode(q);
      while (blob && blob.size > MAX_BYTES && q > 0.55) { q -= 0.1; blob = await encode(q); }
      if (!blob) throw new Error('JPEG encoding failed');
      if (blob.size <= MAX_BYTES || Math.max(width, height) < 1000) return { file: new File([blob], name, { type: 'image/jpeg' }), width, height };
      width = Math.round(width * 0.85); height = Math.round(height * 0.85);
    }
  } finally { canvas.width = canvas.height = 0; } // release pixel memory
}
export const processVideoFrame = (v: HTMLVideoElement) =>
  toJpeg(v, v.videoWidth, v.videoHeight, `camera-${Date.now()}.jpg`);

export async function processImageFile(f: File) {
  if (!isImageFile(f)) throw new UnsupportedImageError('This is not a photo.');
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }); }
  catch { throw new UnsupportedImageError(/hei[cf]/i.test(f.type + f.name)
    ? 'This browser cannot read HEIC photos. Try Safari, or share as JPEG.' : 'This photo could not be read (unsupported or damaged).'); }
  try { return await toJpeg(bmp, bmp.width, bmp.height, f.name.replace(/\.[^.]+$/, '') + '.jpg'); }
  finally { bmp.close(); }
}
