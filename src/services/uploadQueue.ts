/** Runs async tasks with a fixed concurrency limit. */
export class UploadQueue {
  private running = 0; private waiting: (() => void)[] = []; maxSeen = 0;
  constructor(private limit: number) {}
  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => { this.running++; this.maxSeen = Math.max(this.maxSeen, this.running);
        task().then(resolve, reject).finally(() => { this.running--; this.waiting.shift()?.(); }); };
      this.running < this.limit ? run() : this.waiting.push(run);
    });
  }
}
