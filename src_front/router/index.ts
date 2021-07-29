import store from '@/store';
import Utils from "@/utils/Utils";
import Home from '@/views/Home.vue';
import OBSPanel from '@/views/OBSPanel.vue';
import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
	{
		path: '/',
		name: 'home',
		component: Home,
	},
	{
		path: '/obs',
		name: 'obs',
		meta: {
			lightMode:true,
		},
		component: Home,
	},
	{
		path: '/oauth',
		name: 'oauth',
		beforeEnter: (to,from,next)=> {
			let token = Utils.getQueryParameterByName("access_token");
			// let error = Utils.getQueryParameterByName("error");
			if(token) {
				store.dispatch("setOAuthToken", token);
			}else{
				store.dispatch("alert", "Vous avez refusé l'accès à l'application Twitch.");
			}
			router.push({name:"home"});
		},
	},
	{
		path: "*",
		redirect:to => {
			return {name:"home"}
		},
	},
]

const router = new VueRouter({
	mode: 'history',
	base: process.env.BASE_URL,
	routes
})

export default router
