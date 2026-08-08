import { lazy, Suspense, useState } from 'react';
import { RemoteBoundary } from './RemoteBoundary';
import { loadWeather, loadWidget, preloadRemotes } from './remotes';
import './App.css';

// Вложенные контейнеры поднимаем на верхнем уровне модуля — до того, как хост
// создаст React-корень. Хост ждёт этот await, потому что грузит mf_remote/App
// через loadRemote().
await preloadRemotes();

const Remote1Widget = lazy(loadWidget);
const Remote2Weather = lazy(loadWeather);

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <section className="remote-app">
      <h2 className="remote-app__title">mf-remote</h2>
      <p className="remote-app__hint">
        Отредактируй <code>mf-remote/src/App.tsx</code> — счётчик не сбросится,
        если HMR отработал.
      </p>
      <button
        className="remote-app__button"
        type="button"
        onClick={() => setCount((value) => value + 1)}
      >
        count: {count}
      </button>

      <RemoteBoundary name="mf-remote-1">
        <Suspense
          fallback={<p className="remote-app__hint">Загружаю mf-remote-1…</p>}
        >
          <Remote1Widget />
        </Suspense>
      </RemoteBoundary>

      <RemoteBoundary name="mf-remote-2">
        <Suspense
          fallback={<p className="remote-app__hint">Загружаю mf-remote-2…</p>}
        >
          <Remote2Weather />
        </Suspense>
      </RemoteBoundary>
    </section>
  );
}
