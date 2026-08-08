import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

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
      // remotes здесь не объявляем: контейнер регистрируется в рантайме
      // через registerRemotes() — см. src/App.tsx.
      remotes: {},
      // Хост — поставщик React для всех remote. Слэш в конце даёт
      // префиксный шеринг (react/jsx-runtime, react-dom/client).
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react/': { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react-dom/': { singleton: true, requiredVersion: false },
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
    proxy: {
      '/mf-remote-1/': {
        target: 'http://localhost:5004',
        ws: true,
      },
      '/mf-remote-2/': {
        target: 'http://localhost:5005',
        ws: true,
      },
      '/mf-remote/': {
        target: 'http://localhost:5001',
        ws: true,
      },
    },
  },

  output: {
    // Сборку раздаёт mf-bus с корня.
    assetPrefix: '/',
  },
});
