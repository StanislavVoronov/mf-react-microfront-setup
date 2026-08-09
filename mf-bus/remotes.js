/**
 * Реестр remote — единственное место, где живут их реальные адреса.
 *
 * `prefix` + `target` используются для прокси, `module` и `title` уезжают
 * в браузер через GET /api/remotes. Хост не знает про remote ничего заранее:
 * он спрашивает этот список в рантайме и грузит то, что пришло.
 *
 * Записи без `module` только проксируются. Запись с `render: false` уезжает
 * в браузер, но приложение её не рисует — контейнер нужен лишь для
 * регистрации и прогрева, а рендерит его другой remote.
 */
export const REMOTES = [
  {
    name: 'mf_main',
    prefix: '/mf-main',
    target: 'http://localhost:5006',
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
    // Рисует его mf-remote. В реестр попадает ради регистрации и прогрева:
    // без этого прогрев случился бы позже react-dom и HMR вложенного remote
    // перестал бы применяться.
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

/** То, что отдаётся хосту: только подключаемые им контейнеры. */
export function hostRemotes() {
  return REMOTES.filter((remote) => remote.module).map(
    ({ name, prefix, module, title, render }) => ({
      name,
      entry: `${prefix}/mf-manifest.json`,
      module,
      title,
      ...(render === false ? { render } : {}),
    }),
  );
}
