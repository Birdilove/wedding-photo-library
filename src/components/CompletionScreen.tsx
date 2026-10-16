export const CompletionScreen = ({ cue, onCamera, onHome }: { cue: string; onCamera: () => void; onHome: () => void }) => (
  <main className="screen done"><div className="hero"><h1>Thank you! ❤️</h1>
    <p className="welcome">Your photos have been added to our wedding memories.</p></div>
    <div className="actions"><p className="cue">Next: {cue}</p>
      <button className="btn primary" onClick={onCamera}>TAKE MORE PHOTOS</button>
      <button className="btn secondary" onClick={onHome}>BACK TO HOME</button></div></main>);
