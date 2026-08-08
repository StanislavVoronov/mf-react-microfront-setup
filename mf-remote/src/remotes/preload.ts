import { loadWidget } from './mfRemote1';

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
  for (const load of [loadWidget]) {
    await load().catch(() => undefined);
  }
}
