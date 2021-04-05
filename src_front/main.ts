import Config from '@/utils/Config';
import Vue from 'vue';
import { Route } from 'vue-router';
import App from './App.vue';
import './less/index.less';
import router from './router';
import store from './store';

Vue.config.productionTip = false;
Config.init();

router.beforeEach(async (to: Route, from: Route, next: Function) => {
	if (!store.state.initComplete) {
		await store.dispatch("startApp", { route: to });
	}
	next();
});

new Vue({
	router,
	store,
	render: h => h(App)
}).$mount('#app')
