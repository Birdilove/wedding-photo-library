import { limits } from '../config/wedding';
/** Fit within max on the longest side, keep aspect ratio, never upscale. */
export function fitWithin(w: number, h: number, max = limits.maxDimension) {
  const s = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
}
export class UnsupportedImageError extends Error {}
export function isImageFile(f: File) { return f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name); }

async function toJpeg(src: CanvasImageSource, sw: number, sh: number, name: string): Promise<{ file: File; width: number; height: number }> {
  const { width, height } = fitWithin(sw, sh);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(src, 0, 0, width, height);
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', limits.jpegQuality));
  canvas.width = canvas.height = 0; // release pixel memory
  if (!blob) throw new Error('JPEG encoding failed');
  return { file: new File([blob], name, { type: 'image/jpeg' }), width, height };
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
