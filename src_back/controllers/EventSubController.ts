import { HmacSHA256 } from "crypto-js";
import { Express, Request, Response } from "express-serve-static-core";
import Config from "../utils/Config";
import Logger, { LogStyle } from '../utils/Logger';
import TwitchUtils from "../utils/TwitchUtils";
import fetch from "node-fetch";
import { EventDispatcher } from "../utils/EventDispatcher";
import RaiderEvent from "../utils/RaiderEvent";

/**
* Created : 25/10/2021 
*/
export default class EventSubController extends EventDispatcher {

	private app:Express;
	private url:string=null;
	private token:string=null;
	private idsParsed:{[key:string]:boolean} = {};
	private lastUserAlert:{[key:string]:number} = {};
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async create(app:Express):Promise<void> {
		this.app = app;
		this.app.post("/api/eventsubcallback", (req:Request,res:Response) => this.eventSub(req,res));
		
		this.url = Config.EVENTSUB_CALLBACK.replace(/\/+$/gi, "")+"/";
		
		if(this.url) {
			this.token = await TwitchUtils.getClientCredentialToken();
			await this.unsubPrevious();
			// await this.subToUser("647389082");
			this.onReady();
		}
	}

	/**
	 * Subscribes to a specific user
	 * 
	 * @param uid	twitch user ID 
	 */
	public async subToUser(profile:string, uid:string):Promise<void> {
		if(!this.url) {
			Logger.warn("📢 EventSub is missing a callback URI to be initialized !");
			return;
		}
		if(!Config.EVENTSUB_SECRET) {
			Logger.warn("📢 EventSub is missing a secret passphrase to be initialized !");
			return;
		}
		let condition:any = {
			"broadcaster_user_id": uid
		};

		let opts = {
			method:"POST",
			headers:{
				"Client-ID": Config.TWITCHAPP_CLIENT_ID,
				"Authorization": "Bearer "+this.token,
				"Content-Type": "application/json",
			},
			body:JSON.stringify({
				"type": "stream.online",
				"version": "1",
				"condition": condition,
				"transport": {
					"method": "webhook",
					"callback": this.url+"api/eventsubcallback?profile="+profile,
					"secret": Config.EVENTSUB_SECRET,
				}
			})
		}
		
		try {
			let res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", opts);
			if(res.status == 403) {
				this.logOAuthURL();
			}
			// console.log(await res.json());
		}catch(error) {
			Logger.error("📢 EventSub subscription error for user:", uid);
			//Try again
			this.subToUser(profile, uid);
			// console.log(error);
		}
		Logger.info("📢 Sub to "+uid+" for profile "+profile);
	}


	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private async onReady():Promise<void> {
		Logger.success("📢 EventSub ready");
	}

