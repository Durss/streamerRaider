const fs = require('fs');
module.exports = {

	chainWebpack: (config) => {
		//Avoids auto preload of lazylaoded routes
		config.plugins.delete("prefetch");
	},

	configureWebpack: {
		resolve: {
			alias: {
				'@': __dirname + '/src_front'
			}
		},
		entry: {
			app: './src_front/main.ts'
		},
		optimization: {
			minimize: false,//Avoids minifying the index which would break share meta for whtasapp
			splitChunks: {
				// minSize: 10000,
				// maxSize: 250000,
				cacheGroups: {
					commons: {
						test: /[\\/]node_modules[\\/]/,
						name: 'vendors',
						chunks: 'all'
					}
				}
			}
		}
	},

	css: {
		loaderOptions: {
			less: {
				additionalData: `@import (reference) "@/less/index.less";@import (reference) "@/less/_includes.less";`
			}
		}
	}
}