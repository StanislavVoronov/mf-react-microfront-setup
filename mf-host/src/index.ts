import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';

// Хост — тонкая оболочка. Он знает ровно один контейнер и ничего не знает
// ни про React, ни про DOM, ни про остальные remote: всё это живёт в mf-main.
const MAIN_NAME = 'mf_main';

// Относительный путь: адрес и порт знает только прокси — dev-сервер
// mf-host в разработке и mf-bus при раздаче сборки.
const MAIN_ENTRY = '/mf-main/mf-manifest.json';

type MountModule = { default: () => Promise<void> };

async function start() {
  registerRemotes([{ name: MAIN_NAME, entry: MAIN_ENTRY }]);

  const mounted = await loadRemote<MountModule>(`${MAIN_NAME}/mount`);

  if (!mounted) {
    throw new Error(`${MAIN_NAME}/mount не найден в ${MAIN_ENTRY}`);
  }

  await mounted.default();
}

start().catch((error) => {
  console.error('mf-host: не удалось запустить mf-main', error);

  const container = document.getElementById('root');

  if (container) {
    container.textContent = `mf-main недоступен: ${String(error)}`;
  }
});
