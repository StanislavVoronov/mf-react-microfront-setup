import { lazy, Suspense, useState } from 'react';
import { RemoteBoundary } from '../RemoteBoundary';
import { loadWeather, NAME } from './mfRemote2';

/** Загружает и рендерит mf_remote_2/Weather. */
export function MfRemote2Weather() {
  // Ленивый инициализатор useState, а не голый const: тот пересоздавал бы
  // lazy-компонент на каждом рендере, и remote перемонтировался бы,
  // теряя своё состояние и кэш react-query.
  const [Weather] = useState(() => lazy(loadWeather));

  return (
    <RemoteBoundary name={NAME}>
      <Suspense fallback={<p className="host__status">Загружаю {NAME}…</p>}>
        <Weather />
      </Suspense>
    </RemoteBoundary>
  );
}
