import { defineConfig } from '@rsbuild/core';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const PORT = 5002;

export default defineConfig({
  plugins: [
    // pluginReact не нужен: в хосте нет ни React, ни JSX. Он только
    // регистрирует контейнер mf_main и отдаёт ему DOM-узел.
    pluginModuleFederation({
      name: 'mf_host',
      // remotes здесь не объявляем: mf_main регистрируется в рантайме.
      remotes: {},
      // shared пустой: React поставляет mf-main, хост про него не знает.
      shared: {},
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
    // Единственное место, где живут реальные адреса remote. В коде только
    // относительные пути, поэтому сборка ни к чему не привязана.
    // ws: true — через этот же прокси идут HMR-сокеты remote.
    // Пути не переписываем: remote сами живут под своим server.base.
    proxy: {
      '/mf-main/': { target: 'http://localhost:5006', ws: true },
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
