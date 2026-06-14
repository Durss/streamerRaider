import { useMainStore } from '@/store';
import Utils from "@/utils/Utils";
import Home from '@/views/Home.vue';
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
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
		component: Home,
		beforeEnter: (to,from,next)=> {
			const store = useMainStore();
			let token = Utils.getQueryParameterByName("access_token");
			let state = Utils.getQueryParameterByName("state");//Contains the route's name before auth flow
			// let error = Utils.getQueryParameterByName("error");
			if(token) {
				store.setOAuthToken(token);
			}else{
				store.openAlert("Vous avez refusé l'accès à l'application Twitch.");
			}
			next({name:state || 'home'});
		},
	},
	{
		path: "/:pathMatch(.*)*",
		redirect:to => {
			return {name:"home"}
		},
	},
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
})

export default router
