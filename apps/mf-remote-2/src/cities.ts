export type City = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export const CITIES: City[] = [
  { id: 'moscow', name: 'Москва', latitude: 55.7558, longitude: 37.6173 },
  { id: 'spb', name: 'Санкт-Петербург', latitude: 59.9311, longitude: 30.3609 },
  { id: 'novosibirsk', name: 'Новосибирск', latitude: 55.0084, longitude: 82.9357 },
  { id: 'yekaterinburg', name: 'Екатеринбург', latitude: 56.8389, longitude: 60.6057 },
  { id: 'kazan', name: 'Казань', latitude: 55.7963, longitude: 49.1088 },
  { id: 'sochi', name: 'Сочи', latitude: 43.5855, longitude: 39.7231 },
  { id: 'vladivostok', name: 'Владивосток', latitude: 43.1155, longitude: 131.8855 },
  { id: 'belgrade', name: 'Белград', latitude: 44.7866, longitude: 20.4489 },
  { id: 'yerevan', name: 'Ереван', latitude: 40.1792, longitude: 44.4991 },
  { id: 'tbilisi', name: 'Тбилиси', latitude: 41.6938, longitude: 44.8015 },
];
