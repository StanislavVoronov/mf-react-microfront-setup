import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';
import type { ComponentType } from 'react';

// Относительные пути: адреса и порты remote знает только прокси —
// dev-сервер mf-host в разработке и mf-bus при раздаче сборки.
//
// Хост знает ровно один контейнер. Что mf-remote подключает внутрь себя —
// его дело, здесь этого не видно.
export const REMOTES = {
  mf_remote: '/mf-remote/mf-manifest.json',
} as const;

// Регистрация контейнеров в рантайме Module Federation.
// В rsbuild.config.ts никаких remotes нет: хост знает только имена
// контейнеров и адреса их манифестов.
registerRemotes(
  Object.entries(REMOTES).map(([name, entry]) => ({ name, entry })),
);

async function load(moduleId: string) {
  const module = await loadRemote<{ default: ComponentType }>(moduleId);

  if (!module) {
    throw new Error(`${moduleId} не найден`);
  }

  return module;
}

export const loadRemoteApp = () => load('mf_remote/App');

/**
 * Поднимает контейнеры remote до создания React-корня.
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
export async function preloadRemotes(): Promise<void> {
  for (const load of [loadRemoteApp]) {
    await load().catch(() => undefined);
  }
}
