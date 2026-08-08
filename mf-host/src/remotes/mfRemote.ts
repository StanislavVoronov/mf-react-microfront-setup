import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';
import type { ComponentType } from 'react';

export const NAME = 'mf_remote';

// Относительный путь: адрес и порт remote знает только прокси —
// dev-сервер mf-host в разработке и mf-bus при раздаче сборки.
export const ENTRY = '/mf-remote/mf-manifest.json';

// Регистрация контейнера в рантайме Module Federation.
// В rsbuild.config.ts никаких remotes нет.
registerRemotes([{ name: NAME, entry: ENTRY }]);

export async function loadApp() {
  const module = await loadRemote<{ default: ComponentType }>(`${NAME}/App`);

  if (!module) {
    throw new Error(`${NAME}/App не найден в ${ENTRY}`);
  }

  return module;
}
