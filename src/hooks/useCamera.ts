import { useCallback, useEffect, useRef, useState } from 'react';
export type CameraError = 'insecure' | 'denied' | 'unavailable' | 'nocamera' | 'failed';
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const starting = useRef(false); const alive = useRef(true);
  const [ready, setReady] = useState(false); const [error, setError] = useState<CameraError | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (alive.current) setReady(false);
  }, []);
  const start = useCallback(async () => {
    if (starting.current || streamRef.current) return; // no duplicate sessions
    if (!window.isSecureContext) return setError('insecure');
    if (!navigator.mediaDevices?.getUserMedia) return setError('unavailable');
    starting.current = true; setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 3264 }, height: { ideal: 2448 } } });
      if (!alive.current) { s.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = s; const v = videoRef.current;
      if (v) { v.srcObject = s; await v.play(); setReady(true); }
    } catch (e) {
      stop(); const n = (e as DOMException).name;
      if (alive.current) setError(n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'nocamera' : 'failed');
    } finally { starting.current = false; }
  }, [stop]);
  useEffect(() => {
    alive.current = true;
    const hidden = () => { if (document.hidden) stop(); else void start(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { alive.current = false; document.removeEventListener('visibilitychange', hidden); stop(); };
  }, [start, stop]);
  return { videoRef, ready, error, start, stop };
}
