# module-federation-react-dev-local-setup

Module Federation 2.0 + Rsbuild + React. Шесть независимых папок, у каждой свой
`package.json` и `node_modules`.

| Папка         | Что это                                                        | Порт |
| ------------- | -------------------------------------------------------------- | ---- |
| `mf-remote`   | Remote со счётчиком; сам подключает `mf-remote-1`               | 5001 |
| `mf-host`     | Тонкая оболочка: грузит `mf-main` и больше ничего не знает      | 5002 |
| `mf-bus`      | express: раздаёт сборку `mf-host` и проксирует remote           | 5003 |
| `mf-remote-1` | Remote-виджет, его рендерит `mf-remote`                         | 5004 |
| `mf-remote-2` | Remote с TanStack Query и прогнозом погоды по 10 городам        | 5005 |
| `mf-main`     | Само приложение: `createRoot`, реестр remote, react-query       | 5006 |

Порты зашиты в конфиги, `strictPort: true` — молча съехать на соседний нельзя.

```
mf-host (оболочка, только registerRemotes + loadRemote)
  └── mf-main (createRoot, реестр)
        ├── mf-remote  →  mf-remote-1
        └── mf-remote-2
```

Смысл разделения: `mf-host` собирается в статику один раз и дальше не нужен как
процесс. Живая разработка идёт в `mf-main` и remote — все они dev-серверы с HMR.
Хост трогается, только если меняется сама оболочка (30 строк, 364 kB против
1732 kB до разделения).

## Установка

```bash
for d in mf-remote mf-remote-1 mf-remote-2 mf-main mf-host mf-bus; do (cd $d && npm install); done
```

## Сценарий 1: разработка через mf-bus, хост выключен

`mf-bus` отдаёт **собранный** `mf-host`, а правки в `mf-main` и любом remote
прилетают на страницу без перезагрузки.

```bash
cd mf-remote   && npm run dev   # 5001
cd mf-remote-1 && npm run dev   # 5004
cd mf-remote-2 && npm run dev   # 5005
cd mf-main     && npm run dev   # 5006
cd mf-bus      && npm run dev   # 5003: собрать хост и поднять раздачу
```

Открыть <http://localhost:5003>. Dev-сервер `mf-host` при этом не нужен вообще.

## Сценарий 2: с dev-сервером хоста

Всё то же самое плюс `cd mf-host && npm run dev` на 5002 — пригодится, если
правится сама оболочка.

## Сценарий 3: production

```bash
cd mf-remote-1 && npm run build && npm run preview
cd mf-remote-2 && npm run build && npm run preview
cd mf-remote   && npm run build && npm run preview
cd mf-main     && npm run build && npm run preview
cd mf-host     && npm run build
cd mf-bus      && npm start
```

## Как это устроено

### Remote — не приложения

У `mf-remote`, `mf-remote-1` и `mf-remote-2` нет `index.html`
(`tools.htmlPlugin: false`) и нет `createRoot`. `src/index.ts` — пустой
технический entry для сборщика. Наружу торчит только то, что перечислено
в `exposes`. По корню их порта отдаётся 404 — это контейнеры, а не страницы.

### Хост — только оболочка

[mf-host/src/index.ts](mf-host/src/index.ts) целиком: зарегистрировать один
контейнер, загрузить `mf_main/mount` и вызвать его. Ни React, ни JSX, ни DOM,
ни знания про остальные remote — `pluginReact` и `shared` в его конфиге пустые.

```ts
registerRemotes([{ name: 'mf_main', entry: '/mf-main/mf-manifest.json' }]);
const mounted = await loadRemote('mf_main/mount');
await mounted.default();
```

`#root` ищет уже `mf-main` — контейнер ему не передаётся.

### Приложение не знает remote заранее

Список приходит в рантайме. Сейчас его отдаёт заглушка в
[mf-main/src/remotes/registry.ts](mf-main/src/remotes/registry.ts); готовый
эндпоинт `GET /api/remotes` с ровно таким же JSON есть у `mf-bus`.
Переключение — одна функция. Ни в `rsbuild.config.ts`, ни в JSX имён
контейнеров нет.

```json
[
  { "name": "mf_remote",   "entry": "/mf-remote/mf-manifest.json",   "module": "App",     "title": "mf-remote" },
  { "name": "mf_remote_1", "entry": "/mf-remote-1/mf-manifest.json", "module": "Widget",  "title": "mf-remote-1", "render": false },
  { "name": "mf_remote_2", "entry": "/mf-remote-2/mf-manifest.json", "module": "Weather", "title": "Погода" }
]
```

Признак `render: false` разделяет две роли реестра. Регистрация и прогрев
касаются **всех** записей, а рисует приложение только те, у кого `render`
не выключен. Так подключён `mf-remote-1`: рендерит его `mf-remote`, но в реестр
он попасть обязан — иначе прогрев случится позже `react-dom` и HMR вложенного
remote перестанет применяться.

На стороне `mf-bus` реестр живёт в [mf-bus/remotes.js](mf-bus/remotes.js) —
из него же строится прокси, так что адрес remote описан там один раз.

