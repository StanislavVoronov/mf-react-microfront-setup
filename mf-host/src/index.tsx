import { preloadRemotes } from './remote';

// Контейнеры remote поднимаем раньше react-dom — см. preloadRemotes().
//
// ./bootstrap грузится динамически: это асинхронная граница, обязательная
// для Module Federation, потому что shared-модули резолвятся асинхронно.
preloadRemotes().finally(() => import('./bootstrap'));
