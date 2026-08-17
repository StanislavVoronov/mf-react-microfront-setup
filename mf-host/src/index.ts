import {
  loadRemote,
  registerRemotes,
} from '@module-federation/enhanced/runtime';
import type { ComponentType } from 'react';

type RemoteComponentModule = {
  default: ComponentType;
};

type RemoteStub = {
  name: string;
  entry: string;
};

async function fetchStubs(): Promise<RemoteStub[]> {
  const response = await fetch('/api/remotes');

  if (!response.ok) {
    throw new Error(`/api/remotes ответил ${response.status}`);
  }

  return (await response.json()) as RemoteStub[];
}

async function mountMain(): Promise<void> {
  const stubs = await fetchStubs();

  registerRemotes([
    { name: 'mf_main', entry: '/mf-main/mf-manifest.json' },
    ...stubs.map(({ name, entry }) => ({ name, entry })),
  ]);

  const main = await loadRemote<RemoteComponentModule>('mf_main');

  if (!main) {
    throw new Error('mf_main не найден');
  }

  const { render } = await import('./render');

  render(main.default);
}

function renderStartupError(error: unknown): void {
  console.error('mf-host: не удалось запустить mf-main', error);

  const container = document.getElementById('root');

  if (container) {
    container.textContent = `mf-main недоступен: ${String(error)}`;
  }
}

void mountMain().catch(renderStartupError);