```
mf-main/src/
  mount.ts             exposes './mount': реестр, регистрация, прогрев
  render.tsx           createRoot — грузится динамически, последним шагом
  remotes/registry.ts  тип RemoteDescriptor + fetchRemotes()
  remotes/loadRemoteModule.ts  универсальный загрузчик по параметрам
  remotes/RemoteModule.tsx     компонент: lazy + Suspense + RemoteBoundary
```

Загрузчик ничего не знает про конкретные remote:

```ts
const Component = lazy(() => loadRemoteModule({ name, entry, module }));
```

Он регистрирует контейнер один раз на имя и достаёт из него `${name}/${module}`.
Список в UI тянет TanStack Query — ему принадлежит состояние загрузки, ошибок
и кнопка «Повторить».

`registry.ts`, `loadRemoteModule.ts` и `mount.ts` лежат в `.ts` **без
React-импортов**: любой синхронный shared-модуль на этом пути ломает Module
Federation. `lazy()` живёт внутри компонента через ленивый инициализатор
`useState`: голый `const` в теле пересоздавал бы компонент на каждом рендере
и перемонтировал remote.

В `mf-main` выключена `dev.lazyCompilation`: динамический `import('./render')`
заставлял dev-сервер дособирать чанк по служебному пути, который не проходит
через прокси потребителя — падало с `HTTP 404`.

### Адресов remote в коде нет — только прокси

В коде лежат относительные пути (`/mf-main/mf-manifest.json`). Реальные адреса
живут в двух местах: `server.proxy` у dev-сервера `mf-host` и `REMOTES`
в [mf-bus/remotes.js](mf-bus/remotes.js). Каждый remote отдаёт себя под тем же
префиксом (`server.base` в его конфиге), поэтому прокси работает без
`pathRewrite`.

Регистрация контейнеров — в рантайме, `remotes` в конфигах пустые:

```ts
registerRemotes([{ name: NAME, entry: ENTRY }]);
const module = await loadRemote(`${NAME}/App`);
```

### HMR-сокеты идут напрямую на dev-серверы remote

Через прокси ходят только HTTP-запросы. Сокет HMR браузер открывает прямо на
`ws://localhost:5001/rsbuild-hmr` и далее: `dev.client.port` конфигом пустым
не оставить — rsbuild подставляет туда порт собственного dev-сервера.
WebSocket не ограничен CORS, поэтому это работает.

`dev.client` в конфигах remote не задан: путь сокета берётся из дефолтного
`/rsbuild-hmr`, и клиент с сервером сходятся на нём сами. `server.base`
на путь сокета не влияет.

Прокси всё равно подняты с `ws: true`. Если понадобится увести и сокеты в одну
точку входа (remote в docker-сети, за firewall, на https), это делается
резолвером `dev.client.webSocketUrlResolver`, который подменяет origin
на адрес страницы.

### Порядок в mount() важен

[mf-main/src/mount.ts](mf-main/src/mount.ts) делает три шага строго по порядку:
получить реестр → зарегистрировать и прогреть контейнеры → динамически
импортировать `./render` с `createRoot`. Динамический импорт — ещё и
обязательная для Module Federation асинхронная граница: shared-модули
резолвятся асинхронно.

Регистрация обязана отработать **раньше**, чем выполнится `react-dom`.
Проверено экспериментально: если внести `createRoot` прямо в `mount.ts`
(статический импорт `react-dom/client` поднимется наверх и выполнится до тела
функции), приложение соберётся и отрисуется, но HMR всех трёх remote
перестанет применяться — правка доезжает только после ручной перезагрузки.
Отдельный `render.tsx` за динамическим импортом существует ровно ради этого.

По той же причине `mf-remote-1` попадает в реестр с `render: false`: без
записи в реестре его контейнер регистрировался бы уже из модуля `mf-remote`,
то есть после `react-dom`, и HMR вложенного remote не работал бы.

Реестр в `mount.ts` берётся обычным `fetch` — этот путь обязан оставаться
свободным от React-импортов. TanStack Query подключается уже в UI
([mf-main/src/App.tsx](mf-main/src/App.tsx)).

### React шарится с префиксом

В `shared` перечислены `react`, `react/`, `react-dom`, `react-dom/`. Слэш на
конце добавляет к singleton'у `react/jsx-runtime` и `react-dom/client` — без
этого remote утащит свою копию внутренностей React и сломает хуки.

Поставщик React — `mf-main`, а не хост: хост про React не знает вообще,
`shared` у него пустой.

`@tanstack/react-query` в `shared` не входит: `mf-remote-2` приносит его с
собой вместе со своим `QueryClient` и не рассчитывает, что провайдер даст хост.

## Ограничение: dev-remote требует dev-сборки хоста

Fast Refresh работает только с development-сборкой `react-dom`, а её на страницу
поставляет `mf-main` как владелец singleton'а. Поэтому связка «production-сборка
+ dev-сервер remote» не заводится: dev-код remote дёргает
`react/jsx-dev-runtime`, несовместимый с production-внутренностями React
(`dispatcher.getOwner is not a function`).

Отсюда два режима сборки хоста:

- `npm run build:dev` — development-сборка для раздачи из `mf-bus` рядом с
  dev-серверами `mf-main` и remote.
- `npm run build` — обычная production-сборка, работает с production-сборками
  всех остальных.

Сам `mf-host` React не содержит, так что ограничение касается пары
«`mf-main` + remote», а не оболочки.
