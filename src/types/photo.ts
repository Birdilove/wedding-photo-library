export type PhotoStatus = 'processing' | 'uploading' | 'saved' | 'failed';
export interface PhotoMetadata { source: 'camera' | 'device'; originalName?: string; width: number; height: number; capturedAt: string; cue?: string }
export interface UploadResult { id: string }
export interface PhotoItem { id: string; label: string; status: PhotoStatus; thumb?: string; file?: File; meta?: PhotoMetadata; error?: string }
