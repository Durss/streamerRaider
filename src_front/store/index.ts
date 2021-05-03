import IRCClient from '@/utils/IRCClient';
import TwitchUtils from '@/utils/TwitchUtils';
import Vue from 'vue';
import Vuex from 'vuex';
import Store from './Store';

Vue.use(Vuex)

export default new Vuex.Store({
	state: {
		OAuthToken: "",
		userLogin: "",
		initComplete: false,
		tooltip: null,
		confirm:{
			title:null,
			description:null,
			confirmCallback:null,
			cancelCallback:null,
			yesLabel:null,
			noLabel:null,
		},
	},
	mutations: {
		async setOAuthToken(state, token) {
			if(!token) {
				state.OAuthToken = null;
				Store.remove("OAuthToken");
			}else{
				let result = await TwitchUtils.validateToken(token);
				if(result === false) {
					state.OAuthToken = null;
					Store.remove("OAuthToken");
				}else{
					state.userLogin = result.login;
					state.OAuthToken = result;
					Store.set("OAuthToken", token);
					IRCClient.instance.initialize(result.login, token);
				}
			}
		},

		confirm(state, payload) { state.confirm = payload; },

		openTooltip(state, payload) { state.tooltip = payload; },
		
		closeTooltip(state) { state.tooltip = null; },

	},
	actions: {
		async startApp({ state, commit, dispatch }, payload) { 
			commit("setOAuthToken", Store.get("OAuthToken"));

			state.initComplete = true;
			return true;
		},

		setOAuthToken({ commit }, token) { commit("setOAuthToken", token); },

		confirm({commit}, payload) { commit("confirm", payload); },

		openTooltip({commit}, payload) { commit("openTooltip", payload); },
		
		closeTooltip({commit}) { commit("closeTooltip", null); },

	},
})
