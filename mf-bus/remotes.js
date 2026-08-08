/**
 * Реестр remote — единственное место, где живут их реальные адреса.
 *
 * `prefix` + `target` используются для прокси, `module` и `title` уезжают
 * в браузер через GET /api/remotes. Хост не знает про remote ничего заранее:
 * он спрашивает этот список в рантайме и грузит то, что пришло.
 *
 * Записи без `module` проксируются, но хосту не отдаются — их подключает
 * не он, а другой remote (так mf-remote подключает mf-remote-1).
 */
export const REMOTES = [
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
    ({ name, prefix, module, title }) => ({
      name,
      entry: `${prefix}/mf-manifest.json`,
      module,
      title,
    }),
  );
}
