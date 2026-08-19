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
        // mf-main отдаёт только React-компонент приложения. createRoot живёт
        // в host/bus, которые предварительно регистрируют контейнеры.
        '.': './src/App.tsx',
      },
      // Слэш в конце даёт префиксный шеринг (react/jsx-runtime,
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
  // себя само, его запускает host/bus через exposes '.'.
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
    // Держим поведение dev-сборки предсказуемым при загрузке через прокси
    // mf-host/mf-bus.
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
    // Собранный контейнер кладём прямо в статику mf-bus. Оттуда же оболочка
    // забирает mf-manifest.json для инициализации mf_main, поэтому копировать
    // сборку куда-то ещё не нужно, а dev-сервер на 5006 становится
    // необязательным: путь /mf-main/ в браузере не меняется.
    distPath: {
      root: `../mf-bus/public${BASE}`,
    },
  },
});
