import { loadApp } from './remotes/mfRemote';
import { loadWeather } from './remotes/mfRemote2';

// Контейнеры remote поднимаем раньше react-dom: в dev-сборке внутри контейнера
// едет собственный рантайм remote — react-refresh и HMR-клиент. Он должен
// встать в глобальный хук раньше, чем React DOM зарегистрирует рендерер,
// иначе HMR remote выродится в перезагрузку страницы.
//
// Последовательно, а не Promise.all: при параллельной инициализации контейнеры
// гонятся за share scope и второй remote успевает подтянуть собственную копию
// React вместо общей.
//
// Ошибки глушим: недоступный remote не должен мешать хосту стартовать,
// его покажет RemoteBoundary при рендере.
//
// Здесь намеренно нет React-импортов: любой синхронный shared-модуль в точке
// входа ломает Module Federation. ./bootstrap грузится динамически — это и есть
// обязательная асинхронная граница.
async function start() {
  for (const load of [loadApp, loadWeather]) {
    await load().catch(() => undefined);
  }

  await import('./bootstrap');
}

start();
