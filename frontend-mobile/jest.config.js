module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // The first run after a cache clear transforms every dependency; avoid spurious 5s timeouts.
  testTimeout: 20000,
  moduleNameMapper: {
    // Per-icon imports (src/components/icons.ts) ship as .mjs; icons are irrelevant in unit tests.
    '^lucide-react-native/icons/.*$': '<rootDir>/jest/lucideIconStub.js',
  },
  // These packages ship untranspiled ESM and must go through Babel.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|lucide-react-native|react-native-svg|react-native-screens|react-native-safe-area-context|expo(nent)?|@expo(nent)?/.*|expo-.*|@tanstack|zustand)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
