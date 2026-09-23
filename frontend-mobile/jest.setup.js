/* global jest */
// Native modules are not available in Jest; replace them with in-memory fakes.

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest'));

jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('react-native-keychain', () => {
  const store = new Map();
  return {
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly' },
    setGenericPassword: jest.fn(async (username, password, options) => {
      store.set(options?.service, { username, password, service: options?.service });
      return { service: options?.service, storage: 'mock' };
    }),
    getGenericPassword: jest.fn(async options => store.get(options?.service) ?? false),
    resetGenericPassword: jest.fn(async options => store.delete(options?.service)),
    __store: store,
  };
});

// lucide-react-native ships .mjs (not transformed by the RN preset); icons are irrelevant in unit tests.
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const cache = new Map();
  return new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === '__esModule') {
          return true;
        }
        if (!cache.has(name)) {
          const Icon = props => React.createElement(View, { testID: `icon-${String(name)}`, ...props });
          Icon.displayName = String(name);
          cache.set(name, Icon);
        }
        return cache.get(name);
      },
    },
  );
});
