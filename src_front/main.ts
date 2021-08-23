import Config from '@/utils/Config';
import Vue from 'vue';
import { Route } from 'vue-router';
import App from './App.vue';
import './less/index.less';
import router from './router';
import store from './store';
import vueHeadful from 'vue-headful';
import IRCClient from './utils/IRCClient';
import IRCEvent from './utils/IRCEvent';
import Api from './utils/Api';
import Utils from './utils/Utils';

Vue.config.productionTip = false;
Vue.component('vue-headful', vueHeadful);
Config.init();

router.beforeEach(async (to: Route, from: Route, next: Function) => {
	if (!store.state.initComplete) {
		try {
			await store.dispatch("startApp", { route: to });
		}catch(error) {
			//Ignore
		}
	}
	next();
});

//Used if bot is enabled to make custom shoutouts
IRCClient.instance.addEventListener(IRCEvent.MESSAGE, async (event:IRCEvent)=> {
	let message = event.message.toLowerCase().trim();
	let chunks = message.split(/ /gi);
	if(store.state.botEnabled
	&& chunks[0] == store.state.botCommand.toLowerCase().trim()
	&& Utils.getRouteMetaValue(router.currentRoute, "lightMode") === true) {
		let description:string;
		let login = chunks[1];
		try {
			description = await Api.get("description", {login});
		}catch(error) {
			//Ignore
			if(!store.state.botDescriptionFallback) return;
			let infos = await Api.get("private/user_infos", {channels:[login]});
			if(infos?.data?.length > 0) {
				description = infos.data[0].description;
			}else{
				return;
			}		
		}
		if(description) {
			let chatMessage = store.state.botText.replace(/{description}/gi, description);
			chatMessage = chatMessage.replace(/{pseudo}/gi, login);
			await IRCClient.instance.sendMessage(chatMessage);
		}
	}
});

new Vue({
	router,
	store,
	render: h => h(App)
}).$mount('#app')
