import { lazy, Suspense, useCallback, useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { CompletionScreen } from './components/CompletionScreen';
const CameraScreen = lazy(() => import('./components/CameraScreen').then(m => ({ default: m.CameraScreen })));
const DeviceUploadScreen = lazy(() => import('./components/DeviceUploadScreen').then(m => ({ default: m.DeviceUploadScreen })));
type View = { n: 'home' } | { n: 'camera'; k: number } | { n: 'device'; files: File[]; k: number } | { n: 'done' };
export default function App() {
  const [v, setV] = useState<View>({ n: 'home' }); // new key => screen remounts with fresh session state
  const home = useCallback(() => setV({ n: 'home' }), []); const done = useCallback(() => setV({ n: 'done' }), []);
  return (<Suspense fallback={<main className="screen" />}>
    {v.n === 'home' && <HomeScreen onCamera={() => setV({ n: 'camera', k: Date.now() })} onFiles={(files: File[]) => setV({ n: 'device', files, k: Date.now() })} />}
    {v.n === 'camera' && <CameraScreen key={v.k} onBack={home} onDone={done} />}
    {v.n === 'device' && <DeviceUploadScreen key={v.k} files={v.files} onBack={home} onDone={done} />}
    {v.n === 'done' && <CompletionScreen onHome={home} />}</Suspense>);
}
