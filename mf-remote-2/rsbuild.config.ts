import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const PORT = 5005;

// Базовый путь, под которым этот remote виден потребителю.
// Абсолютного адреса нет: /mf-remote-2/ проксируется сюда.
const BASE = '/mf-remote-2';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'mf_remote_2',
      exposes: {
        './Weather': './src/Weather.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react/': { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react-dom/': { singleton: true, requiredVersion: false },
        // Хост про react-query не знает и не поставляет его — этот remote
        // приносит библиотеку с собой. singleton нужен на случай, если
        // react-query появится и у другого участника: два инстанса
        // QueryClient-контекста не увидят друг друга.
        '@tanstack/react-query': { singleton: true, requiredVersion: false },
      },
      dts: false,
    }),
  ],

  source: {
    entry: {
      index: './src/index.ts',
    },
  },

  tools: {
    htmlPlugin: false,
  },

  dev: {
    assetPrefix: `${BASE}/`,
    client: {
      path: `${BASE}/rsbuild-hmr`,
    },
  },

  server: {
    port: PORT,
    strictPort: true,
    base: BASE,
    cors: { origin: '*' },
  },

  output: {
    assetPrefix: `${BASE}/`,
  },
});
