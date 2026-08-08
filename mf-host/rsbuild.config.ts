import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { REMOTES, hostRemotes } from './remotes';

const PORT = 5002;

// Сборка под раздачу из mf-bus (npm run build:dev). Dev-сервера при этом нет,
// поэтому Fast Refresh в самом хосте не нужен — иначе в бандл попадут вызовы
// $RefreshReg$ без рантайма, который их определяет.
const STATIC_BUILD = process.env.MF_STATIC_BUILD === 'true';

export default defineConfig({
  plugins: [
    pluginReact({ fastRefresh: !STATIC_BUILD }),
    pluginModuleFederation({
      name: 'mf_host',
      // remotes здесь не объявляем: контейнеры регистрируются в рантайме,
      // а их список приходит из GET /api/remotes.
      remotes: {},
      // Хост — поставщик React для всех remote. Слэш в конце даёт
      // префиксный шеринг (react/jsx-runtime, react-dom/client).
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react/': { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react-dom/': { singleton: true, requiredVersion: false },
        // Хост сам ходит в react-query за списком remote, поэтому шарит его
        // дальше: mf-remote-2 получит тот же инстанс, а не свою копию.
        //
        // @tanstack/query-core намеренно НЕ шарится: точка входа импортирует
        // его синхронно (там создаётся QueryClient), а синхронный shared-модуль
        // в entry ломает асинхронную границу — loadShareSync failed.
        // Ядро приезжает внутри shared-копии react-query, инстанс всё равно один.
        '@tanstack/react-query': { singleton: true, requiredVersion: false },
      },
      dts: false,
    }),
  ],

  // index.html генерирует сам Rsbuild (дефолтный шаблон уже содержит #root).
  html: {
    title: 'mf-host',
  },

  server: {
    port: PORT,
    strictPort: true,
    // Единственное место, где живут реальные адреса remote. В коде хоста
    // только относительные пути, поэтому его сборка ни к чему не привязана.
    // ws: true — через этот же прокси идут HMR-сокеты remote.
    // Пути не переписываем: remote сами живут под своим server.base.
    proxy: Object.fromEntries(
      REMOTES.map(({ prefix, target }) => [
        `${prefix}/`,
        { target, ws: true },
      ]),
    ),
    // В разработке реестр отдаёт dev-сервер, в проде — mf-bus.
    setup: ({ server }) => {
      server.middlewares.use('/api/remotes', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(hostRemotes()));
      });
    },
  },

  output: {
    // Сборку раздаёт mf-bus с корня.
    assetPrefix: '/',
  },
});
