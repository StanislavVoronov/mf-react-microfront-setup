import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const PORT = 5006;

// Базовый путь, под которым этот remote виден потребителю.
// Абсолютного адреса нет: /mf-main/ проксируется сюда.
const BASE = '/mf-main';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'mf_main',
      exposes: {
        // Точка монтирования приложения. Хост зовёт её без аргументов;
        // и DOM-узел, и createRoot живут здесь, а не в хосте.
        './mount': './src/mount.ts',
      },
      // main — поставщик React для остальных remote: хост про React не знает
      // вообще. Слэш в конце даёт префиксный шеринг (react/jsx-runtime,
      // react-dom/client).
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react/': { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react-dom/': { singleton: true, requiredVersion: false },
      },
      dts: false,
    }),
  ],

  // Единственная точка входа нужна только сборщику: приложение не монтирует
  // себя само, его запускает хост через exposes './mount'.
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
    // Ленивая компиляция динамических импортов (по умолчанию включена)
    // просит dev-сервер дособрать чанк по своему служебному пути, который
    // не проходит через прокси потребителя, — получаем HTTP 404.
    // Здесь ./render грузится динамически, поэтому выключаем.
    lazyCompilation: false,
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
