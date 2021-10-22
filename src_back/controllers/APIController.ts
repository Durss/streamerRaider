import { Express, Request, Response } from "express-serve-static-core";
import * as fs from "fs";
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
	private _streamInfosCache:{[key:string]:{expires_at:number, data:any}} = {};
	private static _CACHE_INVALIDATED:{[key:string]:boolean} = {};
	
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
		//Get all users of current profile
		this._app.get("/api/user_list", (req:Request, res:Response) => this.getUserList(req,res));
		//Get description of a specific user
		this._app.get("/api/description", (req:Request, res:Response) => this.getUserDescription(req,res));
		//Get description of a specific user
		this._app.get("/api/online_count", (req:Request, res:Response) => this.getUsersOnlineCount(req,res));
		
		//==============
		//PRIVATE ROUTES
		//==============
		//Get current profile name from domain origin
		this._app.get("/api/private/profile/current", (req:Request, res:Response) => this.getProfileName(req,res));
		//Get all profiles list
		this._app.get("/api/private/profile/list", (req:Request, res:Response) => this.getProfileList(req,res));
		//Get twitch app client ID
		this._app.get("/api/private/client_id", (req:Request, res:Response) => this.getClientID(req,res));
		//Get a twitch user info (used by shoutout bot)
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

	public static invalidateCache(profile:string):void {
		this._CACHE_INVALIDATED[profile] = true;
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
			users = Utils.getUserList(req).map(user => user.name);
		}catch(err){
			users = [];
		}
		res.status(200).send(JSON.stringify({success:true, data:users}));
	}

	/**
	 * Gets all user infos
	 * 
	 * @param req 
	 * @param res 
	 */
	private async getUserList(req:Request, res:Response):Promise<void> {
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
			let twitchUserReq = await TwitchUtils.loadChannelsInfo([login]);
			let twitchUserData = await twitchUserReq.json();
			if(twitchUserData.data.length == 0) {
				//User not found on twitch
				res.status(500).send(JSON.stringify({success:false, message:"Twitch user "+login+" not found", error:"TWITCH_USER_NOT_FOUND"}));
			}else{
				//User found on twitch, save it
				users.push({
					id:twitchUserData.data[0].id,
					name:twitchUserData.data[0].display_name,
					created_at:Date.now(),
				});
				fs.writeFileSync(Config.TWITCH_USERS_FILE(req), JSON.stringify(users));
				res.status(200).send(JSON.stringify({success:true, data:users}));
			}
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
		let userIndex = users?.findIndex(v => v.name?.toLowerCase() == login?.toLowerCase());
		if(userIndex > -1 && users[userIndex].description) {
			res.status(200).send(users[userIndex].description);
		}else{
			res.status(404).send("");
		}
	}

	/**
	 * Gets the numbezr of users online
	 * 
	 * @param res 
	 */
	private async getUsersOnlineCount(req:Request, res:Response):Promise<void> {
		// let channels:string = <string>req.query.channels;
		let profile = Utils.getProfile(req);
		if(!this._streamInfosCache[profile]) {
			await this.getStreamInfos(req);
		}
		let users:{id:string, login:string, streamInfos?:any}[] = this._streamInfosCache[profile].data;
		let count = users.filter(v => v.streamInfos != undefined).length

		if(req.query.formated != undefined) {
			let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
	<meta charset="utf-8">
	<title>Online count</title>
	<meta content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0' name='viewport' />
	<meta name="robots" content="noindex, nofollow">
	<link rel="author" href="https://www.durss.ninja" />
	<link rel="canonical" href="http://protopotes.durss.ninja/">
	<meta http-equiv="refresh" content="60" >
	<style>
	.holder {
		display: flex;
		flex-direction: row;
		align-items: center;
	}
	.logo {
		width: 100px;
		margin-right: 20px;
	}
	.count {
		color: #8D24A9;
		font-size: 100px;
		font-weight: bold;
		
		text-shadow: -2px 2px 0 #fff, 2px 2px 0 #fff, 2px -2px 0 #fff, -2px -2px 0 #fff;
		font-family: Inter,Roobert,Helvetica Neue,Helvetica,Arial,sans-serif;
	}
	</style>
</head>

<body>
	<div class="holder">
		<img class="logo" src="/twitch_logo.svg" alt="Twitch logo" />
		<span class="count">${count}</span>
	</div>
</body>

</html>
			`;
			res.status(200).send(html);
		}else{
			res.status(200).send(count.toString());
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
	private async getStreamInfos(req:Request, res?:Response):Promise<void> {
		// let channels:string = <string>req.query.channels;
		let profile = Utils.getProfile(req);
		let expireDuration = (Date.now() - this._streamInfosCache[profile]?.expires_at) / 1000;
		let timeLeft = Config.STREAMERS_CACHE_DURATION - expireDuration;
		if(timeLeft <= 0) {
			this._streamInfosCache[profile] = null;//Force cache refresh
		}

		if(this._streamInfosCache[profile] && res) {
			res.header("Cache-Control", "max-age="+Math.ceil(timeLeft));
			res.status(200).send(JSON.stringify({success:true, data:this._streamInfosCache[profile].data}));
			return;
		}

		let userList = this.getCachedUserList(req);
		let userListRef = userList.concat();
		let result = [];
		let batchSize = 100;
		if(userList?.length > 0) {
			do {
				let list = userList.splice(0,batchSize).map(v => v.id);
				try {
					let channelRequest = await TwitchUtils.loadChannelsInfo(null, list);
					let channelJson = await channelRequest.json();
					let channelsInfos = channelJson.data;
					result = result.concat(channelsInfos);
					
					let jsonStreams = await TwitchUtils.getStreamsInfos(null, list);
					//Inject local user infos to data
					for (let j = 0; j < channelsInfos.length; j++) {
						const c = channelsInfos[j];
						let userIndex = userListRef.findIndex(v => v.id == c.id);
						c.rawData = userListRef[userIndex];

						let streamindex = jsonStreams.data.findIndex(v => v.user_id == c.id);
						if(userIndex > -1) {
							c.streamInfos = jsonStreams.data[streamindex];
						}
					}
				}catch(error){
					Logger.error("Error while loading channels infos")
					console.log(error);
					if(res) {
						res.status(500).send(error);
					}
					return;
				}
			}while(userList.length > 0);
		}

		this._streamInfosCache[profile] = {
			expires_at:Date.now(),
			data:result,
		};

		if(res) {
			res.header("Cache-Control", "max-age="+Math.ceil(Config.STREAMERS_CACHE_DURATION));
			res.status(200).send(JSON.stringify({success:true, data:result}));
		}
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
		if(APIController._CACHE_INVALIDATED[profile] !== false) {
			this._usersCache[profile] = null;
			APIController._CACHE_INVALIDATED[profile] = false;
		}
		if(!this._usersCache[profile]) {
			let users = Utils.getUserList(req);
			this._usersCache[profile] = users;
		}
		return this._usersCache[profile].concat();
	}

}