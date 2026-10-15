import { useRef } from 'react';
import { wedding } from '../config/wedding';
export function HomeScreen({ onCamera, onFiles }: { onCamera: () => void; onFiles: (f: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (<main className="screen home">
    <div className="hero"><h1>{wedding.couple}</h1><p className="date">{wedding.date}</p><p className="welcome">“{wedding.welcome}”</p></div>
    <div className="actions">
      <button className="btn primary" onClick={onCamera}>TAKE PHOTOS</button>
      <button className="btn secondary" onClick={() => input.current?.click()}>UPLOAD FROM DEVICE</button>
      <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden
        onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ''; if (f.length) onFiles(f); }} />
    </div><footer>Brownie, do you think i can contain my excitement? Especially when you asked for it?</footer></main>);
}
