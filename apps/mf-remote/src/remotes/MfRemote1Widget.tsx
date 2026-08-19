import { lazy, Suspense, useState } from 'react';
import { RemoteBoundary } from '../RemoteBoundary';
import { loadWidget, NAME } from './mfRemote1';

/** Загружает и рендерит mf_remote_1/Widget. */
export function MfRemote1Widget() {
  // Ленивый инициализатор useState, а не голый const: тот пересоздавал бы
  // lazy-компонент на каждом рендере, и remote перемонтировался бы,
  // теряя своё состояние.
  const [Widget] = useState(() => lazy(loadWidget));

  return (
    <RemoteBoundary name={NAME}>
      <Suspense
        fallback={<p className="remote-app__hint">Загружаю {NAME}…</p>}
      >
        <Widget />
      </Suspense>
    </RemoteBoundary>
  );
}
