// Технический entry для Rsbuild.
//
// Приложение не монтирует себя само: нет index.html, а createRoot спрятан
// за exposes './mount' — его вызывает хост, передавая DOM-контейнер.
export {};
