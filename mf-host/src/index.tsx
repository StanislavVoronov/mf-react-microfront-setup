import { preloadRemotes } from './remotes/loadRemoteModule';
import { fetchRemotes } from './remotes/registry';
import { queryClient, REMOTES_QUERY_KEY } from './queryClient';

// Список remote заранее неизвестен — спрашиваем его у сервера, а уже потом
// поднимаем контейнеры. Всё это до react-dom: в dev-сборке внутри контейнера
// едет собственный рантайм remote (react-refresh и HMR-клиент), он должен
// встать в глобальный хук раньше, чем React DOM зарегистрирует рендерер.
// Иначе HMR remote выродится в перезагрузку страницы.
//
// Запрос идёт через queryClient.fetchQuery, а не голым fetch: результат
// оседает в кэше, и useQuery в UI отрисует его сразу, без второго запроса.
//
// Здесь намеренно нет React-импортов: любой синхронный shared-модуль в точке
// входа ломает Module Federation. ./bootstrap грузится динамически — это и есть
// обязательная асинхронная граница.
async function start() {
  const remotes = await queryClient
    .fetchQuery({
      queryKey: REMOTES_QUERY_KEY,
      queryFn: ({ signal }) => fetchRemotes(signal),
    })
    .catch(() => []);

  await preloadRemotes(remotes);
  await import('./bootstrap');
}

start();
