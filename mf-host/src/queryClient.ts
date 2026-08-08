import { QueryClient } from '@tanstack/query-core';

/**
 * Клиент создаётся в обычном .ts из @tanstack/query-core — это ядро
 * TanStack Query без React. Благодаря этому точка входа может наполнить кэш
 * до создания React-корня, не затягивая React в entry (любой синхронный
 * shared-модуль там ломает Module Federation).
 *
 * @tanstack/react-query переиспользует ровно этот же клиент: хуки живут
 * поверх того же ядра.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const REMOTES_QUERY_KEY = ['remotes'] as const;
