import fetch, { Response as FetchResponse } from "node-fetch";
import Config from "./Config";

/**
* Created : 08/07/2021 
*/
export default class TwitchUtils {

	private static _instance:TwitchUtils;
	private static _token:string;
	private static _token_invalidation_date:number;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TwitchUtils {
		if(!TwitchUtils._instance) {
			TwitchUtils._instance = new TwitchUtils();
			TwitchUtils._instance.initialize();
		}
		return TwitchUtils._instance;
	}

	public static get ready():boolean {
		return this._token != null && this._token != undefined;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/

	/**
	 * Generates a credential token if necessary from the client and private keys
	 * @returns 
	 */
	public static async getClientCredentialToken():Promise<string> {
		//Invalidate token if expiration date is passed
		if(Date.now() > this._token_invalidation_date) this._token = null;
		//Avoid generating a new token if one already exists
		if(this._token) return this._token;

		//Generate a new token
		let headers:any = {
		};
		var options = {
			method: "POST",
			headers: headers,
		};
		let result = await fetch("https://id.twitch.tv/oauth2/token?client_id="+Config.TWITCHAPP_CLIENT_ID+"&client_secret="+Config.TWITCHAPP_SECRET_ID+"&grant_type=client_credentials&scope=", options)
		if(result.status == 200) {
			let json =await result.json()
			this._token = json.access_token;
			this._token_invalidation_date = Date.now() + json.expires_in - 60000;
			return json.access_token;
		}else{
			throw("Token generation failed");
		}
	}

	public static async loadChannelsInfo(channels:string[]):Promise<FetchResponse> {
		await this.getClientCredentialToken();//This will refresh the token if necessary

		let url = "https://api.twitch.tv/helix/users?login="+channels.join("&login=");
		// let url = "https://api.twitch.tv/helix/users?login="+user;
		let result = await fetch(url, {
			headers:{
				"Client-ID": Config.TWITCHAPP_CLIENT_ID,
				"Authorization": "Bearer "+this._token,
				"Content-Type": "application/json",
			}
		});
		return result;
	}

	public static async getStreamsInfos(channels:string[]):Promise<any> {
		await this.getClientCredentialToken();//This will refresh the token if necessary

		let url = "https://api.twitch.tv/helix/streams?user_login="+channels.join("&user_login=");
		
		let result = await fetch(url, {
			headers:{
				"Client-ID": Config.TWITCHAPP_CLIENT_ID,
				"Authorization": "Bearer "+this._token,
				"Content-Type": "application/json",
			}
		});
		
		if(result.status != 200) {
			let txt = await result.text();
			throw(txt);
		}else{
			let json = await result.json();
			return json
		}
	}
	
	public static validateToken(token:string):Promise<boolean|any> {
		return new Promise((resolve, reject) => {
			let headers:any = {
				"Authorization":"OAuth "+token
			};
			var options = {
				method: "GET",
				headers: headers,
			};
			fetch("https://id.twitch.tv/oauth2/validate", options)
			.then(async(result) => {
				if(result.status == 200) {
					result.json().then((json)=> {
						resolve(json)
					});
				}else{
					resolve(false);
				}
			});
		});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}
}