import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';
import type { ComponentType } from 'react';
import type { RemoteDescriptor } from './registry';

const registered = new Set<string>();

/**
 * Регистрирует контейнер (один раз на имя) и достаёт из него модуль.
 *
 * Универсальный загрузчик: ничего не знает про конкретные remote, работает
 * по параметрам из реестра.
 */
export async function loadRemoteModule({
  name,
  entry,
  module,
}: RemoteDescriptor) {
  if (!registered.has(name)) {
    registerRemotes([{ name, entry }]);
    registered.add(name);
  }

  const moduleId = `${name}/${module}`;
  const loaded = await loadRemote<{ default: ComponentType }>(moduleId);

  if (!loaded) {
    throw new Error(`${moduleId} не найден в ${entry}`);
  }

  return loaded;
}

/**
 * Поднимает контейнеры до создания React-корня.
 *
 * В dev-сборке внутри контейнера едет собственный рантайм remote —
 * react-refresh и HMR-клиент. Он должен встать в глобальный хук раньше,
 * чем React DOM зарегистрирует рендерер, иначе HMR remote выродится
 * в перезагрузку страницы.
 *
 * Последовательно, а не Promise.all: при параллельной инициализации
 * контейнеры гонятся за share scope и второй remote успевает подтянуть
 * собственную копию React вместо общей.
 *
 * Ошибки глушим: недоступный remote не должен мешать хосту стартовать,
 * его покажет RemoteBoundary при рендере.
 */
export async function preloadRemotes(
  remotes: RemoteDescriptor[],
): Promise<void> {
  for (const remote of remotes) {
    await loadRemoteModule(remote).catch(() => undefined);
  }
}
