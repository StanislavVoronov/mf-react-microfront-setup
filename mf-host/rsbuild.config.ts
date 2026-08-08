import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const PORT = 5002;

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'mf_host',
      // remotes здесь не объявляем: контейнеры регистрируются в рантайме,
      // а их список приходит из src/remotes/registry.ts.
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
      '/mf-remote/': { target: 'http://localhost:5001', ws: true },
      '/mf-remote-1/': { target: 'http://localhost:5004', ws: true },
      '/mf-remote-2/': { target: 'http://localhost:5005', ws: true },
    },
  },

  output: {
    // Сборку раздаёт mf-bus с корня.
    assetPrefix: '/',
  },
});
