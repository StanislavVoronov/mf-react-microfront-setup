# module-federation-react-dev-local-setup

Module Federation 2.0 + Rsbuild + React. Монорепа на npm workspaces и Turborepo:
шесть пакетов в `apps/*`, зависимости и `node_modules` — общие, в корне.

| Пакет | Что это | Порт |
| --- | --- | --- |
| `apps/mf-remote` | Remote со счётчиком; сам подключает `mf-remote-1` | 5001 |
| `apps/mf-host` | Отдельная host-оболочка для запуска через dev-сервер | 5002 |
| `apps/mf-bus` | Оболочка: bootstrap, stubs, прокси и раздача собранных remote | 5003 |
| `apps/mf-remote-1` | Remote-виджет, его рендерит `mf-remote` | 5004 |
| `apps/mf-remote-2` | Remote с TanStack Query и прогнозом погоды по 10 городам | 5005 |
| `apps/mf-main` | Само приложение как remote-компонент, UI реестра, react-query | 5006 |

Порты зашиты в конфиги, `strictPort: true` — молча съехать на соседний нельзя.

```
mf-bus (fetch stubs → registerRemotes → mf_main → createRoot)
  └── mf-main (default remote-компонент)
        ├── mf-remote  →  mf-remote-1
        └── mf-remote-2
```

Основной вход — `mf-bus`, и это обычный `rsbuild dev`: своего сервера у него
нет. Реестр stubs, прокси на remote и раздача уже собранных контейнеров описаны
в [mf-bus/rsbuild.config.ts](apps/mf-bus/rsbuild.config.ts) через `server.setup`,
`server.proxy` и `server.publicDir`. Живая разработка идёт в `mf-main` и
remote — все они dev-серверы с HMR.

`mf-bus` существует только в dev: production-режима у него нет, собирать его
нечем и незачем.

## Установка

```bash
npm install
```

Один `package.json` в корне держит все зависимости, у пакетов остались только
`name` и `scripts`. Установка тоже одна: npm поднимает единственную копию
react, react-dom и rsbuild в корневой `node_modules`, у пакетов своих нет.

## Сценарий 1: разработка через mf-bus, хост выключен

Собирать `mf-bus` не нужно и нечем: `npm run dev` — это `rsbuild dev`.
Правки в `mf-main` и любом remote прилетают на страницу без перезагрузки,
правки в самой оболочке — тоже.

```bash
npm run dev          # turbo run dev: все шесть пакетов разом
npm run dev -w mf-main   # или поштучно, любой пакет по имени
```

Чтобы `mf-main` действительно поднимался с 5006, верните ему `target`
в [mf-bus/src/remotes.ts](apps/mf-bus/src/remotes.ts) — по умолчанию он раздаётся
собранным (сценарий 1b).

Открыть <http://localhost:5003>. Dev-сервер `mf-host` при этом не нужен.

## Сценарий 1b: собранный mf-main через mf-bus

`mf-main` можно не держать процессом. Он собирается прямо в статику оболочки —
`mf-bus/public/mf-main` (`output.distPath` в
[mf-main/rsbuild.config.ts](apps/mf-main/rsbuild.config.ts)), — и `mf-bus` раздаёт
контейнер оттуда: `server.publicDir` отдаёт папку с корня, а прокси на 5006
в конфиге просто не появляется.

```bash
npx turbo run build:dev --filter=mf-main   # именно build:dev, см. ниже
npm run dev -w mf-bus                      # dev-сервер mf-main не нужен
```

Собирать вручную обычно не приходится: `dev` в [turbo.json](turbo.json) объявлен
через `dependsOn: ["mf-main#build:dev"]`, поэтому `npm run dev` сам собирает
`mf-main` в статику оболочки до старта серверов.

Это и есть текущая раскладка по умолчанию: у `mf_main` в реестре нет `target`.

Путь `/mf-main/` в браузере не меняется: он совпадает и с `output.assetPrefix`
сборки, и с папкой внутри `public`, так что оболочка забирает оттуда
`mf-manifest.json` для инициализации `mf_main`, ничего не зная о подмене.

Режим переключается полем `target` в
[mf-bus/src/remotes.ts](apps/mf-bus/src/remotes.ts): есть адрес — контейнер
проксируется на свой dev-сервер, нет — берётся собранным из `public/<prefix>`.
У `mf_main` его нет, у остальных есть. Правило общее, так что из папки можно
поднять любой remote.

