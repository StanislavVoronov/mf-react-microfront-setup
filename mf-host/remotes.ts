/**
 * Реестр remote для dev-сервера mf-host.
 *
 * Живёт рядом с конфигом, а не в src: это инфраструктура, а не код
 * приложения. Приложение узнаёт список только из GET /api/remotes.
 *
 * Записи без `module` проксируются, но хосту не отдаются — их подключает
 * не он, а другой remote (так mf-remote подключает mf-remote-1).
 */
export type RemoteEntry = {
  name: string;
  prefix: string;
  target: string;
  module?: string;
  title?: string;
};

export const REMOTES: RemoteEntry[] = [
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

/** То, что отдаётся приложению: только подключаемые им контейнеры. */
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
