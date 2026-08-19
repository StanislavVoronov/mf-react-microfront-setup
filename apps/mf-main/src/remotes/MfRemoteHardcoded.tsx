import {
  registerRemotes,
  loadRemote,
} from '@module-federation/enhanced/runtime';
import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { RemoteBoundary } from '../RemoteBoundary';



// Голый const вместо ленивого useState: модуль вычисляется один раз, значит
// и lazy-компонент создаётся один раз — пересоздавать его на каждом рендере
// нечему. Цена — перевычисление самого модуля: HMR этого файла даёт новый
// lazy, и remote монтируется заново, теряя своё состояние.
const MfRemoteApp = lazy(async () => {
  /**
 * Тот же remote, но зашитый в код.
 *
 * Реестр здесь ни при чём: имя контейнера, путь до манифеста и ключ из
 * `exposes` известны на этапе сборки, поэтому регистрация и `lazy()` живут
 * на уровне модуля, а не в рендере.
 */
const NAME = 'mf_remote';
const ENTRY = '/mf-remote/mf-manifest.json';
const MODULE_ID = `${NAME}/App`;

registerRemotes([{ name: NAME, entry: ENTRY }]);

  const loaded = await loadRemote<{ default: ComponentType }>(MODULE_ID);

  if (!loaded) {
    throw new Error(`${MODULE_ID} не найден в ${ENTRY}`);
  }

  return loaded;
});

/** Рендерит mf_remote/App без описания из реестра. */
export function MfRemoteHardcoded() {
  return (
    <RemoteBoundary name={'test'}>
      <Suspense fallback={<p className="host__status">Загружаю test…</p>}>
        <MfRemoteApp />
      </Suspense>
    </RemoteBoundary>
  );
}
