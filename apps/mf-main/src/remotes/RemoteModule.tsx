import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';
import { lazy, Suspense, useState } from 'react';
import type { ComponentType } from 'react';
import { RemoteBoundary } from '../RemoteBoundary';
import type { RemoteDescriptor } from './registry';

async function loadRemoteComponent(remote: RemoteDescriptor) {
  registerRemotes([{ name: remote.name, entry: remote.entry }]);

  const moduleId = `${remote.name}/${remote.module}`;
  const loaded = await loadRemote<{ default: ComponentType }>(moduleId);

  if (!loaded) {
    throw new Error(`${moduleId} не найден в ${remote.entry}`);
  }

  return loaded;
}

/** Рендерит произвольный remote-модуль по его описанию из реестра. */
export function RemoteModule({ remote }: { remote: RemoteDescriptor }) {
  const label = remote.title ?? `${remote.name}/${remote.module}`;

  // Ленивый инициализатор useState, а не голый const: тот пересоздавал бы
  // lazy-компонент на каждом рендере, и remote перемонтировался бы,
  // теряя своё состояние.
  const [Component] = useState(() => lazy(() => loadRemoteComponent(remote)));

  return (
    <RemoteBoundary name={label}>
      <Suspense fallback={<p className="host__status">Загружаю {label}…</p>}>
        <Component />
      </Suspense>
    </RemoteBoundary>
  );
}
