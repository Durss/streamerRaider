import { Express, Request, Response } from "express-serve-static-core";
import * as fs from "fs";
import fetch, { Response as FetchResponse } from "node-fetch";
import Config from "../utils/Config";
import Logger from "../utils/Logger";
import TwitchUtils from "../utils/TwitchUtils";
import Utils from "../utils/Utils";

/**
* Created : 08/07/2021 
*/
export default class APIController {

	private _app:Express;
	private _descriptionsCaches:{[key:string]:{[key:string]:string}} = {};
	private static _DESCRIPTION_CACHE_INVALIDATED:boolean;
	
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
		this._app.get("/api/client_id", (req:Request, res:Response) => this.getClientID(req,res));

		this._app.get("/api/user_infos", (req:Request, res:Response) => this.getUserInfos(req,res));
		this._app.get("/api/stream_infos", (req:Request, res:Response) => this.getStreamInfos(req,res));
		this._app.get("/api/user_names", (req:Request, res:Response) => this.getUserNames(req,res));
		this._app.get("/api/description", (req:Request, res:Response) => this.getUserDescription(req,res));
		
		this._app.post("/api/user", (req:Request, res:Response) => this.postUser(req,res));
		this._app.delete("/api/user", (req:Request, res:Response) => this.deleteUser(req,res));

		this._app.post("/api/description", (req:Request, res:Response) => this.postUserDescription(req,res));
		this._app.delete("/api/description", (req:Request, res:Response) => this.deleteUserDescription(req,res));
	}

	public static invalidateDescriptionCache():void {
		this._DESCRIPTION_CACHE_INVALIDATED = true;
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
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
		let userIndex = users.indexOf(login);
		Logger.info(`Add user: ${login}`);
		if(userIndex == -1) {
			users.push(login);
			fs.writeFileSync(Config.TWITCH_USER_NAMES_FILE(req), JSON.stringify(users));
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
		let users:string[] = Utils.getUserList(req);
		let userIndex = users.indexOf(login);
		Logger.info(`Delete user: ${login}`);
		if(userIndex > -1) {
			users.splice(userIndex, 1);
			fs.writeFileSync(Config.TWITCH_USER_NAMES_FILE(req), JSON.stringify(users));
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
		let descriptions = this.getDescriptionCache(req);
		if(descriptions && descriptions[ login ]) {
			res.status(200).send(descriptions[ login ]);
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
			let descriptions:{[key:string]:string} = this.getDescriptionCache(req);
			descriptions[login] = description;
			let profile:string = Utils.getProfile(req);
			this._descriptionsCaches[profile] = descriptions;
			fs.writeFileSync(Config.TWITCH_USER_DESCRIPTIONS_FILE(req), JSON.stringify(descriptions));
			res.status(200).send(JSON.stringify({success:true, data:descriptions}));
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
		let descriptions:{[key:string]:string} = this.getDescriptionCache(req);
		Logger.info(`Delete user description: ${login}`);
		if(descriptions[login]) {
			delete descriptions[login];
			let profile:string = Utils.getProfile(req);
			this._descriptionsCaches[profile] = descriptions;
			fs.writeFileSync(Config.TWITCH_USER_DESCRIPTIONS_FILE(req), JSON.stringify(descriptions));
			res.status(200).send(JSON.stringify({success:true, data:descriptions}));
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
		let channels:string = <string>req.query.channels;
		try {
			let json = await TwitchUtils.getStreamsInfos(channels.split(","));
			let descs = this.getDescriptionCache(req);
			//Inject descriptions for users that specified it
			for (let i = 0; i < json.data.length; i++) {
				const el = json.data[i];
				if(descs[el.user_login.toLowerCase()]) { 
					el.description = descs[el.user_login.toLowerCase()];
				}
			}
			res.status(200).send(JSON.stringify({success:true, data:json}));
		}catch(error){
			console.log(error);
			res.status(500).send(error);
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
			res.status(200).send(JSON.stringify({success:true, data:json}));
		}
	}

	private getDescriptionCache(req:Request):{[key:string]:string} {
		let profile:string = Utils.getProfile(req);
		if(APIController._DESCRIPTION_CACHE_INVALIDATED) {
			this._descriptionsCaches[profile] = null;
			APIController._DESCRIPTION_CACHE_INVALIDATED = false;
		}
		if(!this._descriptionsCaches[profile]) {
			let descriptions:{[key:string]:string} = Utils.getUserDescriptions(req);
			this._descriptionsCaches[profile] = descriptions;
		}
		return this._descriptionsCaches[profile];
	}

}