	/**
	 * Called when receiving an event
	 * 
	 * @param req 
	 * @param res 
	 * @returns 
	 */
	private async eventSub(req:Request, res:Response):Promise<void> {
		let json:EventSubMessage = <EventSubMessage>req.body;
		let id = <string>req.headers["twitch-eventsub-message-id"];
		let data = req.body.event;

		//Filter out IDs already parsed
		if(this.idsParsed[id] === true) {
			// console.log("Ignore", id);
			res.status(200);
			return;
		}

		if(json.subscription.status == "webhook_callback_verification_pending") {
			//Challenging EventSub signature
			let sig = <string>req.headers["twitch-eventsub-message-signature"];
			let ts = <string>req.headers["twitch-eventsub-message-timestamp"];
			let hash = "sha256="+HmacSHA256(id+ts+JSON.stringify(req.body), Config.EVENTSUB_SECRET).toString();
			if(hash != sig) {
				Logger.error("📢 Invalid signature challenge")
				res.status(401);
				return;
			}
			Logger.success("📢 EventSub challenge completed for "+json.subscription.type)
			res.status(200).send(req.body.challenge);
			return;

		}else{
			if(data.type == "live") {
				Logger.info("📢 A channel went live : "+data.broadcaster_user_name)
				let uid = data.broadcaster_user_id;
				let lastAlert = this.lastUserAlert[uid] || 999999;
				//Alert only once per 30min
				if(Date.now() - lastAlert > 1000 * 60 * 30) {
					this.lastUserAlert[uid] = Date.now();
					let profile = json.subscription.transport.callback.split("profile=")[1];
					this.dispatchEvent(new RaiderEvent(RaiderEvent.DISCORD_ALERT_LIVE, profile, uid));
				}
			}
			// {
			// 	subscription: {
			// 	  id: '93662c80-fb3a-44ed-b28e-76ae4c7ea0b7',     
			// 	  status: 'enabled',
			// 	  type: 'stream.online',
			// 	  version: '1',
			// 	  condition: { broadcaster_user_id: '647389082' },    transport: {
			// 		method: 'webhook',
			// 		callback: 'https://7251-2a01-e34-ec76-460-cdb5-4b7b-9d-74a4.ngrok.io/api/eventsubcallback'        
			// 	  },
			// 	  created_at: '2021-10-25T12:21:51.054736553Z',   
			// 	  cost: 1
			// 	},
			// 	event: {
			// 	  id: '43621318732',
			// 	  broadcaster_user_id: '647389082',
			// 	  broadcaster_user_login: 'durssbot',
			// 	  broadcaster_user_name: 'DurssBot',
			// 	  type: 'live',
			// 	  started_at: '2021-10-25T12:22:29Z'
			// 	}
			//   }
		}
		this.idsParsed[id] = true;
		res.sendStatus(200);
	}
	/**
	 * Removes previous event sub
	 * 
	 * @returns 
	 */
	private async unsubPrevious():Promise<void> {
		let opts = {
			method:"GET",
			headers:{
				"Client-ID": Config.TWITCHAPP_CLIENT_ID,
				"Authorization": "Bearer "+this.token,
				"Content-Type": "application/json",
			}
		}
		let res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", opts);
		let json = await res.json();
		if(res.status == 401) {
			this.logOAuthURL();
			return;
		}
		
		console.log("Cleaning up "+json.data.length+" subscriptions");
		for (let i = 0; i < json.data.length; i++) {
			const e = json.data[i];
			Logger.info("📢 Cleanup prev EventSub",e.id);
			// if(e.transport.callback.indexOf("ngrok") > -1) {
				let opts = {
					method:"DELETE",
					headers:{
						"Client-ID": Config.TWITCHAPP_CLIENT_ID,
						"Authorization": "Bearer "+this.token,
						"Content-Type": "application/json",
					}
				}
				await fetch("https://api.twitch.tv/helix/eventsub/subscriptions?id="+e.id, opts).catch(error=>{
					Logger.error("📢 EventSub Cleanup error for:", e.type)
				})
			// }
		}
	}

	/**
	 * Displays OAuth URL to accept scopes access
	 */
	private logOAuthURL():void {
		Logger.error("📢 Authorization must be granted to the Twitch app !");
		Logger.error("📢 Open this URL on the browser");
		console.log(LogStyle.BgRed+"https://id.twitch.tv/oauth2/authorize?client_id="+Config.TWITCHAPP_CLIENT_ID+"&redirect_uri=http%3A%2F%2Flocalhost%3A3009%2Foauth&response_type=token&scope="+Config.EVENTSUB_SCOPES+LogStyle.Reset);
	}

}

export interface EventSubMessage {
	subscription: EventSubMessageSubType.Subscription;
	event: EventSubMessageSubType.Event;
}

export declare module EventSubMessageSubType {

    export interface Condition {
        broadcaster_user_id: string;
    }

    export interface Transport {
        method: string;
        callback: string;
    }

    export interface Subscription {
        id: string;
        status: string;
        type: string;
        version: string;
        cost: number;
        condition: Condition;
        transport: Transport;
        created_at: Date;
    }

    export interface Event {
        user_id: string;
        user_login: string;
        user_name: string;
        broadcaster_user_id: string;
        broadcaster_user_login: string;
        broadcaster_user_name: string;
		user_input: string;
		status: string;
		redeemed_at: string;
		reward: {
			id: string;
			title: string;
			prompt: string;
			cost: number;
		};
	}
}