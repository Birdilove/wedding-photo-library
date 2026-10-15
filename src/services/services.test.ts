import { describe, it, expect } from 'vitest';
import { fitWithin } from './photoProcessingService';
import { UploadQueue } from './uploadQueue';
describe('fitWithin', () => {
  it('downsizes landscape, keeps ratio', () => expect(fitWithin(6528, 4896)).toEqual({ width: 3264, height: 2448 }));
  it('downsizes portrait', () => expect(fitWithin(3000, 6000, 3264)).toEqual({ width: 1632, height: 3264 }));
  it('never upscales', () => expect(fitWithin(1280, 720)).toEqual({ width: 1280, height: 720 }));
});
describe('UploadQueue', () => {
  it('caps concurrency at 2 and finishes all', async () => {
    const q = new UploadQueue(2);
    const out = await Promise.all(Array.from({ length: 6 }, (_, i) => q.add(async () => { await new Promise(r => setTimeout(r, 10)); return i; })));
    expect(out).toEqual([0, 1, 2, 3, 4, 5]); expect(q.maxSeen).toBe(2);
  });
  it('keeps going after a failure', async () => {
    const q = new UploadQueue(1);
    await expect(q.add(async () => { throw new Error('x'); })).rejects.toThrow();
    expect(await q.add(async () => 'ok')).toBe('ok');
  });
});
