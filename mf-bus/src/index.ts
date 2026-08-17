import {
  loadRemote,
  registerRemotes,
} from '@module-federation/enhanced/runtime';
import type { ComponentType } from 'react';

type RemoteDescriptor = {
  name: string;
  entry: string;
  module: string;
  title?: string;
  render?: boolean;
};

type AppModule = { default: ComponentType };

const REMOTES_URL = '/api/remotes';
const MAIN_REMOTE: RemoteDescriptor = {
  name: 'mf_main',
  entry: '/mf-main/mf-manifest.json',
  module: '.',
};

async function fetchStubs(): Promise<RemoteDescriptor[]> {
  const response = await fetch(REMOTES_URL);

  if (!response.ok) {
    throw new Error(`${REMOTES_URL} ответил ${response.status}`);
  }

  return (await response.json()) as RemoteDescriptor[];
}

async function start() {
  const stubs = await fetchStubs();

  registerRemotes(
    [MAIN_REMOTE, ...stubs].map(({ name, entry }) => ({ name, entry })),
  );

  const main = await loadRemote<AppModule>(MAIN_REMOTE.name);

  if (!main) {
    throw new Error(`${MAIN_REMOTE.name} не найден`);
  }

  const React = await import('react');
  const ReactDOM = await import('react-dom/client');

  const container = document.getElementById('root');

  if (!container) {
    throw new Error('mf-bus: #root не найден в разметке страницы');
  }

  ReactDOM.createRoot(container).render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(main.default),
    ),
  );
}

start().catch((error) => {
  console.error('mf-bus: не удалось запустить mf-main', error);

  const container = document.getElementById('root');

  if (container) {
    container.textContent = `mf-main недоступен: ${String(error)}`;
  }
});
