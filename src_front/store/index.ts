import Api from '@/utils/Api';
import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import TwitchUtils from '@/utils/TwitchUtils';
import { defineStore } from 'pinia';
import type { ProfileData } from '@/views/ProfileSwitcher.vue';
import Store from './Store';

interface ConfirmData {
	title:string;
	description:string;
	confirmCallback:Function;
	cancelCallback:Function;
	yesLabel:string;
	noLabel:string;
}

interface MainState {
	OAuthToken:string;
	clientID:string;
	userLogin:string;
	profile:ProfileData;
	initComplete:boolean;
	botToxicEnabled:boolean;
	botShoutoutEnabled:boolean;
	botDescriptionFallback:boolean;
	botRoles:string[];
	botCommand:string;
	botText:string;
	tooltip:string;
	alert:string;
	confirm:ConfirmData;
}

export const useMainStore = defineStore('main', {
	state: ():MainState => ({
		OAuthToken: "",//Stores the OAUth user access token
		clientID: "",//Store the twitch app client ID loaded from server
		userLogin: "",//Stores the current user's login
		profile: null,//Current profile if using multi-profiles configuration
		initComplete: false,
		botToxicEnabled: false,
		botShoutoutEnabled: false,
		botDescriptionFallback: true,
		botRoles: ["moderator"],
		botCommand: "",
		botText: "",
		tooltip: null,
		alert: null,
		confirm: {
			title: null,
			description: null,
			confirmCallback: null,
			cancelCallback: null,
			yesLabel: null,
			noLabel: null,
		},
	}),

	actions: {
		setClientID(payload:string) { this.clientID = payload; },

		setProfile(name:ProfileData) { this.profile = name; },

		async setOAuthToken(token:string) {
			if(!token) {
				this.OAuthToken = null;
				Store.remove("OAuthToken");
			}else{
				let result = await TwitchUtils.validateToken(token);
				if(result === false) {
					this.OAuthToken = null;
					Store.remove("OAuthToken");
				}else{
					this.userLogin = result.login;
					this.OAuthToken = token;
					Store.set("OAuthToken", token);
					IRCClient.instance.initialize(result.login, token);
				}
			}
		},

		openConfirm(payload:ConfirmData) { this.confirm = payload; },

		openAlert(payload:string) { this.alert = payload; },

		openTooltip(payload:string) { this.tooltip = payload; },

		closeTooltip() { this.tooltip = null; },

		logout() { this.setOAuthToken(null); },

		setBotShoutoutEnabled(payload:boolean) {
			this.botShoutoutEnabled = payload;
			Store.set("botShoutoutEnabled", payload? 'true' : 'false');
		},

		setBotToxicEnabled(payload:boolean) {
			this.botToxicEnabled = payload;
			Store.set("botToxicEnabled", payload? 'true' : 'false');
		},

		setBotCommand(payload:string) {
			if(payload) {
				this.botCommand = payload;
				Store.set("botCommand", payload);
			}
		},

		setBotText(payload:string) {
			if(payload) {
				this.botText = payload;
				Store.set("botText", payload);
			}
		},

		setBotDescriptionFallback(payload:boolean) {
			this.botDescriptionFallback = payload;
			Store.set("botDescriptionFallback", payload? 'true' : 'false');
		},

		setBotRoles(payload:string[]) {
			this.botRoles = payload;
			Store.set("botRoles", payload.join(','));
		},

		resetBotConfig(clearStorage:boolean = true) {
			this.botCommand = "!so";
			this.botText = "Allez follow twitch.tv/{PSEUDO} dont voici une description : {DESCRIPTION}";
			this.botDescriptionFallback = true;
			this.botRoles = ["moderator"];
			if(clearStorage === true) {
				Store.remove("botCommand");
				Store.remove("botText");
				Store.remove("botDescriptionFallback");
				Store.remove("botRoles");
			}
		},

		async startApp() {
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
					this.setOAuthToken(null);
				}else{
					this.setOAuthToken(token);
				}
			}

			this.resetBotConfig(false);

			let botShoutoutEnabled = Store.get("botShoutoutEnabled");
			if(botShoutoutEnabled === "true") this.botShoutoutEnabled = true;

			let botToxicEnabled = Store.get("botToxicEnabled");
			if(botToxicEnabled === "true") this.botToxicEnabled = true;

			let botCommand = Store.get("botCommand");
			if(botCommand) this.botCommand = botCommand;

			let botDescriptionFallback = Store.get("botDescriptionFallback");
			if(botDescriptionFallback!=undefined) this.botDescriptionFallback = botDescriptionFallback ==='true';

			let botRoles = Store.get("botRoles");
			if(botRoles!=undefined) this.botRoles = botRoles.split(",");

			let botText = Store.get("botText");
			if(botText) this.botText = botText;

			try {
				let res = await Api.get("private/client_id");
				this.setClientID(res.id);
			}catch(error) {}

			try {
				let res = await Api.get("private/profile/current");
				this.setProfile(res.profile);
			}catch(error) {}

			this.initComplete = true;
			return true;
		},
	},
});
