import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// Less globals previously injected through vue.config.js so every component
// has access to the shared variables/mixins without an explicit import.
const lessGlobals = `@import (reference) "@/less/index.less";@import (reference) "@/less/_includes.less";`;

export default defineConfig({
	plugins: [vue()],

	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src_front', import.meta.url)),
		},
	},

	server: {
		port: 8080,
	},

	build: {
		// Served by the express backend (Config.PUBLIC_PATH -> "./dist" in dev).
		outDir: 'dist',
		emptyOutDir: true,
	},

	css: {
		preprocessorOptions: {
			less: {
				additionalData: lessGlobals,
				javascriptEnabled: true,
			},
		},
	},
});
