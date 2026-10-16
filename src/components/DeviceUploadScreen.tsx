import { useEffect, useRef, useState } from 'react';
import { limits } from '../config/wedding';
import { useUploadSession } from '../hooks/useUploadSession';
import { processImageFile } from '../services/photoProcessingService';
import { UploadProgress } from './UploadProgress';
export function DeviceUploadScreen({ files, onBack, onDone }: { files: File[]; onBack: () => void; onDone: () => void }) {
  const s = useUploadSession(); const started = useRef(false); const [note, setNote] = useState('');
  useEffect(() => {
    if (started.current) return; started.current = true;
    const chosen = files.slice(0, limits.deviceMaxFiles);
    if (chosen.length < files.length) setNote(`Only the first ${limits.deviceMaxFiles} photos were used.`);
    (async () => { for (const f of chosen) { // sequential: one decoded image in memory at a time
      const id = s.begin(f.name);
      try { const r = await processImageFile(f); s.ready(id, r.file, { source: 'device', originalName: f.name, width: r.width, height: r.height, capturedAt: new Date().toISOString() }); }
      catch (e) { s.fail(id, (e as Error).message); } } })();
  }, []); // eslint-disable-line
  useEffect(() => { if (s.allSaved) onDone(); }, [s.allSaved, onDone]);
  function back() { if (s.pending && !confirm('Photos are still sending. Leave anyway?')) return; onBack(); }
  return (<main className="screen device"><header className="bar"><button className="link" onClick={back}>Back</button><h2>Your photos</h2><span /></header>
    {note && <p className="err">{note}</p>}<UploadProgress items={s.items} onRetry={s.retry} canRetry={s.canRetry} />
    {!s.pending && !s.allSaved && <p className="hint">Photos marked Failed were not added. Retry sending, or go back.</p>}</main>);
}
