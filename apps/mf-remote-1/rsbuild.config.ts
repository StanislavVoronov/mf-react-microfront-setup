import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const PORT = 5004;

// Базовый путь, под которым этот remote виден потребителю.
// Абсолютного адреса нет: /mf-remote-1/ проксируется сюда.
const BASE = '/mf-remote-1';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'mf_remote_1',
      exposes: {
        './Widget': './src/Widget.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react/': { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react-dom/': { singleton: true, requiredVersion: false },
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
