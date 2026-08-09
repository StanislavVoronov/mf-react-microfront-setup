import { lazy, Suspense, useState } from 'react';
import { RemoteBoundary } from '../RemoteBoundary';
import { loadRemoteModule } from './loadRemoteModule';
import type { RemoteDescriptor } from './registry';

/** Рендерит произвольный remote-модуль по его описанию из реестра. */
export function RemoteModule({ remote }: { remote: RemoteDescriptor }) {
  const label = remote.title ?? `${remote.name}/${remote.module}`;

  // Ленивый инициализатор useState, а не голый const: тот пересоздавал бы
  // lazy-компонент на каждом рендере, и remote перемонтировался бы,
  // теряя своё состояние.
  const [Component] = useState(() => lazy(() => loadRemoteModule(remote)));

  return (
    <RemoteBoundary name={label}>
      <Suspense fallback={<p className="host__status">Загружаю {label}…</p>}>
        <Component />
      </Suspense>
    </RemoteBoundary>
  );
}
