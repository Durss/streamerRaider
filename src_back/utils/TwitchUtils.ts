import fetch, { Response as FetchResponse } from "node-fetch";
import Config from "./Config";
import Logger from "./Logger";
import Utils from "./Utils";

/**
* Created : 08/07/2021 
*/
export default class TwitchUtils {

	private static _token:string;
	private static _token_invalidation_date:number;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/

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
	public static async getClientCredentialToken(force:boolean = false):Promise<string> {
		//Invalidate token if expiration date is passed
		if(Date.now() > this._token_invalidation_date || force) this._token = null;
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
			this._token_invalidation_date = Date.now() + (json.expires_in - 60000);
			return json.access_token;
		}else{
			throw("Token generation failed");
		}
	}

	public static async loadChannelsInfo(logins:string[], ids?:string[], failSafe:boolean = true):Promise<FetchResponse> {
		await this.getClientCredentialToken();//This will refresh the token if necessary

		if(logins?.length > 100 || ids?.length > 100) {
			Logger.warn("You cannot load more than 100 profiles at once !");
			throw("You cannot load more than 100 profiles at once !");
		}

		if(ids) {
			ids = ids.filter(v => v != null && v != undefined);
		}
		if(logins) {
			logins = logins.filter(v => v != null && v != undefined);
			logins = logins.map(v => encodeURIComponent(Utils.replaceDiacritics(v)));
		}
		
		let params = logins ? "login="+logins.join("&login=") : "id="+ids.join("&id=");
		let url = "https://api.twitch.tv/helix/users?"+params;
		let result = await fetch(url, {
			headers:{
				"Client-ID": Config.TWITCHAPP_CLIENT_ID,
				"Authorization": "Bearer "+this._token,
				"Content-Type": "application/json",
			}
		});
		//Token seem to expire before it's actual EOL date.
		//Make sure here the next request will work.
		if(result.status == 401) {
			this.getClientCredentialToken(true);
			if(failSafe) {
				return await this.loadChannelsInfo(logins, ids, false);
			}
		}
		return result;
	}

	public static async getStreamsInfos(logins:string[], ids?:string[], failSafe:boolean = true):Promise<{data:TwitchStreamInfos[]}> {
		await this.getClientCredentialToken();//This will refresh the token if necessary

		if(ids) {
			ids = ids.filter(v => v != null && v != undefined);
		}
		if(logins) {
			logins = logins.filter(v => v != null && v != undefined);
		}

		let params = logins ? "user_login="+logins.join("&user_login=") : "user_id="+ids.join("&user_id=");
		let url = "https://api.twitch.tv/helix/streams?"+params;
		
		let result = await fetch(url, {
			headers:{
				"Client-ID": Config.TWITCHAPP_CLIENT_ID,
				"Authorization": "Bearer "+this._token,
				"Content-Type": "application/json",
			}
		});
		
		if(result.status != 200) {
			//Token seem to expire before it's actual EOL date.
			//Make sure here the next request will work.
			if(result.status == 401) {
				this.getClientCredentialToken(true);
				if(failSafe) {
					return await this.getStreamsInfos(logins, ids, false);
				}
			}
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
}

export interface TwitchStreamInfos {
	id:string;
	user_id:string;
	user_login:string;
	user_name:string;
	game_id:string;
	game_name:string;
	type:string;
	title:string;
	viewer_count:number;
	started_at:string;
	language:string;
	thumbnail_url:string;
	tag_ids:string[];
	is_mature:boolean;
}