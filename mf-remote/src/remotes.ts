import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';
import type { ComponentType } from 'react';

// mf-remote здесь выступает уже не как remote, а как host: он сам подключает
// вложенные контейнеры. Пути относительные — реальные адреса знает только
// прокси того, кто открыл страницу (dev-сервер mf-host или mf-bus).
export const REMOTES = {
  mf_remote_1: '/mf-remote-1/mf-manifest.json',
  mf_remote_2: '/mf-remote-2/mf-manifest.json',
} as const;

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

export const loadWidget = () => load('mf_remote_1/Widget');
export const loadWeather = () => load('mf_remote_2/Weather');

/**
 * Поднимает вложенные контейнеры до того, как хост создаст React-корень.
 *
 * В dev-сборке внутри контейнера едет собственный рантайм remote —
 * react-refresh и HMR-клиент. Он должен встать в глобальный хук раньше,
 * чем React DOM зарегистрирует рендерер, иначе HMR выродится
 * в перезагрузку страницы.
 *
 * Последовательно, а не Promise.all: при параллельной инициализации
 * контейнеры гонятся за share scope и второй успевает подтянуть
 * собственную копию React вместо общей.
 *
 * Ошибки глушим: недоступный вложенный remote не должен ронять mf-remote,
 * его покажет RemoteBoundary при рендере.
 */
export async function preloadRemotes(): Promise<void> {
  for (const load of [loadWidget, loadWeather]) {
    await load().catch(() => undefined);
  }
}
