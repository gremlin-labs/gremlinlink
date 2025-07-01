'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

/**
 * REACT QUERY PROVIDER
 * 
 * Provides React Query client with optimized configuration
 * for the unified content management system.
 */

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: how long data is considered fresh
            staleTime: 5 * 60 * 1000, // 5 minutes
            
            // GC time: how long unused data stays in cache
            gcTime: 10 * 60 * 1000, // 10 minutes
            
            // Retry configuration
            retry: (failureCount, error: Error & { status?: number }) => {
              // Don't retry on 4xx errors (client errors)
              if (error?.status && error.status >= 400 && error.status < 500) {
                return false;
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
            
            // Refetch configuration
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: true,
          },
          mutations: {
            // Global mutation error handling
            onError: () => {
              // Mutation error occurred
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  );
}