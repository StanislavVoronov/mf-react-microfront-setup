# mf-react-microfront-setup

Module Federation 2.0 + Rsbuild + React. Пять независимых папок, у каждой свой
`package.json` и `node_modules`.

| Папка         | Что это                                                        | Порт |
| ------------- | -------------------------------------------------------------- | ---- |
| `mf-remote`   | MF 2.0 remote со счётчиком                                      | 5001 |
| `mf-host`     | Host, `createRoot`, автогенерация `index.html`                  | 5002 |
| `mf-bus`      | express: раздаёт сборку `mf-host` и проксирует remote           | 5003 |
| `mf-remote-1` | Remote-виджет; сейчас никем не подключён, порт занят под него   | 5004 |
| `mf-remote-2` | Remote с TanStack Query и прогнозом погоды по 10 городам        | 5005 |

Порты зашиты в конфиги, `strictPort: true` — молча съехать на соседний нельзя.

```
mf-host
  ├── mf-remote
  └── mf-remote-2
```

Оба контейнера подключает хост, вложенности сейчас нет.

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

### Хост не знает remote заранее

Список приходит в рантайме. Сейчас его отдаёт заглушка в
[registry.ts](mf-host/src/remotes/registry.ts); готовый эндпоинт
`GET /api/remotes` с ровно таким же JSON есть у `mf-bus`. Переключение —
одна функция. Ни в `rsbuild.config.ts`, ни в JSX имён контейнеров нет.

```json
[
  { "name": "mf_remote",   "entry": "/mf-remote/mf-manifest.json",   "module": "App",     "title": "mf-remote" },
  { "name": "mf_remote_2", "entry": "/mf-remote-2/mf-manifest.json", "module": "Weather", "title": "Погода" }
]
```

На стороне `mf-bus` реестр живёт в [mf-bus/remotes.js](mf-bus/remotes.js) —
из него же строится прокси, так что адрес remote описан там один раз. Записи
без `module` проксируются, но хосту не отдаются — так сейчас лежит
`mf-remote-1`: его dev-сервер доступен, но подключать его некому.

У dev-сервера `mf-host` эндпоинта нет: там только `server.proxy`
в [rsbuild.config.ts](mf-host/rsbuild.config.ts), а список берётся из заглушки.

```
mf-host/src/remotes/
  registry.ts          тип RemoteDescriptor + fetchRemotes()
  loadRemoteModule.ts  универсальный загрузчик по параметрам
  RemoteModule.tsx     компонент: lazy + Suspense + RemoteBoundary
```

Загрузчик ничего не знает про конкретные remote:

```ts
const Component = lazy(() => loadRemoteModule({ name, entry, module }));
```

Он регистрирует контейнер один раз на имя и достаёт из него `${name}/${module}`.
Список в UI тянет TanStack Query — ему принадлежит состояние загрузки, ошибок
и кнопка «Повторить».

`registry.ts` и `loadRemoteModule.ts` лежат в `.ts` **без React-импортов** — их
тянет точка входа, а любой синхронный shared-модуль в entry ломает Module
Federation. `lazy()` живёт внутри компонента через ленивый инициализатор
`useState`: голый `const` в теле пересоздавал бы компонент на каждом рендере
и перемонтировал remote.

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

### Регистрировать контейнеры нужно в точке входа

[mf-host/src/index.tsx](mf-host/src/index.tsx) получает реестр, регистрирует
контейнеры и только потом динамически импортирует `./bootstrap` с `createRoot`.
Динамический импорт — обязательная для Module Federation асинхронная граница:
shared-модули резолвятся асинхронно.

`registerRemotes` ничего не грузит, это запись в реестре. Сами контейнеры
поднимаются позже, когда React отрендерит соответствующий `lazy`-компонент —
предварительно тянуть их не нужно, HMR работает и так (проверено на обоих
remote).

А вот регистрацию **обязательно** делать в entry, а не лениво перед
`loadRemote`. Если положиться на ленивую регистрацию в момент рендера,
приложение соберётся и отрисуется, но HMR обоих remote перестанет применяться:
правка доезжает только после ручной перезагрузки. Воспроизводится стабильно.

Реестр берётся через `queryClient.fetchQuery` из
[queryClient.ts](mf-host/src/queryClient.ts): клиент создан из
`@tanstack/query-core` — это ядро TanStack Query **без React**, поэтому его
можно импортировать в entry. Результат оседает в кэше, и `useQuery` в UI
отрисует его сразу, без второго запроса.

По той же причине `@tanstack/query-core` не попал в `shared`: точка входа
импортирует его синхронно, а синхронный shared-модуль в entry ломает
асинхронную границу (`loadShareSync failed`). Ядро приезжает внутри
shared-копии `@tanstack/react-query`, так что инстанс всё равно один.

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
  dev-серверами remote.
- `npm run build` — обычная production-сборка, работает с production-сборками
  remote.
