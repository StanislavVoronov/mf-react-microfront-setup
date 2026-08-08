import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { RemoteModule } from './remotes/RemoteModule';
import { fetchRemotes } from './remotes/registry';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RemoteList() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['remotes'],
    queryFn: ({ signal }) => fetchRemotes(signal),
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

  if (data.length === 0) {
    return <p className="host__status">Сервер не отдал ни одного remote.</p>;
  }

  return (
    <>
      <p className="host__subtitle">
        Доступные remote: {data.map((remote) => remote.name).join(', ')}
      </p>

      {data.map((remote) => (
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
