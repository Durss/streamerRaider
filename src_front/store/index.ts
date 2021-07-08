import Api from '@/utils/Api';
import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import TwitchUtils from '@/utils/TwitchUtils';
import Vue from 'vue';
import Vuex from 'vuex';
import Store from './Store';

Vue.use(Vuex)

export default new Vuex.Store({
	state: {
		OAuthToken: "",//Stores the OAUth user access token
		clientID: "",//Store the twitch app client ID loaded from server
		userLogin: "",//Stores the current user's login
		initComplete: false,
		tooltip: null,
		alert: null,
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
		setClientID(state, payload) { state.clientID = payload; },

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
					state.OAuthToken = token;
					Store.set("OAuthToken", token);
					IRCClient.instance.initialize(result.login, token);
				}
			}
		},

		confirm(state, payload) { state.confirm = payload; },

		alert(state, payload) { state.alert = payload; },

		openTooltip(state, payload) { state.tooltip = payload; },
		
		closeTooltip(state) { state.tooltip = null; },

	},
	actions: {
		async startApp({ state, commit, dispatch }, payload) { 
			let token = Store.get("OAuthToken")
			//Check if token is valid and has all needed scopes
			if(token) {
				let tokenValid = true;
				try {
					console.log(token);
					let result = await TwitchUtils.validateToken(token);
					let scopes:string[] = result.scopes;
					let expectedScopes = Config.TWITCH_SCOPES;
					for (let i = 0; i < expectedScopes.length; i++) {
						if(scopes.indexOf(expectedScopes[i]) == -1) {
							tokenValid = false;
							break;
						}
					}
				}catch(error) {
					tokenValid = false;
				}
				if(!tokenValid) {
					commit("setOAuthToken", null);
				}else{
					commit("setOAuthToken", token);
				}
			}

			let res = await Api.get("client_id");
			commit("setClientID", res.id);

			state.initComplete = true;
			return true;
		},

		setClientID({ commit }, token) { commit("setClientID", token); },

		setOAuthToken({ commit }, token) { commit("setOAuthToken", token); },

		confirm({commit}, payload) { commit("confirm", payload); },

		alert({commit}, payload) { commit("alert", payload); },

		openTooltip({commit}, payload) { commit("openTooltip", payload); },
		
		closeTooltip({commit}) { commit("closeTooltip", null); },

	},
})
