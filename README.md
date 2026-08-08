# mf-react-microfront-setup

Module Federation 2.0 + Rsbuild + React. Пять независимых папок, у каждой свой
`package.json` и `node_modules`.

| Папка         | Что это                                                        | Порт |
| ------------- | -------------------------------------------------------------- | ---- |
| `mf-remote`   | MF 2.0 remote; сам является host для `mf-remote-1`              | 5001 |
| `mf-host`     | Host, `createRoot`, автогенерация `index.html`                  | 5002 |
| `mf-bus`      | express: раздаёт сборку `mf-host` и проксирует remote           | 5003 |
| `mf-remote-1` | Вложенный remote, его грузит `mf-remote`                        | 5004 |
| `mf-remote-2` | Remote с TanStack Query и прогнозом погоды по 10 городам        | 5005 |

Порты зашиты в конфиги, `strictPort: true` — молча съехать на соседний нельзя.

```
mf-host
  ├── mf-remote        →  mf-remote-1
  └── mf-remote-2
```

## Установка

```bash
for d in mf-remote mf-remote-1 mf-remote-2 mf-host mf-bus; do (cd $d && npm install); done
```

## Сценарий 1: разработка remote, хост раздаётся из mf-bus

`mf-bus` отдаёт **собранный** `mf-host`, а правки в любом remote прилетают на
страницу без перезагрузки.

```bash
cd mf-remote   && npm run dev   # терминал 1
cd mf-remote-1 && npm run dev   # терминал 2
cd mf-remote-2 && npm run dev   # терминал 3
cd mf-bus      && npm run dev   # терминал 4: собрать хост и поднять раздачу
```

Открыть <http://localhost:5003>. Пересобирать хост нужно только при правках
самого хоста.

## Сценарий 2: обычная разработка хоста

Всё то же самое, но вместо `mf-bus` — `cd mf-host && npm run dev` на 5002.

## Сценарий 3: production

```bash
cd mf-remote-1 && npm run build && npm run preview
cd mf-remote-2 && npm run build && npm run preview
cd mf-remote   && npm run build && npm run preview
cd mf-host     && npm run build
cd mf-bus      && npm start
```

## Как это устроено

### Remote — не приложения

У `mf-remote`, `mf-remote-1` и `mf-remote-2` нет `index.html`
(`tools.htmlPlugin: false`) и нет `createRoot`. `src/index.ts` — пустой
технический entry для сборщика. Наружу торчит только то, что перечислено
в `exposes`. По корню их порта отдаётся 404 — это контейнеры, а не страницы.

### Один remote — один модуль-загрузчик и один компонент

```
mf-host/src/remotes/
  mfRemote.ts            registerRemotes + loadApp
  mfRemote2.ts           registerRemotes + loadWeather
  MfRemoteApp.tsx        компонент: lazy + Suspense + RemoteBoundary
  MfRemote2Weather.tsx   компонент
```

Загрузчики лежат в `.ts` **без React-импортов** — их тянет точка входа,
а любой синхронный shared-модуль в entry ломает Module Federation.
`lazy()` живёт внутри компонента через ленивый инициализатор `useState`:
голый `const` в теле пересоздавал бы компонент на каждом рендере и
перемонтировал remote.

### Адресов remote в коде нет — только прокси

В коде лежат относительные пути (`/mf-remote/mf-manifest.json`). Реальные адреса
живут в двух местах: `server.proxy` у dev-сервера `mf-host` и `REMOTES`
в [mf-bus/server.js](mf-bus/server.js). Каждый remote отдаёт себя под тем же
префиксом (`server.base` в его конфиге), поэтому прокси работает без
`pathRewrite`.

Регистрация контейнеров — в рантайме, `remotes` в конфигах пустые:

```ts
registerRemotes([{ name: NAME, entry: ENTRY }]);
const module = await loadRemote(`${NAME}/App`);
```

### HMR-сокеты идут напрямую на dev-серверы remote

Через прокси ходят только HTTP-запросы. Сокет HMR браузер открывает прямо на
`ws://localhost:5001` и далее: `dev.client.port` конфигом пустым не оставить —
rsbuild подставляет туда порт собственного dev-сервера. WebSocket не ограничен
CORS, поэтому это работает.

Прокси всё равно подняты с `ws: true`. Если понадобится увести и сокеты в одну
точку входа (remote в docker-сети, за firewall, на https), это делается
резолвером `dev.client.webSocketUrlResolver`, который подменяет origin
на адрес страницы.

### Порядок загрузки решает всё

react-refresh должен встать в глобальный хук React **раньше**, чем React DOM
зарегистрирует рендерер. Иначе HMR вырождается в перезагрузку страницы. Отсюда
два места:

- [mf-host/src/index.tsx](mf-host/src/index.tsx) поднимает контейнеры и только
  потом динамически импортирует `./bootstrap` с `createRoot`. Динамический
  импорт — ещё и обязательная для Module Federation асинхронная граница.
- [mf-remote/src/App.tsx](mf-remote/src/App.tsx) поднимает вложенный контейнер
  через top-level `await`. Хост ждёт этот await, потому что грузит
  `mf_remote/App` через `loadRemote()`.

Контейнеры поднимаются **последовательно**, а не через `Promise.all`: при
параллельной инициализации они гонятся за share scope, и второй remote успевает
подтянуть собственную копию React вместо общей — падает на
`Cannot read properties of null (reading 'useState')`.

### React шарится с префиксом

В `shared` перечислены `react`, `react/`, `react-dom`, `react-dom/`. Слэш на
конце добавляет к singleton'у `react/jsx-runtime` и `react-dom/client` — без
этого remote утащит свою копию внутренностей React и сломает хуки.

`mf-remote-2` дополнительно шарит `@tanstack/react-query` и приносит свой
`QueryClient`: он самодостаточен и не рассчитывает, что провайдер даст хост.

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
