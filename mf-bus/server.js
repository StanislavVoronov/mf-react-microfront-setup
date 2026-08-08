import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { REMOTES, hostRemotes } from './remotes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 5003);
const HOST_DIST = path.resolve(__dirname, '../mf-host/dist');

if (!fs.existsSync(HOST_DIST)) {
  console.error(
    `[mf-bus] Нет сборки хоста: ${HOST_DIST}\n` +
      '[mf-bus] Собери её командой: npm run build:host',
  );
  process.exit(1);
}

const app = express();

// Реестр remote для хоста. Хост не знает их заранее — спрашивает здесь.
app.get('/api/remotes', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(hostRemotes());
});

// Прокси на remote. Пути не переписываем: каждый remote отдаёт себя
// под тем же префиксом (server.base в его rsbuild.config.ts).
const proxies = REMOTES.map(({ prefix, target }) =>
  createProxyMiddleware({
    pathFilter: `${prefix}/**`,
    target,
    changeOrigin: true,
    // HMR-сокеты remote идут через этот же прокси.
    ws: true,
  }),
);

for (const proxy of proxies) {
  app.use(proxy);
}

// Статика собранного mf-host. HTML не кэшируем, чтобы после пересборки
// хоста браузер сразу получал новый набор чанков.
app.use(
  express.static(HOST_DIST, {
    index: 'index.html',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

// SPA-fallback.
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(HOST_DIST, 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`[mf-bus] Раздаю сборку mf-host: ${HOST_DIST}`);
  for (const { prefix, target } of REMOTES) {
    console.log(`[mf-bus] Проксирую ${prefix}/ → ${target}`);
  }
  console.log(`[mf-bus] Реестр remote: http://localhost:${PORT}/api/remotes`);
  console.log(`[mf-bus] http://localhost:${PORT}`);
});

// express не пробрасывает upgrade в middleware — вешаем вручную.
server.on('upgrade', (req, socket, head) => {
  for (const proxy of proxies) {
    proxy.upgrade?.(req, socket, head);
  }
});
