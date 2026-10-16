import { useEffect, useRef, useState } from 'react';
import { limits } from '../config/wedding';
import { useCamera, type CameraError } from '../hooks/useCamera';
import { useUploadSession } from '../hooks/useUploadSession';
import { processVideoFrame } from '../services/photoProcessingService';
import { PhotoThumbnail } from './PhotoThumbnail';
import { UploadProgress } from './UploadProgress';
const msg: Record<CameraError, string> = {
  insecure: 'Camera needs a secure (https) connection. In development use localhost or HTTPS.',
  denied: 'Camera permission was denied. Allow camera access in your browser settings, or open this link in Safari or Chrome.',
  unavailable: 'This browser does not support camera access. Try opening this link in Safari or Chrome.',
  nocamera: 'No compatible camera was found. Try opening this link in Safari or Chrome.',
  failed: 'The camera could not start. Close other apps using it and try again.' };
export function CameraScreen({ cue, onBack, onDone }: { cue: string; onBack: () => void; onDone: () => void }) {
  const cam = useCamera(); const s = useUploadSession();
  const [count, setCount] = useState(0); const [finished, setFinished] = useState(false);
  const [captureErr, setCaptureErr] = useState(''); const busy = useRef(false); const max = limits.cameraMaxPhotos;
  useEffect(() => { void cam.start(); }, [cam.start]);
  useEffect(() => { if (finished && s.allSaved) onDone(); }, [finished, s.allSaved, onDone]);

  async function shoot() {
    const v = cam.videoRef.current;
    if (busy.current || finished || count >= max || !v || !cam.ready) return;
    busy.current = true; setCaptureErr(''); setCount(c => c + 1);
    const id = s.begin('');
    try {
      const frame = processVideoFrame(v); busy.current = false; // frame grab is synchronous; unlock for next shot
      const r = await frame;
      s.ready(id, r.file, { source: 'camera', width: r.width, height: r.height, capturedAt: new Date().toISOString(), cue });
    } catch { busy.current = false; s.fail(id, 'Capture failed. This photo was not saved.'); setCaptureErr('Capture failed. Try again.'); }
  }
  function finish() { cam.stop(); setFinished(true); }
  function back() { if (s.pending && !confirm('Photos are still sending. Leave anyway and lose them?')) return; cam.stop(); onBack(); }
  const full = count >= max;
  return (<main className="screen camera">
    <header className="bar"><button className="link" onClick={back}>Back</button><h2>Take Photos</h2><span className="count" aria-live="polite">{count} / {max}</span></header>
    <p className="cuebar">{cue}</p>
    {finished ? (<section className="finishing"><h3>{s.pending ? 'Sending your photos…' : 'Some photos need attention'}</h3>
      <UploadProgress items={s.items} onRetry={s.retry} canRetry={s.canRetry} /></section>) : (<>
      <div className="viewfinder"><video ref={cam.videoRef} className={cam.facing === 'user' ? 'mirror' : ''} playsInline muted autoPlay />
        {cam.multi && !cam.error && <button className="flip" aria-label="Switch camera" disabled={!cam.ready} onClick={() => void cam.flip()}>⟲</button>}
        {cam.error && <div className="camerr"><p>{msg[cam.error]}</p>{cam.error !== 'insecure' && <button className="btn secondary" onClick={() => void cam.start()}>Try again</button>}<button className="btn secondary" onClick={() => void navigator.clipboard?.writeText(location.href)}>Copy link</button><button className="btn secondary" onClick={back}>Back to home</button></div>}
        {full && <div className="limit">You’ve reached 5 photos. Tap Finish.</div>}</div>
      {captureErr && <p className="err" role="alert">{captureErr}</p>}
      <div className="strip">{s.items.map(i => <PhotoThumbnail key={i.id} item={i} />)}</div>
      <div className="controls"><span /><button className="shutter" aria-label="Take photo" disabled={!cam.ready || full} onClick={() => void shoot()} />
        <button className="btn primary small" disabled={count === 0} onClick={finish}>Finish</button></div></>)}
  </main>);
}
