import type { City } from './cities';

export type ForecastDay = {
  date: string;
  min: number;
  max: number;
  code: number;
};

export type Forecast = {
  current: number;
  days: ForecastDay[];
};

type OpenMeteoResponse = {
  current?: { temperature_2m: number };
  daily?: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    weather_code: number[];
  };
};

// Open-Meteo: без ключа и с CORS, поэтому запрос идёт прямо из браузера.
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export async function fetchForecast(
  city: City,
  signal?: AbortSignal,
): Promise<Forecast> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('latitude', String(city.latitude));
  url.searchParams.set('longitude', String(city.longitude));
  url.searchParams.set('current', 'temperature_2m');
  url.searchParams.set(
    'daily',
    'temperature_2m_min,temperature_2m_max,weather_code',
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '5');

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Open-Meteo ответил ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;

  if (!data.daily || !data.current) {
    throw new Error('Open-Meteo вернул ответ без прогноза');
  }

  const { time, temperature_2m_min, temperature_2m_max, weather_code } =
    data.daily;

  return {
    current: data.current.temperature_2m,
    days: time.map((date, index) => ({
      date,
      min: temperature_2m_min[index],
      max: temperature_2m_max[index],
      code: weather_code[index],
    })),
  };
}

// WMO weather code → человекочитаемое описание.
const WEATHER_CODES: Record<number, string> = {
  0: '☀️ Ясно',
  1: '🌤 Малооблачно',
  2: '⛅️ Переменная облачность',
  3: '☁️ Пасмурно',
  45: '🌫 Туман',
  48: '🌫 Изморозь',
  51: '🌦 Морось',
  53: '🌦 Морось',
  55: '🌦 Сильная морось',
  61: '🌧 Небольшой дождь',
  63: '🌧 Дождь',
  65: '🌧 Сильный дождь',
  71: '🌨 Небольшой снег',
  73: '🌨 Снег',
  75: '❄️ Сильный снег',
  77: '🌨 Снежная крупа',
  80: '🌦 Ливень',
  81: '🌧 Ливень',
  82: '⛈ Сильный ливень',
  85: '🌨 Снегопад',
  86: '❄️ Сильный снегопад',
  95: '⛈ Гроза',
  96: '⛈ Гроза с градом',
  99: '⛈ Сильная гроза с градом',
};

export function describeWeather(code: number): string {
  return WEATHER_CODES[code] ?? `Код ${code}`;
}
