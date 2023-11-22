import * as path from "path";
import {fileURLToPath} from 'url';
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";
import TerserPlugin from "terser-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFileName = `[name]${process.env.NODE_ENV=="production"?"-[chunkhash]":""}.js`;

export default {
    entry: './src/public/index.tsx',
    output: {
        path: path.resolve(__dirname, 'dist/public/assets'),
        filename: outputFileName,
        chunkFilename: outputFileName,
        publicPath: '/'
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
        splitChunks: { 
            cacheGroups: {
                react: {
                    test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
                    name: "react",
                    chunks: 'all',
                },
                luxon: {
                    test: /[\\/]node_modules[\\/](luxon)[\\/]/,
                    name: "luxon",
                    chunks: 'all'
                },
                vendor: {
                    test: /^(?=.*?\bnode_modules\b)((?!(react|react-dom|react-router|react-router-dom|luxon)).)*$/,
                    name: "vendor",
                    chunks: 'all'
                }
            }
        },
    },
    resolve: {
        extensions: ['.js', '.tsx', '.css', '.svg', '.png', '.ico']
    },
    devtool: `${process.env.NODE_ENV!=="production"?"inline-":""}source-map`,
    module: {
        rules: [
            {
                test: /\.tsx$/,
                loader: "ts-loader"
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                exclude: /node_modules/,
                use: [
                    { loader: 'style-loader' },
                    { 
                        loader: 'css-loader',
                        options: {			
                            modules: {
                                mode: "local",
                                auto: ()=>true,
                                localIdentName: `${process.env.NODE_ENV!="development"?"[hash:base64:5]":"[local]--[hash:base64:5]"}`,
                            },									
                            sourceMap: true
                        }
                     },
                     { 
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    [ 'autoprefixer', {}, ],
                                ],
                            },
                        }
                      }
                ]
            },
            {
                test: /\.(svg|png|jpeg|gif|ico)$/,
                loader: 'url-loader',
                options: {
                    limit: 8192,
                    context: "src/public/assets",
                    name: "[path][name].[ext]",
                    publicPath: "/"
                }
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin.default({
            template: __dirname + '/src/public/index.html',
            filename: '../index.html',
            inject: 'head',
            publicPath: '/'
        }),
        new webpack.optimize.AggressiveMergingPlugin()
    ]
};