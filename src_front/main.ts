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
	if(store.state.botEnabled && message.indexOf(store.state.botCommand.toLowerCase().trim()) === 0) {
		let description:string;
		let login = message.split(/ /gi)[1];
		try {
			description = await Api.get("description", {login});
		}catch(error) {
			//Ignore
			if(!store.state.botDescriptionFallback) return;
			let infos = await Api.get("user_infos", {channels:[login]});
			console.log(infos);
			if(infos?.data?.length > 0) {
				description = infos.data[0].description;
			}else{
				return;
			}		
		}
		if(description) {
			let chatMessage = store.state.botText.replace(/{description}/gi, description);
			chatMessage = chatMessage.replace(/{pseudo}/gi, event.channel.substr(1));
			await IRCClient.instance.sendMessage(chatMessage);
		}
	}
});

new Vue({
	router,
	store,
	render: h => h(App)
}).$mount('#app')
