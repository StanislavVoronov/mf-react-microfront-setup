import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';
import type { ComponentType } from 'react';
import type { RemoteDescriptor } from './registry';

const registered = new Set<string>();

/**
 * Регистрирует контейнеры в рантайме Module Federation.
 *
 * Ничего не грузит: registerRemotes — это запись в реестре, сеть не трогается.
 * Контейнер поднимется при первом loadRemote, то есть когда React отрендерит
 * соответствующий lazy-компонент.
 */
export function registerRemoteContainers(remotes: RemoteDescriptor[]): void {
  const fresh = remotes.filter((remote) => !registered.has(remote.name));

  if (fresh.length === 0) {
    return;
  }

  registerRemotes(fresh.map(({ name, entry }) => ({ name, entry })));

  for (const remote of fresh) {
    registered.add(remote.name);
  }
}

/**
 * Достаёт модуль из контейнера по его описанию.
 *
 * Универсальный загрузчик: ничего не знает про конкретные remote, работает
 * по параметрам из реестра.
 */
export async function loadRemoteModule(remote: RemoteDescriptor) {
  registerRemoteContainers([remote]);

  const moduleId = `${remote.name}/${remote.module}`;
  const loaded = await loadRemote<{ default: ComponentType }>(moduleId);

  if (!loaded) {
    throw new Error(`${moduleId} не найден в ${remote.entry}`);
  }

  return loaded;
}
