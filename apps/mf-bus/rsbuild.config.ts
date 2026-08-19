import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { REMOTES, STUBS } from './src/remotes.ts';

const PORT = 5003;

// Папка со статикой. Сюда собираются контейнеры: mf-main пишет себя
// в public/mf-main (output.distPath в его конфиге), и оболочка забирает
// оттуда mf-manifest.json для инициализации mf_main. Раздаёт её dev-сервер
// rsbuild сам, с корня.
const PUBLIC_DIR = 'public';

// Прокси — только для тех, у кого объявлен target. Остальные раздаются
// собранными из public (см. RemoteConfig.target).
//
// Пути не переписываем: каждый remote отдаёт себя под тем же префиксом
// (server.base в его конфиге). Слэш на конце обязателен, иначе /mf-remote/
// перехватывал бы и /mf-remote-1/. ws: true — через этот же прокси могут
// идти HMR-сокеты.
const proxy = Object.fromEntries(
  REMOTES.filter(({ target }) => target).map(({ prefix, target }) => [
    `${prefix}/`,
    { target, ws: true },
  ]),
);

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'mf_bus',
      remotes: {},
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react/': { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react-dom/': { singleton: true, requiredVersion: false },
      },
      dts: false,
    }),
  ],

  html: {
    title: 'mf-bus',
  },

  server: {
    port: PORT,
    strictPort: true,

    publicDir: {
      name: PUBLIC_DIR,
      // Пересобрали mf-main — страница перезагрузится сама.
      watch: true,
    },

    proxy,

    // Реестр модулей. Единственное, ради чего раньше держался отдельный
    // express-сервер: адреса remote описаны в src/remotes.ts один раз,
    // оттуда же строится и прокси выше.
    setup: ({ server }) => {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/remotes') {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(STUBS));
      });
    },
  },

  output: {
    assetPrefix: '/',
  },
});
