const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    entry: './js/index.js',
    output: {
        filename: 'main.js',
        // 输出到根目录
        path: path.resolve(__dirname),
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    process.env.NODE_ENV === 'production'
                        ? MiniCssExtractPlugin.loader
                        : 'style-loader',
                    'css-loader',
                ],
            },
            {
                // 处理图片文件
                test: /\.(png|jpg|jpeg|gif|svg)$/i,
                type: 'asset/resource',
                generator: {
                    // 指定图片输出路径到根目录的 image 文件夹
                    filename: 'image/[name][ext]'
                }
            }
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'styles.css',
        }),
        new webpack.HotModuleReplacementPlugin()
    ],
    optimization: {
        minimizer: [
            new TerserPlugin(),
            new CssMinimizerPlugin(),
        ],
    },
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devServer: {
        static: {
            directory: path.join(__dirname),
        },
        hot: true,
        open: true
    },
    watchOptions: {
        poll: true,
        ignored: /node_modules/
    }
};    