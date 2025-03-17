const path = require('path');

module.exports = {
  mode: 'production', // 开发模式
  entry: './js/index.js', // 入口文件
  output: {
    filename: 'main.js', // 输出文件名
    path: path.resolve(__dirname, 'dist'), // 输出目录
  },
};