Порядок здесь не свободный: прокси в rsbuild отрабатывает **раньше** раздачи
`public`, поэтому объявленный `target` всегда перебивает собранную папку —
«собрано, значит из папки» само не получится.

`build:dev`, а не `build`: оболочка в dev-режиме собирается в development,
и её `react-dom` не сойдётся с production-копией React из `mf-main` — см. раздел
про ограничение.

HMR remote при этом продолжает работать: их сокеты идут напрямую на их
dev-серверы и от режима `mf-main` не зависят. А вот сам `mf-main` из папки,
конечно, замирает — чтобы править его живьём, вернитесь к сценарию 1.
Пересобрали его — страница перезагрузится сама: `publicDir.watch` включён.

## Сценарий 2: с dev-сервером хоста

Всё то же самое плюс `npm run dev -w mf-host` на 5002 — пригодится, если
правится сама оболочка.

## Монорепа

Workspaces описаны в корневом [package.json](package.json) как `apps/*`, задачи —
в [turbo.json](turbo.json). Зависимости живут только в корне, у пакетов остались
`name`, `type` и `scripts`, поэтому react, react-dom и rsbuild на диске в одном
экземпляре. На Module Federation это не влияет: singleton всё равно собирается
в рантайме через share scope, и в `__FEDERATION__` по-прежнему пять инстансов —
по одному на контейнер.

```jsonc
"dev":       { "cache": false, "persistent": true, "dependsOn": ["mf-main#build:dev"] },
"build":     { "outputs": ["dist/**", "../mf-bus/public/**"] },
"build:dev": { "outputs": ["dist/**", "../mf-bus/public/**"] }
```

`dependsOn` здесь обязателен: без него `turbo run dev` поднимает `mf-bus` раньше,
чем `mf-main` собран в его `public`, и страница падает с
`#RUNTIME-003 Failed to get manifest`. Рёбер между пакетами нет — они не зависят
друг от друга по npm, только по рантайму, — так что порядок задаётся руками.

Выход сборки за пределы пакета (`../mf-bus/public/**`) turbo переживает: артефакт
восстанавливается из кэша вместе с остальным (проверено — удалил папку, получил
`FULL TURBO` и файлы на месте). Но rsbuild предупреждает, что не чистит dist вне
корня пакета, так что старые чанки оттуда никто не удаляет.

Три грабли, на которые стоит смотреть:

- **`npm run build` в корне ломает сценарий 1b.** Он гоняет `build` у всех, в том
  числе production-сборку `mf-main` — та ложится в `apps/mf-bus/public/mf-main`
  поверх dev-сборки, и оболочка перестаёт заводиться (см. раздел про ограничение).
  Лечится `npx turbo run build:dev --filter=mf-main`.
- **`envMode: strict` — дефолт turbo 2.** До задачи долетают только переменные,
  перечисленные в `env`/`globalEnv`/`passThroughEnv`. Если адреса remote или
  `assetPrefix` придут из окружения, они молча окажутся пустыми, а кэш их
  не заметит.
- **Общий `node_modules` не спасает от расхождения версий.** Если у пакетов
  разъедутся react или `@module-federation/enhanced`, в share scope появится
  вторая запись. Проверка в консоли:
  `Object.keys(__FEDERATION__.__INSTANCES__[0].shareScopeMap.default.react).length`
  должно быть `1`.

## Как это устроено

### Remote — не приложения

У `mf-remote`, `mf-remote-1` и `mf-remote-2` нет `index.html`
(`tools.htmlPlugin: false`) и нет `createRoot`. `src/index.ts` — пустой
технический entry для сборщика. Наружу торчит только то, что перечислено
в `exposes`. По корню их порта отдаётся 404 — это контейнеры, а не страницы.

### mf-bus — bootstrap приложения

[mf-bus/src/index.ts](apps/mf-bus/src/index.ts) делает ранний bootstrap:
запрашивает stubs через `GET /api/remotes`, регистрирует эти контейнеры вместе
с `mf_main`, загружает `mf_main`, а уже потом динамически импортирует
`react` и `react-dom/client` для `createRoot`.

```ts
const stubs = await fetchStubs();
registerRemotes([MAIN_REMOTE, ...stubs]);
const app = await loadRemote('mf_main');
const React = await import('react');
const ReactDOM = await import('react-dom/client');
ReactDOM.createRoot(root).render(/* mf_main */);
```

