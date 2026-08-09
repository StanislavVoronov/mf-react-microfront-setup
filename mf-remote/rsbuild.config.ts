import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const PORT = 5001;

// Базовый путь, под которым этот remote виден потребителю. Абсолютного адреса
// нет нигде: и dev-сервер mf-host, и mf-bus проксируют /mf-remote/ сюда,
// поэтому все URL остаются относительными к origin страницы.
const BASE = '/mf-remote';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'mf_remote',
      // Имена файлов контейнера не фиксируем: потребитель читает их
      // из mf-manifest.json.
      exposes: {
        './App': './src/App.tsx',
      },
      // Слэш в конце — префиксный шеринг: под общий singleton попадают
      // и react/jsx-runtime, и react-dom/client. Без него remote утащит
      // свою копию внутренностей React и сломает хуки.
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react/': { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react-dom/': { singleton: true, requiredVersion: false },
      },
      // Типы отдаём через обычный .d.ts в хосте, генератор типов не нужен.
      dts: false,
    }),
  ],

  // Единственная точка входа нужна только сборщику: это не приложение,
  // здесь нет ни index.html, ни createRoot. В браузер уезжает контейнер.
  source: {
    entry: {
      index: './src/index.ts',
    },
  },

  // HTML не генерируем — remote не является самостоятельной страницей.
  tools: {
    htmlPlugin: false,
  },

  dev: {
    assetPrefix: `${BASE}/`,
  },

  server: {
    port: PORT,
    // Порт зашит в прокси потребителей — молча съезжать на соседний нельзя.
    strictPort: true,
    // Dev-сервер отдаёт всё под тем же префиксом, что и прокси, поэтому
    // переписывать путь в прокси не нужно.
    base: BASE,
    cors: { origin: '*' },
  },

  output: {
    assetPrefix: `${BASE}/`,
  },
});
