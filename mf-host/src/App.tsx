import { MfRemoteApp } from './remotes/MfRemoteApp';
import { MfRemote2Weather } from './remotes/MfRemote2Weather';

export function App() {
  return (
    <main className="host">
      <header className="host__header">
        <h1 className="host__title">mf-host</h1>
        <p className="host__subtitle">Module Federation 2.0 · Rsbuild · React</p>
      </header>

      <MfRemoteApp />
      <MfRemote2Weather />
    </main>
  );
}
