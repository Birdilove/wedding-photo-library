import { describe, it, expect } from 'vitest';
import { centerCrop, fitWithin } from './photoProcessingService';
import { UploadQueue } from './uploadQueue';
describe('fitWithin (4 MP budget)', () => {
  it('downsizes a 4:3 camera frame to about 4 MP', () => expect(fitWithin(6528, 4896)).toEqual({ width: 2309, height: 1732 }));
  it('downsizes portrait', () => expect(fitWithin(4896, 6528)).toEqual({ width: 1732, height: 2309 }));
  it('keeps 16:9 ratio at the same pixel budget', () => expect(fitWithin(3840, 2160)).toEqual({ width: 2667, height: 1500 }));
  it('never upscales', () => expect(fitWithin(1280, 720)).toEqual({ width: 1280, height: 720 }));
  it('honours a custom budget', () => { const r = fitWithin(4000, 3000, 1_000_000); expect(r.width * r.height).toBeLessThanOrEqual(1_000_000 * 1.001); }); // rounding to whole pixels may overshoot by a hair
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

describe('centerCrop', () => {
  it('keeps the whole frame at 1x', () => expect(centerCrop(4000, 3000, 1)).toEqual({ x: 0, y: 0, w: 4000, h: 3000 }));
  it('keeps the centre at 2x', () => expect(centerCrop(4000, 3000, 2)).toEqual({ x: 1000, y: 750, w: 2000, h: 1500 }));
  it('keeps the centre at 1.5x', () => expect(centerCrop(3000, 3000, 1.5)).toEqual({ x: 500, y: 500, w: 2000, h: 2000 }));
});
