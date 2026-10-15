import type { PhotoItem } from '../types/photo';
const text = { processing: 'Preparing…', uploading: 'Sending…', saved: 'Saved', failed: 'Failed' } as const;
export function UploadProgress({ items, onRetry, canRetry }: { items: PhotoItem[]; onRetry: (id: string) => void; canRetry: (id: string) => boolean }) {
  return <ul className="plist">{items.map((i, n) => (
    <li key={i.id} className={'prow ' + i.status}>
      {i.thumb ? <img src={i.thumb} alt="" /> : <span className="ph" />}
      <span className="pname">{i.label || `Photo ${n + 1}`}{i.error && <small>{i.error}</small>}</span>
      <span className="pstat" role="status">{text[i.status]}</span>
      {i.status === 'failed' && canRetry(i.id) && <button className="link" onClick={() => onRetry(i.id)}>Retry upload</button>}
    </li>))}</ul>;
}
