import type { PhotoMetadata, UploadResult } from '../types/photo';
import { getDeviceId } from './deviceId';
import { UploadError } from './retry';
export interface PhotoUploadService { uploadPhoto(file: File, metadata: PhotoMetadata): Promise<UploadResult> }

const maxUploadBytes = 4 * 1024 * 1024;

export class HttpUploadService implements PhotoUploadService {
  constructor(private endpoint = import.meta.env.VITE_UPLOAD_API_URL) {}

  async uploadPhoto(file: File, metadata: PhotoMetadata): Promise<UploadResult> {
    if (!this.endpoint) throw new Error('Photo uploads are not configured yet. Please try again later.');
    if (file.size > maxUploadBytes) throw new UploadError('This photo is too large to upload.', false);

    const body = new FormData();
    body.append('photo', file, file.name);
    body.append('metadata', JSON.stringify({ ...metadata, deviceId: getDeviceId() }));
    let response: Response;
    try { response = await fetch(this.endpoint, { method: 'POST', body }); }
    catch { throw new UploadError('No connection. Please check your signal.'); } // network drop: worth retrying
    const result = await response.json().catch(() => null) as { id?: string; error?: string } | null;
    if (!response.ok || !result?.id) throw new UploadError(result?.error || 'Photo upload failed. Please retry.', response.status >= 500 || response.status === 408); // 4xx are permanent
    return { id: result.id };
  }
}

/** PHASE 1 MOCK: nothing leaves the device. Add ?simulateFail to the URL to fail ~40% of uploads. */
export class MockUploadService implements PhotoUploadService {
  constructor(private delay = () => 600 + Math.random() * 900, private failRate = () => (typeof location !== 'undefined' && location.search.includes('simulateFail') ? 0.4 : 0)) {}
  async uploadPhoto(_file: File, _m: PhotoMetadata): Promise<UploadResult> {
    await new Promise(r => setTimeout(r, this.delay()));
    if (Math.random() < this.failRate()) throw new Error('Simulated upload failure');
    return { id: crypto.randomUUID() };
  }
}
export const uploadService: PhotoUploadService = import.meta.env.VITE_UPLOAD_API_URL
  ? new HttpUploadService()
  : new MockUploadService();
