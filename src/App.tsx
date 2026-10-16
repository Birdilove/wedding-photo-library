import { lazy, Suspense, useCallback, useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { CompletionScreen } from './components/CompletionScreen';
import { markCueSeen, pickCue } from './config/wedding';
const CameraScreen = lazy(() => import('./components/CameraScreen').then(m => ({ default: m.CameraScreen })));
type View = { n: 'home' } | { n: 'camera'; k: number } | { n: 'done' };
export default function App() {
  const [v, setV] = useState<View>({ n: 'home' }); // new key => camera remounts with fresh session state
  const [cue, setCue] = useState(pickCue);
  const home = useCallback(() => setV({ n: 'home' }), []);
  const camera = () => { markCueSeen(cue); setV({ n: 'camera', k: Date.now() }); };
  const done = useCallback(() => { setCue(pickCue()); setV({ n: 'done' }); }, []); // current cue is already marked seen
  return (<Suspense fallback={<main className="screen" />}>
    {v.n === 'home' && <HomeScreen cue={cue} onCamera={camera} />}
    {v.n === 'camera' && <CameraScreen key={v.k} cue={cue} onBack={home} onDone={done} />}
    {v.n === 'done' && <CompletionScreen cue={cue} onCamera={camera} onHome={home} />}</Suspense>);
}
