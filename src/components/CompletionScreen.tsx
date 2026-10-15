export const CompletionScreen = ({ onHome }: { onHome: () => void }) => (
  <main className="screen done"><div className="hero"><h1>Thank you! ❤️</h1>
    <p className="welcome">Your photos have been added to our wedding memories.</p></div>
    <div className="actions"><button className="btn primary" onClick={onHome}>BACK TO HOME</button></div></main>);
