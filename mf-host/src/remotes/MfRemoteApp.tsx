import { lazy, Suspense, useState } from 'react';
import { RemoteBoundary } from '../RemoteBoundary';
import { loadApp, NAME } from './mfRemote';

/** Загружает и рендерит mf_remote/App. */
export function MfRemoteApp() {
  // Ленивый инициализатор useState, а не голый const: тот пересоздавал бы
  // lazy-компонент на каждом рендере, и remote перемонтировался бы,
  // теряя своё состояние.
  const [RemoteApp] = useState(() => lazy(loadApp));

  return (
    <RemoteBoundary name={NAME}>
      <Suspense fallback={<p className="host__status">Загружаю {NAME}…</p>}>
        <RemoteApp />
      </Suspense>
    </RemoteBoundary>
  );
}
