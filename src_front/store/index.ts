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
		profileName: "",//Current profile if using multi-profiles configuration
		initComplete: false,
		botEnabled: false,
		botDescriptionFallback: true,
		botCommand: "",
		botText: "",
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
		
		setProfileName(state, name) { state.profileName = name; },

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
		
		setBotEnabled(state, payload) {
			state.botEnabled = payload;
			Store.set("botEnabled", payload? 'true' : 'false');
		},
		
		setBotCommand(state, payload) {
			if(payload) {
				state.botCommand = payload;
				Store.set("botCommand", payload);
			}
		},
		
		setBotText(state, payload) {
			if(payload) {
				state.botText = payload;
				Store.set("botText", payload);
			}
		},
		
		setBotDescriptionFallback(state, payload) {
			state.botDescriptionFallback = payload;
			Store.set("botDescriptionFallback", payload);
		},
		
		resetBotConfig(state, clearStorage) {
			state.botCommand = "!so";
			state.botText = "Allez follow www.twitch.tv/{PSEUDO} dont voici une description : {DESCRIPTION}";
			state.botDescriptionFallback = true;
			if(clearStorage === true) {
				Store.remove("botCommand");
				Store.remove("botText");
				Store.remove("botDescriptionFallback");
			}
		},

	},
	actions: {
		async startApp({ state, commit, dispatch }, payload) { 
			let token = Store.get("OAuthToken");
			//Check if token is valid and has all needed scopes
			if(token) {
				let tokenValid = true;
				try {
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
			
			commit("resetBotConfig", false);

			let botEnabled = Store.get("botEnabled");
			if(botEnabled === "true") state.botEnabled = true;
			
			let botCommand = Store.get("botCommand");
			if(botCommand) state.botCommand = botCommand;
			
			let botDescriptionFallback = Store.get("botDescriptionFallback");
			if(botCommand!=undefined) state.botDescriptionFallback = botDescriptionFallback ==='true';
			
			let botText = Store.get("botText");
			if(botText) state.botText = botText;
			
			try {
				let res = await Api.get("private/client_id");
				commit("setClientID", res.id);
			}catch(error) {}
			
			try {
				let res = await Api.get("private/profile/current");
				commit("setProfileName", res.profile);
			}catch(error) {}

			state.initComplete = true;
			return true;
		},

		setClientID({ commit }, id) { commit("setClientID", id); },

		setProfileName({ commit }, name) { commit("setProfileName", name); },

		setOAuthToken({ commit }, token) { commit("setOAuthToken", token); },

		confirm({commit}, payload) { commit("confirm", payload); },

		alert({commit}, payload) { commit("alert", payload); },

		openTooltip({commit}, payload) { commit("openTooltip", payload); },
		
		closeTooltip({commit}) { commit("closeTooltip", null); },
		
		logout({commit}) { commit("setOAuthToken", null); },
		
		setBotEnabled({commit}, payload) { commit("setBotEnabled", payload); },
		
		setBotCommand({commit}, payload) { commit("setBotCommand", payload); },

		setBotText({commit}, payload) { commit("setBotText", payload); },

		setBotDescriptionFallback({commit}, payload) { commit("setBotDescriptionFallback", payload); },

		resetBotConfig({commit}) { commit("resetBotConfig", true); },

	},
})
