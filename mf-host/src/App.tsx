import { lazy, Suspense } from 'react';
import { RemoteBoundary } from './RemoteBoundary';
import { loadRemoteApp, REMOTE_ENTRY, REMOTE_NAME } from './remote';

const RemoteApp = lazy(loadRemoteApp);

export function App() {
  return (
    <main className="host">
      <header className="host__header">
        <h1 className="host__title">mf-host</h1>
        <p className="host__subtitle">Module Federation 2.0 · Rsbuild · React</p>
        <p className="host__subtitle">
          {REMOTE_NAME}/App ← {REMOTE_ENTRY}
        </p>
      </header>

      <RemoteBoundary name="mf-remote">
        <Suspense fallback={<p className="host__status">Загружаю remote…</p>}>
          <RemoteApp />
        </Suspense>
      </RemoteBoundary>
    </main>
  );
}