React и ReactDOM теперь шарятся из `mf-bus`, поэтому в его federation-конфиге
есть `pluginReact()` и singleton `shared` для `react`, `react/`, `react-dom`,
`react-dom/`.

### Приложение не знает remote заранее

Список дочерних remote запрашивает `mf-bus` до React bootstrap и затем повторно
использует `mf-main` в UI: `GET /api/remotes`. `mf_main` в этот список не
входит: browser entry `mf-bus` добавляет его напрямую как `MAIN_REMOTE`.

```json
[
  { "name": "mf_remote",   "entry": "/mf-remote/mf-manifest.json",   "module": "App",     "title": "mf-remote" },
  { "name": "mf_remote_1", "entry": "/mf-remote-1/mf-manifest.json", "module": "Widget",  "title": "mf-remote-1", "render": false },
  { "name": "mf_remote_2", "entry": "/mf-remote-2/mf-manifest.json", "module": "Weather", "title": "Погода" }
]
```

Признак `render: false` разделяет две роли реестра. Регистрация и прогрев
касаются **всех** записей, а UI `mf-main` показывает только те, у кого `render`
не выключен. Поэтому `mf-remote-1` есть в реестре с `render: false`: его
рендерит `mf-remote`.

На стороне `mf-bus` реестр живёт в [mf-bus/src/remotes.ts](apps/mf-bus/src/remotes.ts).
Его импортирует `rsbuild.config.ts`: из того же списка строится и ответ
`/api/remotes`, и `server.proxy`, так что адрес remote описан один раз.

```
mf-main/src/
  App.tsx              exposes '.': приложение без createRoot
  remotes/registry.ts  тип RemoteDescriptor + fetchRemotes()
  remotes/RemoteModule.tsx     lazy + registerRemotes + Suspense + RemoteBoundary
  remotes/MfRemoteHardcoded.tsx  то же самое, но контейнер зашит в код
```

Компонент remote ничего не знает про конкретные контейнеры заранее:

```ts
registerRemotes([{ name: remote.name, entry: remote.entry }]);
const Component = lazy(() => loadRemote(`${remote.name}/${remote.module}`));
```

Он достаёт из контейнера `${name}/${module}` по описанию из реестра.
Список в UI тянет TanStack Query — ему принадлежит состояние загрузки, ошибок
и кнопка «Повторить».

`registry.ts` лежит в `.ts` **без React-импортов**: любой синхронный
shared-модуль на этом пути ломает Module Federation. `lazy()` живёт внутри
компонента через ленивый инициализатор
`useState`: голый `const` в теле пересоздавал бы компонент на каждом рендере
и перемонтировал remote.

### Второй вариант: контейнер зашит в код

[mf-main/src/remotes/MfRemoteHardcoded.tsx](apps/mf-main/src/remotes/MfRemoteHardcoded.tsx)
подключает `mf_remote` мимо реестра: имя, манифест и ключ из `exposes` известны
на этапе сборки, поэтому `registerRemotes()` и `lazy()` стоят прямо на уровне
модуля, без `useState`. Реестр этот контейнер всё равно знает — с `render: false`,
как и `mf-remote-1`: регистрация и прогрев касаются всех, а рисует его теперь
не список, а зашитый компонент.

Модуль вычисляется один раз, так что `lazy()` создаётся один раз: на обычных
перерендерах разницы с вариантом через `useState` нет. Разница появляется на HMR
самого этого файла — новый модуль даёт новый `lazy`, и remote монтируется заново.

HMR проверен на живой странице (`mf-bus` + dev-серверы remote):

| что правим | правка применилась | состояние remote |
| --- | --- | --- |
| `mf-remote/src/App.tsx` (сам remote) | да, без перезагрузки | счётчик и вложенный `ticks` целы |
| `mf-main/src/App.tsx` (сосед по mf-main) | да | целы оба remote |
| `mf-main/src/remotes/MfRemoteHardcoded.tsx` | да | зашитый remote перемонтирован, счётчик и `ticks` сброшены; remote из реестра цел |
| `mf-main/src/remotes/RemoteModule.tsx` | да | remote из реестра перемонтирован, выбранный город сброшен; зашитый цел |

То есть HMR работает в обоих вариантах, и Fast Refresh remote проходит сквозь
зашитый `lazy` так же, как сквозь `lazy` из `useState`. Перемонтируется только
тот remote, чей файл-обёртка в `mf-main` и правится, — `useState` от этого
не спасает.

