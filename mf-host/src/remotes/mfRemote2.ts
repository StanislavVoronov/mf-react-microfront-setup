import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';
import type { ComponentType } from 'react';

export const NAME = 'mf_remote_2';

export const ENTRY = '/mf-remote-2/mf-manifest.json';

registerRemotes([{ name: NAME, entry: ENTRY }]);

export async function loadWeather() {
  const module = await loadRemote<{ default: ComponentType }>(
    `${NAME}/Weather`,
  );

  if (!module) {
    throw new Error(`${NAME}/Weather не найден в ${ENTRY}`);
  }

  return module;
}
