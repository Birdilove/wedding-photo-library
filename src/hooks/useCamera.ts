import { useCallback, useEffect, useRef, useState } from 'react';
export type CameraError = 'insecure' | 'denied' | 'unavailable' | 'nocamera' | 'failed';
export type Facing = 'environment' | 'user';
export const ZOOM_LEVELS = [1, 1.5, 2] as const;
type ZoomCaps = { zoom?: { min: number; max: number } }; // zoom is not in every TS DOM lib yet
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingRef = useRef<Facing>('environment');
  const starting = useRef(false); const alive = useRef(true);
  const [ready, setReady] = useState(false); const [error, setError] = useState<CameraError | null>(null);
  const [facing, setFacing] = useState<Facing>('environment'); const [multi, setMulti] = useState(false);
  // Zoom: real (hardware) zoom where the browser supports it (Android Chrome), otherwise digital zoom (preview scale + centre crop on capture).
  const hwRef = useRef(false); const [hw, setHw] = useState(false); const [zoom, setZoomState] = useState(1);

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
        video: { facingMode: { ideal: facingRef.current }, width: { ideal: 3264 }, height: { ideal: 2448 } } });
      if (!alive.current) { s.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = s; const v = videoRef.current;
      const zc = (s.getVideoTracks()[0]?.getCapabilities?.() as unknown as ZoomCaps | undefined)?.zoom;
      const canHw = !!zc && zc.max >= 2 && zc.min <= 1; hwRef.current = canHw; setHw(canHw); setZoomState(1); // every new stream starts at 1x
      if (v) { v.srcObject = s; await v.play(); setReady(true); }
      navigator.mediaDevices.enumerateDevices().then(d => alive.current && setMulti(d.filter(x => x.kind === 'videoinput').length > 1)).catch(() => {});
    } catch (e) {
      stop(); const n = (e as DOMException).name;
      if (alive.current) setError(n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'nocamera' : 'failed');
    } finally { starting.current = false; }
  }, [stop]);
  const setZoom = useCallback(async (z: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (hwRef.current && track) {
      try { await track.applyConstraints({ advanced: [{ zoom: z }] } as unknown as MediaTrackConstraints); setZoomState(z); return; }
      catch { // hardware zoom refused: fall back to digital zoom from 1x
        hwRef.current = false; setHw(false);
        track.applyConstraints({ advanced: [{ zoom: 1 }] } as unknown as MediaTrackConstraints).catch(() => {});
      }
    }
    setZoomState(z);
  }, []);
  const flip = useCallback(async () => {
    if (starting.current) return;
    facingRef.current = facingRef.current === 'environment' ? 'user' : 'environment';
    setFacing(facingRef.current); setZoomState(1); stop(); await start();
  }, [start, stop]);
  useEffect(() => {
    alive.current = true;
    const hidden = () => { if (document.hidden) stop(); else void start(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { alive.current = false; document.removeEventListener('visibilitychange', hidden); stop(); };
  }, [start, stop]);
  const canZoom = facing === 'environment'; // front camera: no zoom
  const digitalZoom = canZoom && !hw ? zoom : 1; // amount the app itself must scale/crop
  return { videoRef, ready, error, start, stop, flip, facing, multi, zoom, setZoom, canZoom, digitalZoom };
}
