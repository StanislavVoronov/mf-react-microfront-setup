/**
 * Описание одного remote.
 *
 * Контейнеры не известны на этапе сборки: ни в rsbuild.config.ts, ни в JSX
 * их нет. Список приходит в рантайме от mf-bus.
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
  /**
   * Рендерить ли модуль на верхнем уровне приложения.
   *
   * `false` — контейнер только регистрируется и прогревается, а рисует его
   * кто-то другой. Так подключён mf-remote-1: его рендерит mf-remote, но
   * попасть в реестр он обязан, иначе прогрев случится позже react-dom
   * и HMR вложенного remote перестанет применяться.
   *
   * Не указан — считаем `true`.
   */
  render?: boolean;
};

export const REMOTES_URL = '/api/remotes';

/** Только те, что приложение показывает само. */
export function renderable(
  remotes: RemoteDescriptor[],
): RemoteDescriptor[] {
  return remotes.filter((remote) => remote.render !== false);
}

/**
 * Возвращает список доступных remote.
 *
 * Без React-импортов: функцию тянет точка входа, а любой синхронный
 * shared-модуль в entry ломает Module Federation.
 */
export async function fetchRemotes(): Promise<RemoteDescriptor[]> {
  const response = await fetch(REMOTES_URL);

  if (!response.ok) {
    throw new Error(`${REMOTES_URL} ответил ${response.status}`);
  }

  return (await response.json()) as RemoteDescriptor[];
}
