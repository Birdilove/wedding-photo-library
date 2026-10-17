import { describe, it, expect } from 'vitest';
import { UploadError, withRetry } from './retry';
const fast = async () => {};
describe('withRetry', () => {
  it('succeeds after transient failures', async () => {
    let n = 0; const r = await withRetry(async () => { if (++n < 3) throw new Error('net'); return 'ok'; }, [1, 1, 1], fast);
    expect(r).toBe('ok'); expect(n).toBe(3);
  });
  it('does not retry permanent errors', async () => {
    let n = 0; await expect(withRetry(async () => { n++; throw new UploadError('bad', false); }, [1, 1], fast)).rejects.toThrow('bad'); expect(n).toBe(1);
  });
  it('gives up after the last delay', async () => {
    let n = 0; await expect(withRetry(async () => { n++; throw new Error('down'); }, [1, 1], fast)).rejects.toThrow('down'); expect(n).toBe(3);
  });
});
