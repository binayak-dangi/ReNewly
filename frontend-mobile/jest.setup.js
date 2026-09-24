/* global jest */
// Native modules are not available in Jest; replace them with in-memory fakes.

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 5,
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async key => store.get(key) ?? null),
    deleteItemAsync: jest.fn(async key => {
      store.delete(key);
    }),
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

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Picker = props => React.createElement(View, { testID: 'date-picker', ...props });
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() } };
});
