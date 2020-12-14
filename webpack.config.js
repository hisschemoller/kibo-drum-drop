const path = require('path');
const svgToMiniDataURI = require('mini-svg-data-uri');

module.exports = {
  entry: [ 
    path.resolve(__dirname, 'docs/js/main.js'),
  ],
  output: {
    filename: 'main-bundle.js',
    path: path.resolve(__dirname, 'docs/js'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [
          /(node_modules)/, 
          /(main-bundle.js)/
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
      {
        test: /\.css$/,
        use: {
          loader: 'style-loader',
          loader: 'css-loader',
        },
      },
      {
        test: /\.png|jpg|gif$/,
        use: {
          loader: 'url-loader',
        },
      },
      {
        test: /\.svg$/,
        use: {
          loader: 'url-loader',
          options: {
            generator: (content) => svgToMiniDataURI(content.toString()),
          },
        },
      },
    ],
  },
};
