import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { queryClient, REMOTES_QUERY_KEY } from './queryClient';
import { RemoteModule } from './remotes/RemoteModule';
import { fetchRemotes, renderable } from './remotes/registry';

function RemoteList() {
  // Тот же ключ, что и в точке входа: данные уже лежат в кэше, повторного
  // запроса не будет.
  const { data, error, isPending, refetch } = useQuery({
    queryKey: REMOTES_QUERY_KEY,
    queryFn: fetchRemotes,
  });

  if (isPending) {
    return <p className="host__status">Запрашиваю список remote…</p>;
  }

  if (error) {
    return (
      <div className="host__error">
        <strong>Не удалось получить список remote.</strong>
        <pre>{error.message}</pre>
        <button className="host__retry" type="button" onClick={() => refetch()}>
          Повторить
        </button>
      </div>
    );
  }

  // Показываем только те, что приложение рисует само. Остальные из реестра
  // нужны ради регистрации и прогрева — их рендерит кто-то другой.
  const visible = renderable(data);

  if (visible.length === 0) {
    return <p className="host__status">Сервер не отдал ни одного remote.</p>;
  }

  return (
    <>
      <p className="host__subtitle">
        Доступные remote: {data.map((remote) => remote.name).join(', ')}
      </p>

      {visible.map((remote) => (
        <RemoteModule key={remote.name} remote={remote} />
      ))}
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="host">
        <header className="host__header">
          <h1 className="host__title">mf-host</h1>
          <p className="host__subtitle">
            Module Federation 2.0 · Rsbuild · React · TanStack Query
          </p>
        </header>

        <RemoteList />
      </main>
    </QueryClientProvider>
  );
}

export default App;
