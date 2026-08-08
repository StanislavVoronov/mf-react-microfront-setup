# mf-new

Четыре независимые папки (у каждой свой `package.json` и `node_modules`):

| Папка         | Что это                                                           | Порт |
| ------------- | ----------------------------------------------------------------- | ---- |
| `mf-remote`   | MF 2.0 remote на Rsbuild + React; сам является host для `mf-remote-1` | 5001 |
| `mf-host`     | Host на Rsbuild + React, `createRoot`, автогенерация `index.html`  | 5002 |
| `mf-bus`      | Обычный express-сервер: раздаёт сборку `mf-host` и проксирует remote | 5003 |
| `mf-remote-1` | Вложенный MF 2.0 remote, его грузит `mf-remote`                    | 5004 |

Порты зашиты в конфиги, `strictPort: true` — молча съехать на соседний они не могут.

Цепочка вложенная:

```
mf-host  →  mf-remote  →  mf-remote-1
```

## Установка

```bash
cd mf-remote   && npm install
cd ../mf-remote-1 && npm install
cd ../mf-host  && npm install
cd ../mf-bus   && npm install
```

## Сценарий 1: разработка remote, хост раздаётся из mf-bus

`mf-bus` отдаёт **собранный** `mf-host`, а правки в любом из remote прилетают
на страницу без перезагрузки.

```bash
# терминал 1
cd mf-remote && npm run dev

# терминал 2
cd mf-remote-1 && npm run dev

# терминал 3 — собрать хост и поднять раздачу
cd mf-bus && npm run dev
```

Открыть <http://localhost:5003>, поправить `mf-remote/src/App.tsx` или
`mf-remote-1/src/Widget.tsx` — блок меняется, счётчики не сбрасываются.

Пересобирать хост нужно только при правках самого хоста.

## Сценарий 2: обычная разработка хоста

```bash
cd mf-remote   && npm run dev   # 5001
cd mf-remote-1 && npm run dev   # 5004
cd mf-host     && npm run dev   # 5002
```

## Сценарий 3: production

```bash
cd mf-remote-1 && npm run build && npm run preview
cd mf-remote   && npm run build && npm run preview
cd mf-host     && npm run build
cd mf-bus      && npm start
```

## Как это устроено

### Remote — не приложения

У `mf-remote` и `mf-remote-1` нет `index.html` (`tools.htmlPlugin: false`) и нет
`createRoot`. `src/index.ts` — пустой технический entry для сборщика. Наружу
торчит только то, что перечислено в `exposes`. По корню их порта отдаётся 404 —
это контейнеры, а не страницы.

### Адресов remote в коде нет — только прокси

В коде хоста и remote лежат относительные пути:

```ts
// mf-host/src/remote.ts
export const REMOTE_ENTRY = '/mf-remote/mf-manifest.json';

// mf-remote/src/remote1.ts
export const REMOTE_1_ENTRY = '/mf-remote-1/mf-manifest.json';
```

Реальные адреса живут в двух местах — в `server.proxy` у dev-сервера
`mf-host` и в `REMOTES` у [mf-bus/server.js](mf-bus/server.js). Каждый remote
отдаёт себя под тем же префиксом (`server.base` в его конфиге), поэтому прокси
работает без `pathRewrite`.

Регистрация контейнеров — в рантайме, `remotes` в конфигах пустые:

```ts
registerRemotes([{ name: REMOTE_NAME, entry: REMOTE_ENTRY }]);
const module = await loadRemote(`${REMOTE_NAME}/App`);
```

### HMR-сокеты идут напрямую на dev-серверы remote

Через прокси ходят только HTTP-запросы (манифест, чанки, hot-update). Сокет
HMR браузер открывает прямо на `ws://localhost:5001` / `ws://localhost:5004`:
`dev.client.port` конфигом пустым не оставить — rsbuild подставляет туда порт
собственного dev-сервера. WebSocket не ограничен CORS, поэтому это работает.

Прокси всё равно подняты с `ws: true` — если понадобится увести и сокеты в
одну точку входа (remote в docker-сети, за firewall, на https), это делается
резолвером `dev.client.webSocketUrlResolver`, который подменяет origin
на адрес страницы.

### Порядок загрузки решает всё

react-refresh должен встать в глобальный хук React **раньше**, чем React DOM
зарегистрирует рендерер. Иначе HMR вырождается в перезагрузку страницы. Отсюда
два места:

- [mf-host/src/index.tsx](mf-host/src/index.tsx) поднимает контейнер `mf-remote`
  и только потом динамически импортирует `./bootstrap` с `createRoot`.
  Динамический импорт — ещё и обязательная для Module Federation асинхронная
  граница: shared-модули резолвятся асинхронно.
- [mf-remote/src/App.tsx](mf-remote/src/App.tsx) поднимает контейнер
  `mf-remote-1` через top-level `await`. Хост ждёт этот await, потому что грузит
  `mf_remote/App` через `loadRemote()` — так вложенный remote успевает
  инициализироваться до `react-dom`.

### React шарится с префиксом

В `shared` перечислены `react`, `react/`, `react-dom`, `react-dom/`. Слэш на
конце добавляет к singleton'у `react/jsx-runtime` и `react-dom/client` — без
этого remote утащит свою копию внутренностей React и сломает хуки.

## Ограничение: dev-remote требует dev-сборки хоста

Fast Refresh работает только с development-сборкой `react-dom`, а её на страницу
поставляет хост как владелец singleton'а. Поэтому связка «production-сборка
хоста + dev-сервер remote» не заводится: dev-код remote дёргает
`react/jsx-dev-runtime`, несовместимый с production-внутренностями React
(`dispatcher.getOwner is not a function`).

Отсюда два режима сборки хоста:

- `npm run build:dev` — development-сборка для раздачи из `mf-bus` рядом с
  dev-серверами remote. Fast Refresh в самом хосте выключен
  (`MF_STATIC_BUILD=true`): dev-сервера у хоста нет, и без него вызовы
  `$RefreshReg$` остались бы без рантайма.
- `npm run build` — обычная production-сборка, работает с production-сборками
  remote.
