import { preloadRemotes } from './remotes/loadRemoteModule';
import { fetchRemotes } from './remotes/registry';

// Список remote заранее неизвестен — спрашиваем его у сервера, а уже потом
// поднимаем контейнеры. Всё это до react-dom: в dev-сборке внутри контейнера
// едет собственный рантайм remote (react-refresh и HMR-клиент), он должен
// встать в глобальный хук раньше, чем React DOM зарегистрирует рендерер.
// Иначе HMR remote выродится в перезагрузку страницы.
//
// В UI список запрашивается ещё раз — уже через TanStack Query, которому
// принадлежит состояние загрузки и ошибок. Второй запрос уходит в тот же
// локальный эндпоинт и стоит копейки.
//
// Здесь намеренно нет React-импортов: любой синхронный shared-модуль в точке
// входа ломает Module Federation. ./bootstrap грузится динамически — это и есть
// обязательная асинхронная граница.
async function start() {
  const remotes = await fetchRemotes().catch(() => []);

  await preloadRemotes(remotes);
  await import('./bootstrap');
}

start();
