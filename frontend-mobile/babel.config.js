module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // zod v4 uses `export * as ns from '...'`; keep the transform explicit.
      '@babel/plugin-transform-export-namespace-from',
    ],
  };
};
