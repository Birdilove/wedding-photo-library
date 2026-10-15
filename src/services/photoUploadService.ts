import type { PhotoMetadata, UploadResult } from '../types/photo';
export interface PhotoUploadService { uploadPhoto(file: File, metadata: PhotoMetadata): Promise<UploadResult> }

/** PHASE 1 MOCK: nothing leaves the device. Add ?simulateFail to the URL to fail ~40% of uploads. */
export class MockUploadService implements PhotoUploadService {
  constructor(private delay = () => 600 + Math.random() * 900, private failRate = () => (typeof location !== 'undefined' && location.search.includes('simulateFail') ? 0.4 : 0)) {}
  async uploadPhoto(_file: File, _m: PhotoMetadata): Promise<UploadResult> {
    await new Promise(r => setTimeout(r, this.delay()));
    if (Math.random() < this.failRate()) throw new Error('Simulated upload failure');
    return { id: crypto.randomUUID() };
  }
}
// Phase 2: replace with a real backend client implementing PhotoUploadService.
export const uploadService: PhotoUploadService = new MockUploadService();
