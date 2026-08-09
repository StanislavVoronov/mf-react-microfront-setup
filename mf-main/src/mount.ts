import { registerRemoteContainers } from './remotes/loadRemoteModule';
import { fetchRemotes } from './remotes/registry';

/**
 * Точка монтирования приложения.
 *
 * Хост знает только про этот контейнер: он грузит `mf_main/mount` и зовёт его
 * без аргументов. Всё остальное — DOM-узел, React, реестр остальных remote,
 * react-query — живёт здесь.
 *
 * Здесь намеренно нет React-импортов, и порядок шагов важен: регистрация
 * контейнеров должна отработать раньше, чем выполнится react-dom. Проверено,
 * что при обратном порядке HMR remote перестаёт применяться — правка доезжает
 * только после ручной перезагрузки. Поэтому ./render с createRoot грузится
 * динамически, последним шагом.
 */
export default async function mount(): Promise<void> {
  const remotes = await fetchRemotes().catch(() => []);

  registerRemoteContainers(remotes);

  const { render } = await import('./render');

  render();
}
