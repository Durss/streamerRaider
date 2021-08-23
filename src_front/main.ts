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
	let badges = event?.tags?.badges;
	let roles = store.state.botRoles;

	//Decompose command to extract parameters
	let chunks = message.split(/ /gi);
	if(store.state.botEnabled
	&& chunks[0] == store.state.botCommand.toLowerCase().trim()
	&& Utils.getRouteMetaValue(router.currentRoute, "lightMode") === true) {

		//Check if user has proper role to make a shoutout
		let allowed = roles.includes("viewer") || badges["broadcaster"]=="1";
		for (let i = 0; i < roles.length; i++) {
			const r = roles[i];
			if(badges[r] == "1") {
				allowed = true;
				break;
			}
		}
	
		//User not allowed, stop there !
		if(!allowed) return;

		console.log("DO SHOUTOU");

		//User allowed, execute shoutout
		let description:string;
		let login = chunks[1];
		try {
			//Get user description
			description = await Api.get("description", {login});
		}catch(error) {
			//We get a 404 if no description is found on the local description.
			//If fallback is not enabled, stop there
			if(!store.state.botDescriptionFallback) return;

			//Fallback description option enabled, get twitch channel description
			let infos = await Api.get("private/user_infos", {channels:[login]});
			if(infos?.length > 0) {
				description = infos[0].description;
			}
		}
		if(description?.length > 0) {
			//a description has been found, execute the shoutout
			let chatMessage = store.state.botText.replace(/\{DESCRIPTION\}/gi, description);
			chatMessage = chatMessage.replace(/\{PSEUDO\}/gi, login);
			await IRCClient.instance.sendMessage(chatMessage);
		}else{
			//If user has no description anywhere, cut the message like a butcher after {PSEUDO} placeholder
			let chatMessage = store.state.botText.replace(/(.*?\{PSEUDO\}[^ ]{0,2}).*/gi, "$1");
			chatMessage = chatMessage.replace(/\{DESCRIPTION\}/gi, "");//Cleaning just in case the butchery wasn't enough....
			chatMessage = chatMessage.replace(/\{PSEUDO\}/gi, login);
			await IRCClient.instance.sendMessage(chatMessage);

		}
	}
});

new Vue({
	router,
	store,
	render: h => h(App)
}).$mount('#app')