В `mf-main` оставлена выключенной `dev.lazyCompilation`, чтобы загрузка remote
через прокси `mf-host`/`mf-bus` не упиралась в служебные lazy-compile URL.

### Адресов remote в коде нет — только прокси

В коде лежат относительные пути (`/mf-main/mf-manifest.json`). Реальные адреса
живут в `REMOTES` ([mf-bus/src/remotes.ts](apps/mf-bus/src/remotes.ts)) и в
`server.proxy` у dev-сервера `mf-host`. Каждый remote отдаёт себя под тем же
префиксом (`server.base` в его конфиге), поэтому прокси работает без
`pathRewrite`. Тот же префикс служит и именем папки в `mf-bus/public`, когда
контейнер раздаётся собранным.

`mf-bus` регистрирует `mf_main` и stubs до `createRoot`; `mf-main` при рендере
не регистрирует повторно то, что уже есть в текущем runtime:

```ts
registerRemotes([{ name: 'mf_main', entry: '/mf-main/mf-manifest.json' }]);
registerRemotes(stubs.map(({ name, entry }) => ({ name, entry })));
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

### Порядок bootstrap важен

[mf-bus/src/index.ts](apps/mf-bus/src/index.ts) делает шаги строго по порядку:
получить stubs → зарегистрировать `mf_main` и stubs → загрузить `mf_main` →
динамически импортировать React/ReactDOM → `createRoot`.
Динамический импорт — ещё и обязательная для Module Federation асинхронная
граница: shared-модули резолвятся асинхронно.

Статического импорта `react-dom/client` в `index.ts` нет: `createRoot`
создаётся в этом же entry, но сам ReactDOM загружается только после регистрации
контейнеров.

Реестр дочерних remote берётся уже внутри `mf-main` обычным `fetch`.
TanStack Query подключается в UI
([mf-main/src/App.tsx](apps/mf-main/src/App.tsx)).

### React шарится с префиксом

В `shared` перечислены `react`, `react/`, `react-dom`, `react-dom/`. Слэш на
конце добавляет к singleton'у `react/jsx-runtime` и `react-dom/client` — без
этого remote утащит свою копию внутренностей React и сломает хуки.

Поставщик React — `mf-bus`, потому что именно он создаёт React root.

`@tanstack/react-query` в `shared` не входит: `mf-remote-2` приносит его с
собой вместе со своим `QueryClient` и не рассчитывает, что провайдер даст хост.

## Ограничение: dev-remote требует dev-сборки хоста

Fast Refresh работает только с development-сборкой `react-dom`, а её на страницу
поставляет `mf-bus` как владелец singleton'а. Поэтому связка «production-сборка
+ dev-сервер remote» не заводится: dev-код remote дёргает
`react/jsx-dev-runtime`, несовместимый с production-внутренностями React
(`dispatcher.getOwner is not a function`).

Правило простое: **режим должен быть одинаковым у всех, кто участвует в
singleton'е React**. Смешивать development и production нельзя ни в какую
сторону.

`npm run dev` у `mf-bus` — это development-сборка оболочки, поэтому рядом
с ней всё остальное тоже должно быть development:

- remote — dev-серверами (обычный сценарий 1);
- `mf-main` из папки — `npm run build:dev`, не `build`.

Что бывает при рассинхроне, проверено на обеих комбинациях:

| на странице | ошибка |
| --- | --- |
| dev remote + production React | `dispatcher.getOwner is not a function` |
| dev `react-dom` (`mf-bus`) + production `react` (папка `mf-main`) | `Cannot read properties of undefined (reading 'current')` в `isConcurrentActEnvironment` |

Поскольку у `mf-bus` production-режима нет вообще, второй половины правила
здесь просто не бывает: на странице всё всегда development.

## Грабли: Module Federation ломается под tsx

Актуально, если решите вернуть `mf-bus` собственный node-сервер. `tsx`
прогоняет зависимости через esbuild с `keepNames`, а плагин Module Federation
вшивает свои рантайм-хелперы в бандл через `Function.toString()`. Обёртки
`__name(...)` уезжают в браузер, где такой функции нет, и контейнер падает ещё
до старта приложения: `ReferenceError: __name is not defined`. Лечится запуском
на голом `node` (типы он снимает сам) — но проще не заводить свой сервер:
`server.setup`, `server.proxy` и `server.publicDir` закрывают всё, ради чего он
был нужен.
