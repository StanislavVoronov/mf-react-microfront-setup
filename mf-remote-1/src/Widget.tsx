import { useState } from 'react';
import './Widget.css';

export default function Widget() {
  const [ticks, setTicks] = useState(0);

  return (
    <div className="widget">
      <h3 className="widget__title">mf-remote-1</h3>
      <p className="widget__hint">
        Вложенный remote: его грузит не хост, а mf-remote.
      </p>
      <button
        className="widget__button"
        type="button"
        onClick={() => setTicks((value) => value + 1)}
      >
        ticks: {ticks}
      </button>
    </div>
  );
}
