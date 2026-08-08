/**
 * Описание одного remote, каким его отдаёт сервер.
 *
 * Хост не знает контейнеры заранее: ни в rsbuild.config.ts, ни в коде их нет.
 * Список приходит в рантайме из GET /api/remotes — в разработке его отдаёт
 * dev-сервер mf-host, в проде mf-bus.
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

/**
 * Без React-импортов: функцию тянет точка входа, а любой синхронный
 * shared-модуль в entry ломает Module Federation.
 */
export async function fetchRemotes(
  signal?: AbortSignal,
): Promise<RemoteDescriptor[]> {
  const response = await fetch(REMOTES_URL, { signal });

  if (!response.ok) {
    throw new Error(`${REMOTES_URL} ответил ${response.status}`);
  }

  return (await response.json()) as RemoteDescriptor[];
}
