import { registerRemoteContainers } from './remotes/loadRemoteModule';
import { fetchRemotes } from './remotes/registry';
import { queryClient, REMOTES_QUERY_KEY } from './queryClient';

// Список remote заранее неизвестен — получаем его и регистрируем контейнеры
// в рантайме Module Federation. Сеть здесь не трогается: контейнер поднимется
// при первом loadRemote, когда React отрендерит нужный lazy-компонент.
//
// Регистрация должна пройти здесь, а не лениво внутри loadRemoteModule.
// Проверено: если убрать её отсюда и полагаться на регистрацию в момент
// рендера, HMR обоих remote перестаёт применяться — правка доезжает только
// после ручной перезагрузки.
//
// Реестр берётся через queryClient.fetchQuery, а не голым fetch: результат
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

  registerRemoteContainers(remotes);

  await import('./bootstrap');
}

start();
