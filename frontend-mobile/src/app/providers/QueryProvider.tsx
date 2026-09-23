import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import React, { PropsWithChildren, useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { ApiError } from '../../api/errors';
import { env } from '../../config/env';
import { sessionEvents } from '../../services/sessionEvents';

const ONE_DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: ONE_DAY, // Keep data long enough to be persisted for offline use.
      retry: (failureCount, error) => {
        // 4xx responses are deterministic; retrying only delays the error screen.
        if (error instanceof ApiError && error.isClientError) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'renewly.query-cache',
  throttleTime: 2000,
});

// React Query knows when the device is offline (pauses requests, refetches on reconnect)…
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  }),
);

// …and when the app returns to the foreground (refreshes stale data such as "renews in N days").
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

export function QueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(
    () =>
      sessionEvents.subscribe(event => {
        if (event === 'signedOut') {
          // Never show one account's data to the next person who signs in.
          queryClient.cancelQueries();
          queryClient.clear();
          persister.removeClient();
        }
      }),
    [],
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: ONE_DAY,
        // Drop the cache whenever the app version changes (response shapes may have changed).
        buster: env.appVersion,
        dehydrateOptions: {
          shouldDehydrateQuery: query => query.state.status === 'success',
        },
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}
