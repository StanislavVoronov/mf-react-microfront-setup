import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';
import type { ComponentType } from 'react';

export const NAME = 'mf_remote_1';

// mf-remote здесь выступает уже не как remote, а как host: он сам подключает
// вложенный контейнер. Путь относительный — реальный адрес знает только
// прокси того, кто открыл страницу (dev-сервер mf-host или mf-bus).
export const ENTRY = '/mf-remote-1/mf-manifest.json';

registerRemotes([{ name: NAME, entry: ENTRY }]);

export async function loadWidget() {
  const module = await loadRemote<{ default: ComponentType }>(`${NAME}/Widget`);

  if (!module) {
    throw new Error(`${NAME}/Widget не найден в ${ENTRY}`);
  }

  return module;
}
