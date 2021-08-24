import { Express, Request, Response } from "express-serve-static-core";
import * as fs from "fs";
import fetch, { Response as FetchResponse } from "node-fetch";
import Config from "../utils/Config";
import Logger from "../utils/Logger";
import TwitchUtils from "../utils/TwitchUtils";
import UserData from "../utils/UserData";
import Utils from "../utils/Utils";

/**
* Created : 08/07/2021 
*/
export default class APIController {

	private _app:Express;
	private _usersCache:{[key:string]:UserData[]} = {};
	private static _CACHE_INVALIDATED:boolean;
	
	constructor() {
		this.initialize();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public create(app:Express):void {
		this._app = app;

		//==============
		//PUBLIC ROUTES
		//==============
		//Get all users of current profile
		this._app.get("/api/user_names", (req:Request, res:Response) => this.getUserNames(req,res));
		//Get description of a specific user
		this._app.get("/api/description", (req:Request, res:Response) => this.getUserDescription(req,res));
		
		//==============
		//PRIVATE ROUTES
		//==============
		//Get current profile name from domain origin
		this._app.get("/api/private/profile/current", (req:Request, res:Response) => this.getProfileName(req,res));
		//Get all profiles list
		this._app.get("/api/private/profile/list", (req:Request, res:Response) => this.getProfileList(req,res));
		//Get twitch app client ID
		this._app.get("/api/private/client_id", (req:Request, res:Response) => this.getClientID(req,res));
		//Get a twitch user info
		this._app.get("/api/private/user_infos", (req:Request, res:Response) => this.getUserInfos(req,res));
		//Get stream infos for current profile
		this._app.get("/api/private/stream_infos", (req:Request, res:Response) => this.getStreamInfos(req,res));
		
		//====================
		//PUBLIC PROTECTED API
		//====================
		//These services are protected by a token.
		//Check app.all("/api/*") middleware on HTTPServer.ts
		
		//Add a user
		this._app.post("/api/user", (req:Request, res:Response) => this.postUser(req,res));
		//Delete a user
		this._app.delete("/api/user", (req:Request, res:Response) => this.deleteUser(req,res));
		//Add a description to a user
		this._app.post("/api/description", (req:Request, res:Response) => this.postUserDescription(req,res));
		//Remove the description from a user
		this._app.delete("/api/description", (req:Request, res:Response) => this.deleteUserDescription(req,res));
	}

	public static invalidateCache():void {
		this._CACHE_INVALIDATED = true;
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
	}

	/**
	 * Gets the current profile name
	 * 
	 * @param req 
	 * @param res 
	 */
	private async getProfileName(req:Request, res:Response):Promise<void> {
		let profile = Utils.getProfile(req);
		res.status(200).json({success:true, profile});
	}

	/**
	 * Gets all the profiles list
	 * 
	 * @param req 
	 * @param res 
	 */
	private async getProfileList(req:Request, res:Response):Promise<void> {
		let profiles = Utils.getProfileList();
		res.status(200).json({success:true, profiles});
	}

	/**
	 * Gets app client ID
	 * 
	 * @param req 
	 * @param res 
	 */
	private async getClientID(req:Request, res:Response):Promise<void> {
		res.status(200).json({success:true, id:Config.TWITCHAPP_CLIENT_ID});
	}

	/**
	 * Gets all user names
	 * 
	 * @param req 
	 * @param res 
	 */
	private async getUserNames(req:Request, res:Response):Promise<void> {
		let users;
		try {
			users = Utils.getUserList(req);
		}catch(err){
			users = [];
		}
		res.status(200).send(JSON.stringify({success:true, data:users}));
	}

	/**
	 * Adds a user to the list
	 * 
	 * @param req 
	 * @param res 
	 */
	private async postUser(req:Request, res:Response):Promise<void> {
		let login = (<string>req.query.login)?.toLowerCase();
		let users = Utils.getUserList(req);
		let userIndex = users.findIndex(v => v.name?.toLowerCase() == login?.toLowerCase());
		Logger.info(`Add user: ${login}`);
		if(userIndex == -1) {
			users.push({
				name:login,
				created_at:Date.now(),
			});
			fs.writeFileSync(Config.TWITCH_USERS_FILE(req), JSON.stringify(users));
			res.status(200).send(JSON.stringify({success:true, data:users}));
		}else{
			Logger.warn(`User ${login} already added`);
			res.status(200).send(JSON.stringify({success:false, error:"User already added", error_code:"USER_ALREADY_ADDED"}));
		}
	}

	/**
	 * Removes a user from the list
	 * 
	 * @param req 
	 * @param res 
	 */
	private async deleteUser(req:Request, res:Response):Promise<void> {
		let login = (<string>req.query.login)?.toLowerCase();
		let users = Utils.getUserList(req);
		let userIndex = users.findIndex(v => v.name?.toLowerCase() == login?.toLowerCase());
		Logger.info(`Delete user: ${login}`);
		if(userIndex > -1) {
			users.splice(userIndex, 1);
			fs.writeFileSync(Config.TWITCH_USERS_FILE(req), JSON.stringify(users));
			res.status(200).send(JSON.stringify({success:true, data:users}));
		}else{
			Logger.warn(`User ${login} not found`);
			res.status(200).send(JSON.stringify({success:false, error:"User not found", error_code:"USER_NOT_FOUND"}));
		}
	}

	/**
	 * Gets the description of a specific twitch user
	 * 
	 * @param req needs a "login" parameter
	 * @param res 
	 */
	private async getUserDescription(req:Request, res:Response):Promise<void> {
		let login = (<string>req.query.login)?.toLowerCase();
		let users = this.getCachedUserList(req);
		let userIndex = users.findIndex(v => v.name?.toLowerCase() == login?.toLowerCase());
		if(users && userIndex > -1) {
			res.status(200).send(users.find(v => v.name == login).description);
		}else{
			res.status(404).send("");
		}
	}

	/**
	 * Adds a user's description to the list
	 * 
	 * @param req 
	 * @param res 
	 */
	private async postUserDescription(req:Request, res:Response):Promise<void> {
		let login = (<string>req.query.login)?.toLowerCase();
		let description = <string>req.query.description;
		if(!description) description = <string>req.body.description;
		Logger.info(`Add user description: ${login}`);
		if(description) {
			let users = this.getCachedUserList(req);
			let userIndex = users.findIndex(v => v.name?.toLowerCase() == login?.toLowerCase());
			users[userIndex].description = description;
			let profile:string = Utils.getProfile(req);
			this._usersCache[profile] = users;
			fs.writeFileSync(Config.TWITCH_USERS_FILE(req), JSON.stringify(users));
			res.status(200).send(JSON.stringify({success:true, data:users[userIndex]}));
		}else{
			Logger.warn(`Missing description param`);
			res.status(200).send(JSON.stringify({success:false, error:"Missing \"description\" parameter", error_code:"MISSING_DESCRIPTION"}));
		}
	}

	/**
	 * Removes a user's description
	 * 
	 * @param req 
	 * @param res 
	 */
	private async deleteUserDescription(req:Request, res:Response):Promise<void> {
		let login = (<string>req.query.login)?.toLowerCase();
		let users = this.getCachedUserList(req);
		let userIndex = users.findIndex(v => v.name?.toLowerCase() == login?.toLowerCase());
		Logger.info(`Delete user description: ${login}`);
		if(userIndex > -1) {
			delete users[userIndex].description;
			let profile:string = Utils.getProfile(req);
			this._usersCache[profile] = users;
			fs.writeFileSync(Config.TWITCH_USERS_FILE(req), JSON.stringify(users));
			res.status(200).send(JSON.stringify({success:true, data:users}));
		}else{
			Logger.warn(`User ${login} not found`);
			res.status(200).send(JSON.stringify({success:false, error:"DNo description found for this user", error_code:"USER_NOT_FOUND"}));
			return
		}
	}

	/**
	 * Gets 1 to 100 stream status infos
	 * 
	 * @param req 
	 * @param res 
	 */
	private async getStreamInfos(req:Request, res:Response):Promise<void> {
		// let channels:string = <string>req.query.channels;
		let userList = this.getCachedUserList(req);
		let userListRef = userList.concat();
		let result = [];
		let batchSize = 100;
		do {
			let list = userList.splice(0,batchSize).map(v => v.name);
			try {
				let channelRequest = await TwitchUtils.loadChannelsInfo(list);
				let channelJson = await channelRequest.json();
				let channelsInfos = channelJson.data;
				result = result.concat(channelsInfos);

				let jsonStreams = await TwitchUtils.getStreamsInfos(list);
				//Inject local user infos to data
				for (let j = 0; j < channelsInfos.length; j++) {
					const c = channelsInfos[j];
					let userIndex = userListRef.findIndex(v => v.name.toLowerCase() == c.display_name.toLowerCase());
					c.rawData = userListRef[userIndex];

					let streamindex = jsonStreams.data.findIndex(v => v.user_name.toLowerCase() == c.display_name.toLowerCase());
					if(userIndex > -1) {
						c.streamInfos = jsonStreams.data[streamindex];
					}
			}
			}catch(error){
				console.log(error);
				res.status(500).send(error);
			}
		}while(userList.length > 0);
		res.status(200).send(JSON.stringify({success:true, data:result}));
	}

	/**
	 * Gets info of the specified user(s)
	 * 
	 * @param req 
	 * @param res 
	 */
	private async getUserInfos(req:Request, res:Response):Promise<void> {
		let channels:string = <string>req.query.channels;

		let result = await TwitchUtils.loadChannelsInfo(channels.split(","));

		if(result.status != 200) {
			let txt = await result.text();
			res.status(result.status).send(txt);
		}else{
			let json = await result.json();
			res.status(200).send(JSON.stringify({success:true, data:json.data}));
		}
	}

	/**
	 * Gets a description from cache
	 */
	private getCachedUserList(req:Request):UserData[] {
		let profile:string = Utils.getProfile(req);
		if(APIController._CACHE_INVALIDATED) {
			this._usersCache[profile] = null;
			APIController._CACHE_INVALIDATED = false;
		}
		if(!this._usersCache[profile]) {
			let users = Utils.getUserList(req);
			this._usersCache[profile] = users;
		}
		return this._usersCache[profile].concat();
	}

}