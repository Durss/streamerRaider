import { EventDispatcher } from "@/utils/EventDispatcher";
import * as tmi from "tmi.js";
import IRCEvent from "./IRCEvent";
import Vue from 'vue';

/**
* Created : 19/01/2021 
*/
export default class IRCClient extends EventDispatcher {

	private static _instance:IRCClient;
	private client:tmi.Client;
	private login:string;
	private isConnected:boolean = false;
	
	public token:string;
	public channel:string;
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():IRCClient {
		if(!IRCClient._instance) {
			IRCClient._instance = new IRCClient();
			Vue.observable(IRCClient.instance);
		}
		return IRCClient._instance;
	}

	public get connected():boolean {
		return this.isConnected;
	}

	public get authenticatedUserLogin():string {
		return this.login;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize(login:string, token:string):Promise<void> {
		return new Promise((resolve, reject) => {
			this.login = login;
			this.token = token;
	
			this.client = new tmi.Client({
				options: { debug: false, skipUpdatingEmotesets:true },
				connection: { reconnect: true },
				channels: [ login ],
				identity: {
					username: login,
					password: "oauth:"+token
				},
			});
	
			this.client.on("join", (channel, user, test)=> {
				this.channel = channel;
				if(user == this.login) {
					this.isConnected = true;
					console.log("IRCClient :: Connection succeed");
					resolve();
				}
			});

			//@ts-ignore dirty system event listener because i foudn no other
			//way to capture a connexion error...
			this.client.on("_promiseJoin", (message:string)=> {
				if(message && message.toLowerCase().indexOf("no response") > -1) {
					console.log("IRCClient :: Connection failed");
					reject();
				}
			});

			this.client.on("disconnected", (message:string)=> {
				console.log("IRCClient :: Disconnected");
				if(!this.isConnected) {
					reject();
				}
				this.isConnected = false;
			});
	
			this.client.on('message', (channel, tags, message, self) => {
				if(tags["message-type"] == "chat") {
					this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, message, <any>tags, channel, self));
				}
			});
	
			this.client.connect();
		})
	}

	public deleteMessage(id:string):void {
		this.client.deletemessage(this.channel, id);
	}

	public sendMessage(message:string):void {
		this.client.say(this.login, message);
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}


export declare module IRCTypes {

    export interface Badges {
        broadcaster: string;
        vip: string;
        moderator: string;
    }

    export interface Tag {
        "badge-info"?: any;
        "badges": Badges;
        "client-nonce": string;
        "color": string;
        "display-name": string;
        "emotes"?: any;
        "flags"?: any;
        "id": string;
        "mod": boolean;
        "room-id": string;
        "subscriber": boolean;
        "tmi-sent-ts": string;
        "turbo": boolean;
        "user-id": string;
        "user-type"?: any;
        "emotes-raw"?: any;
        "badge-info-raw"?: any;
        "badges-raw": string;
        "username": string;
        "message-type": string;
    }

}