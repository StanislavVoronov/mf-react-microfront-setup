import { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { CITIES, type City } from './cities';
import { describeWeather, fetchForecast } from './weatherApi';
import './Weather.css';

// Свой QueryClient: remote не рассчитывает на то, что провайдер даст хост.
// Он самодостаточен и работает в любом потребителе.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Forecast({ city }: { city: City }) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['forecast', city.id],
    queryFn: ({ signal }) => fetchForecast(city, signal),
  });

  if (isPending) {
    return <p className="weather__status">Загружаю прогноз…</p>;
  }

  if (error) {
    return (
      <div className="weather__error">
        <p>Не удалось получить прогноз: {error.message}</p>
        <button className="weather__retry" type="button" onClick={() => refetch()}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="weather__current">
        Сейчас <strong>{Math.round(data.current)}°C</strong>
        {isFetching && <span className="weather__spinner"> · обновляю…</span>}
      </p>

      <ul className="weather__days">
        {data.days.map((day) => (
          <li className="weather__day" key={day.date}>
            <span className="weather__date">
              {new Date(day.date).toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <span className="weather__temp">
              {Math.round(day.min)}° … {Math.round(day.max)}°
            </span>
            <span className="weather__desc">{describeWeather(day.code)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function WeatherPanel() {
  const [cityId, setCityId] = useState(CITIES[0].id);
  const city = CITIES.find((item) => item.id === cityId) ?? CITIES[0];

  return (
    <section className="weather">
      <h2 className="weather__title">mf-remote-2 · погода</h2>
      <p className="weather__hint">
        TanStack Query + Open-Meteo. Ответы кэшируются на 5 минут, поэтому
        возврат к уже выбранному городу отрисовывается мгновенно.
      </p>

      <label className="weather__field">
        <span className="weather__label">Город</span>
        <select
          className="weather__select"
          value={cityId}
          onChange={(event) => setCityId(event.target.value)}
        >
          {CITIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <Forecast city={city} />
    </section>
  );
}

export default function Weather() {
  return (
    <QueryClientProvider client={queryClient}>
      <WeatherPanel />
    </QueryClientProvider>
  );
}
