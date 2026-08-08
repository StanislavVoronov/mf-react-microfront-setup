/**
 * Описание одного remote.
 *
 * Хост не знает контейнеры на этапе сборки: ни в rsbuild.config.ts, ни в JSX
 * их нет. Список приходит в рантайме — сейчас из заглушки ниже.
 */
export type RemoteDescriptor = {
  /** Имя контейнера, совпадает с `name` в конфиге remote. */
  name: string;
  /** Относительный путь до манифеста, проксируется на dev-сервер remote. */
  entry: string;
  /** Ключ из `exposes` без ведущего './'. */
  module: string;
  /** Подпись для UI. */
  title?: string;
};

export const REMOTES_URL = '/api/remotes';

/** Заглушка вместо ответа сервера. */
const STUB: RemoteDescriptor[] = [
  {
    name: 'mf_remote',
    entry: '/mf-remote/mf-manifest.json',
    module: 'App',
    title: 'mf-remote',
  },
  {
    name: 'mf_remote_2',
    entry: '/mf-remote-2/mf-manifest.json',
    module: 'Weather',
    title: 'Погода',
  },
];

/**
 * Возвращает список доступных remote.
 *
 * Пока это заглушка. Реальный эндпоинт уже есть и отдаёт ровно такой же JSON:
 * в разработке его поднимает dev-сервер mf-host через `server.setup`,
 * в проде — mf-bus. Чтобы переключиться, достаточно вернуть тело функции:
 *
 * ```ts
 * const response = await fetch(REMOTES_URL, { signal });
 * if (!response.ok) throw new Error(`${REMOTES_URL} ответил ${response.status}`);
 * return (await response.json()) as RemoteDescriptor[];
 * ```
 *
 * Без React-импортов: функцию тянет точка входа, а любой синхронный
 * shared-модуль в entry ломает Module Federation.
 */
export async function fetchRemotes(
  _signal?: AbortSignal,
): Promise<RemoteDescriptor[]> {
  return STUB;
}
