import { Request } from "express-serve-static-core";
import * as fs from "fs";
import Config from "./Config";
import Logger from "./Logger";

/**
* Created : 10/01/2022 
*/
export default class ProfileUtils {

	private static profileCache:ProfileData[] = null;
	
	constructor() {
		this.initialize();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/

	/**
	 * Gets all available profiles
	 */
	public static getProfileList():ProfileData[] {
		if(!Config.PROFILES_ENABLED) return [];
		if(!this.profileCache) {
			try {
				this.profileCache = JSON.parse(fs.readFileSync(Config.AVAILABLE_PROFILES_LIST, "utf8"));
			}catch(error) {
				Logger.error("Unable to parse JSON file: "+Config.AVAILABLE_PROFILES_LIST);
				return null;
			}
		}
		return this.profileCache;
	}

	/**
	 * Gets the public domain from a profile name
	 */
	public static getPublicDomainFromProfile(profile:string):string {
		let list = this.getProfileList();
		//Search for matching profile
		for (let i = 0; i < list.length; i++) {
			const e = list[i];
			if(e.id == profile) {
				return e.domains[0];
			}
		}
		return null;
	}

	/**
	 * Gets a profile from an express request or a discord ID
	 */
	public static getProfile(req:Request, discordGuildID?:string):ProfileData {
		if(!Config.PROFILES_ENABLED) return null;
		if(!this.profileCache) {
			try {
				this.profileCache = JSON.parse(fs.readFileSync(Config.AVAILABLE_PROFILES_LIST, "utf8"));
			}catch(error) {
				Logger.error("Unable to parse JSON file: "+Config.AVAILABLE_PROFILES_LIST);
				return null;
			}
		}
		//Check if domain matches a profile
		if(req?.hostname) {
			let host = req.hostname;
			for (let i = 0; i < this.profileCache.length; i++) {
				const p = this.profileCache[i];
				if(p.domains.indexOf(host) > -1) {
					return p;
				}
			}
		}
		
		let profileId:string = "";
		//Get if discord ID matches a profile
		if(discordGuildID) profileId = Config.DISCORD_GUILD_ID_TO_PROFILE(discordGuildID);
		//Allow GET override with "profile" var
		if(req && !profileId) profileId = <string>req.query.profile;
		//Allow POST override with "profile" var
		if(req && !profileId) profileId = <string>req.body.profile;
		
		//Make sure the requested profile actually exists to avoid some sort of injection
		for (let i = 0; i < this.profileCache.length; i++) {
			const p = this.profileCache[i];
			if(p.id===profileId) {
				return p;
			}
		}

		return null;
	}
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}
}

export interface ProfileData {
	domains:string[];
	id:string;
	title?:string;
	prevProfile?:string;
	nextProfile?:string;
}