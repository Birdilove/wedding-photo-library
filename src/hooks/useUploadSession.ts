import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PhotoItem, PhotoMetadata } from '../types/photo';
import { uploadService } from '../services/photoUploadService';
import { UploadQueue } from '../services/uploadQueue';
import { withRetry } from '../services/retry';
import { limits } from '../config/wedding';

/** Tracks every photo in one guest session and uploads through a 2-wide queue. */
export function useUploadSession() {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const queue = useRef(new UploadQueue(limits.uploadConcurrency));
  const alive = useRef(true); const permanent = useRef(new Set<string>()); const thumbs = useRef<string[]>([]); const files = useRef(new Map<string, { file: File; meta: PhotoMetadata }>());
  useEffect(() => { alive.current = true; return () => { alive.current = false; thumbs.current.forEach(URL.revokeObjectURL); files.current.clear(); }; }, []);
  const patch = (id: string, p: Partial<PhotoItem>) => alive.current && setItems(a => a.map(i => i.id === id ? { ...i, ...p } : i));

  const send = useCallback((id: string, file: File, meta: PhotoMetadata) => {
    patch(id, { status: 'uploading', error: undefined });
    withRetry(() => queue.current.add(() => uploadService.uploadPhoto(file, meta))) // retries quietly before showing Failed
      .then(() => { files.current.delete(id); patch(id, { status: 'saved' }); }) // drop blob once saved
      .catch(e => { if ((e as { retryable?: boolean }).retryable === false) permanent.current.add(id); patch(id, { status: 'failed', error: (e as Error).message }); });
  }, []);
  const begin = useCallback((label: string) => {
    const id = crypto.randomUUID(); setItems(a => [...a, { id, label, status: 'processing' }]); return id;
  }, []);
  const ready = useCallback((id: string, file: File, meta: PhotoMetadata) => {
    const thumb = URL.createObjectURL(file); thumbs.current.push(thumb);
    files.current.set(id, { file, meta }); patch(id, { thumb }); send(id, file, meta);
  }, [send]);
  const fail = useCallback((id: string, error: string) => patch(id, { status: 'failed', error }), []);
  const retry = useCallback((id: string) => { const f = files.current.get(id); if (f) send(id, f.file, f.meta); }, [send]);
  const canRetry = (id: string) => files.current.has(id) && !permanent.current.has(id);
  const pending = items.some(i => i.status === 'processing' || i.status === 'uploading');
  useEffect(() => { if (!pending) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [pending]);
  const allSaved = useMemo(() => items.length > 0 && items.every(i => i.status === 'saved'), [items]);
  return { items, begin, ready, fail, retry, canRetry, pending, allSaved };
}
