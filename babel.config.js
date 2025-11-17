module.exports = function(api) {
  api.cache(true);

  const plugins = [];

  // 本番ビルド時のみconsole.log/warn/infoを削除（errorは残す）
  if (process.env.NODE_ENV === 'production') {
    plugins.push([
      'transform-remove-console',
      {
        exclude: ['error', 'warn']
      }
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins
  };
};
