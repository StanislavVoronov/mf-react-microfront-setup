import { useState } from 'react';
import { MfRemote1Widget } from './remotes/MfRemote1Widget';
import './App.css';

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

      <MfRemote1Widget />
    </section>
  );
}
