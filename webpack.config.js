const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  // 获取所有页面文件名（不包含扩展名）
  const pagesDir = path.resolve(__dirname, 'ejs/pages');
  const pageFiles = fs.readdirSync(pagesDir).filter(file => file.endsWith('.ejs'));
  const pageNames = pageFiles.map(file => path.basename(file, '.ejs'));

  // 标题配置函数
  const getTitle = (page) => {
    switch (page) {
      default: return '‎';
    }
  };

  // 为每个页面生成 HtmlWebpackPlugin 实例
  const htmlPlugins = pageNames.map(page => {
    const templatePath = path.resolve(pagesDir, `${page}.ejs`);
    const ejsTemplate = fs.readFileSync(templatePath, 'utf-8');
    const compiledHTML = ejs.render(ejsTemplate, {
      title: getTitle(page),
      titleId: `${page}_title`
    }, {
      filename: templatePath,
      root: path.resolve(__dirname, 'ejs') // 让 include 正确解析
    });

    // 根据页面名称设置输出路径
    const outputDir = page === 'index' ? '' : 'page';

    return new HtmlWebpackPlugin({
      filename: path.join(outputDir, `${page}.html`), // 输出文件名和文件夹
      templateContent: compiledHTML,
      minify: isProduction ? {
        collapseWhitespace: true,
        removeComments: true
      } : false,
    });
  });

  return {
    entry: './js/index.js',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, ''),
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
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'image/[name][ext]'
          }
        },
        {
          test: /\.html$/,
          use: ['html-loader']
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'styles.css',
        chunkFilename: '[id].css'
      }),
      ...htmlPlugins
    ],
    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            compress: {
              drop_console: true
            }
          }
        }),
        new CssMinimizerPlugin()
      ]
    },
    mode: isProduction ? 'production' : 'development',
    devServer: {
      static: {
        directory: path.join(__dirname, '')
      },
      hot: true,
      open: true
    },
    watchOptions: {
      poll: true,
      ignored: /node_modules/
    }
  };
};
