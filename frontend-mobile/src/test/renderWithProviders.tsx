import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import React, { ComponentType } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../app/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Renders one screen inside navigation + a fresh QueryClient (no retries, no cache sharing between tests).
 * Other routes are registered as empty stubs so navigation calls can be asserted.
 */
export async function renderScreen<Name extends keyof RootStackParamList>(
  name: Name,
  component: ComponentType<any>,
  options: { params?: RootStackParamList[Name]; extraRoutes?: (keyof RootStackParamList)[] } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const Empty = () => null;

  const utils = await render(
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name={name} component={component} initialParams={options.params as object | undefined} />
            {(options.extraRoutes ?? []).map(route => (
              <Stack.Screen key={route} name={route} component={Empty} />
            ))}
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );

  return { ...utils, queryClient };
}
