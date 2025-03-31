const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './js/index.js',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname), // 输出到根目录
      publicPath: '/',
      assetModuleFilename: 'assets/[hash][ext][query]'
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'image/[name][ext]'
          }
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'styles.css', // 输出到根目录的styles.css
        chunkFilename: '[id].css'
      })
    ],
    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: { compress: { drop_console: true } }
        }),
        new CssMinimizerPlugin()
      ]
    },
    mode: isProduction ? 'production' : 'development',
    devServer: {
      static: { directory: path.join(__dirname) },
      hot: true,
      open: true
    },
    watchOptions: {
      poll: true,
      ignored: /node_modules/
    }
  };
};