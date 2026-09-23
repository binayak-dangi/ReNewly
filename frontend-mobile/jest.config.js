module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Per-icon imports (src/components/icons.ts) ship as .mjs; icons are irrelevant in unit tests.
    '^lucide-react-native/icons/.*$': '<rootDir>/jest/lucideIconStub.js',
  },
  // These packages ship untranspiled ESM and must go through Babel.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|lucide-react-native|react-native-svg|react-native-screens|react-native-safe-area-context|react-native-keychain|@tanstack|zustand)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
