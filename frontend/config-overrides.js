const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    os: require.resolve("os-browserify/browser"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    buffer: require.resolve("buffer/"),
    stream: require.resolve("stream-browserify"),
    url: require.resolve("url/"),
    zlib: require.resolve("browserify-zlib"),
    assert: require.resolve("assert/"),
    process: require.resolve("process/browser.js"), // ✅ include `.js`
    fs: false,
  };

  config.plugins.push(
    new webpack.ProvidePlugin({
      process: "process/browser.js", // ✅ include `.js`
      Buffer: ["buffer", "Buffer"],
    })
  );

  config.module.rules.push({
    test: /\.m?js$/,
    resolve: {
      fullySpecified: false,
    },
  });

  return config;
};
