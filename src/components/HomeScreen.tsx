import { wedding } from '../config/wedding';
export function HomeScreen({ cue, onCamera }: { cue: string; onCamera: () => void }) {
  return (<main className="screen home">
    <div className="hero"><h1>{wedding.couple}</h1><p className="date">{wedding.date}</p><p className="welcome">“{wedding.welcome}”</p></div>
    <div className="actions"><p className="cue">{cue}</p>
      <button className="btn primary" onClick={onCamera}>TAKE PHOTOS</button></div>
    <footer>{wedding.footer}</footer></main>);
}
