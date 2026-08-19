// Технический entry для Rsbuild.
//
// Это микросервисное приложение не монтирует себя само: тут нет
// ReactDOM.createRoot и нет index.html. Наружу торчит только то,
// что перечислено в `exposes` внутри rsbuild.config.ts.
export {};
