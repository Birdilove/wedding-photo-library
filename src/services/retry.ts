/** An upload error. retryable=false means trying again can never help (bad file, per-device limit...). */
export class UploadError extends Error { constructor(message: string, public retryable = true) { super(message); } }

/** Runs task, retrying after each delay (ms) unless the error is marked non-retryable. */
export async function withRetry<T>(task: () => Promise<T>, delays = [1500, 4000, 9000], sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await task(); }
    catch (e) {
      if ((e as { retryable?: boolean }).retryable === false || attempt >= delays.length) throw e;
      await sleep(delays[attempt]);
    }
  }
}
