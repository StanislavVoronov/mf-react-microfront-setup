export type RemoteConfig = {
  name: string;
  prefix: string;
  /**
   * Адрес dev-сервера контейнера.
   *
   * Он же переключатель режима. Есть `target` — mf-bus проксирует туда, то
   * есть контейнер живой и с HMR. Нет — контейнер берётся из `public/<prefix>`,
   * куда его кладёт собственная сборка, и процесс под него не нужен.
   *
   * Порядок именно такой: прокси в rsbuild отрабатывает раньше раздачи
   * `public`, поэтому объявленный `target` всегда перебивает собранную папку.
   */
  target?: string;
  module?: string;
  title?: string;
  render?: boolean;
};

export type RemoteStub = {
  name: string;
  entry: string;
  module: string;
  title?: string;
  render?: boolean;
};

export const REMOTES: RemoteConfig[] = [
  {
    name: 'mf_main',
    prefix: '/mf-main',
    // Без target: приложение раздаётся собранным, из mf-bus/public/mf-main.
    // Чтобы вернуться к живой правке mf-main, верните сюда
    // target: 'http://localhost:5006' и поднимите его dev-сервер.
  },
  {
    name: 'mf_remote',
    prefix: '/mf-remote',
    target: 'http://localhost:5001',
    module: 'App',
    title: 'mf-remote',
  },
  {
    name: 'mf_remote_1',
    prefix: '/mf-remote-1',
    target: 'http://localhost:5004',
    module: 'Widget',
    title: 'mf-remote-1',
    render: false,
  },
  {
    name: 'mf_remote_2',
    prefix: '/mf-remote-2',
    target: 'http://localhost:5005',
    module: 'Weather',
    title: 'Погода',
  },
];

export const STUBS: RemoteStub[] = REMOTES.filter(
  (remote): remote is RemoteConfig & { module: string } =>
    Boolean(remote.module),
).map(({ name, prefix, module, title, render }) => ({
    name,
    entry: `${prefix}/mf-manifest.json`,
    module,
    title,
    ...(render === false ? { render } : {}),
}));
