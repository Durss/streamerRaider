import { Request } from "express-serve-static-core";
import * as fs from "fs";
import Logger, { LogStyle } from "../utils/Logger";
import Utils from "./Utils";
/**
 * Created by Durss
 */
export default class Config {

	private static _ENV_NAME: EnvName;
	private static _CONF_PATH: string = "env.conf";
	private static _CREDENTIALS_PATH: string = "data/credentials.json";
	private static _DISCORD_GUILD_IDS_PATH: string = "data/discordGuildIdToProfile.json";
	private static _CREDENTIALS:{client_id:string, secret_id:string, privateApiKey:string, discordBot_token:string};

	public static AVAILABLE_PROFILES_LIST: string = "data/dnsToProfile.json";
	public static DISCORD_CHANNELS_LISTENED:string = "data/discordChannels.json";

	public static TWITCH_USER_NAMES_FILE(req:Request, discordGuildID?:string):string {
		let profile:string = Utils.getProfile(req, discordGuildID);
		let path = "data/userList{PROFILE}.json";
		if(profile) path = path.replace(/\{PROFILE\}/gi, "_"+profile);
		else        path = path.replace(/\{PROFILE\}/gi, "");
		return path;
	}

	public static TWITCH_USER_DESCRIPTIONS_FILE(req:Request, discordGuildID?:string):string {
		let profile:string = Utils.getProfile(req, discordGuildID);
		let path = "data/userDescriptions{PROFILE}.json";
		if(profile) path = path.replace(/\{PROFILE\}/gi, "_"+profile);
		else        path = path.replace(/\{PROFILE\}/gi, "");
		return path;
	}

	public static DISCORD_GUILD_ID_TO_PROFILE(guildID:string):string {
		if(!fs.existsSync(this._DISCORD_GUILD_IDS_PATH)) return null;
		try {
			let json = JSON.parse(fs.readFileSync(this._DISCORD_GUILD_IDS_PATH, "utf8"));
			return json[guildID];
		}catch(error) {
			Logger.error("Invalid content of file discordGuildIdToProfile.json");
			console.log(error);
			return null;
		}
	}

	public static get TWITCHAPP_CLIENT_ID():string {
		this.loadKeys();
		return this._CREDENTIALS.client_id;
	}
	public static get TWITCHAPP_SECRET_ID():string {
		this.loadKeys();
		return this._CREDENTIALS.secret_id;
	}
	public static get PRIVATE_API_KEY():string {
		this.loadKeys();
		return this._CREDENTIALS.privateApiKey;
	}
	public static get DISCORDBOT_TOKEN():string {
		this.loadKeys();
		return this._CREDENTIALS.discordBot_token;
	}
	
	private static loadKeys():void {
		if(this._CREDENTIALS) return;
		if(!fs.existsSync(this._CREDENTIALS_PATH)) {
			Logger.error(LogStyle.BgRed+LogStyle.FgWhite+"MISSING Twitch credentials !"+LogStyle.Reset);
			Logger.error("Please fill in the client_id and secret_id values on the file credentials.json");
			this._CREDENTIALS = {client_id:"",secret_id:"", discordBot_token:"", privateApiKey:""};
			fs.writeFileSync(this._CREDENTIALS_PATH, JSON.stringify(this._CREDENTIALS));
		}else{
			this._CREDENTIALS = JSON.parse(fs.readFileSync(this._CREDENTIALS_PATH, "utf8"));
		}
	}
	

	public static get envName(): string {
		return this._ENV_NAME;
	}

	public static get LOGS_ENABLED(): boolean {
		return this.getEnvData({
			dev: true,
			prod: false,
		});
	}

	public static get SERVER_PORT(): number {
		return this.getEnvData({
			dev: 3012,
			prod: 3012,
		});
	}

	public static get PUBLIC_PATH(): string {
		return this.getEnvData({
			dev: "./dist",
			prod: "./public",
		});
	}


	/**
	 * Extract a data from an hasmap depending on the current environment.
	 * @param map
	 * @returns {any}
	 */
	private static getEnvData(map: any): any {
		//Grab env name the first time
		if (!this._ENV_NAME) {
			if (fs.existsSync(this._CONF_PATH)) {
				let content: string = fs.readFileSync(this._CONF_PATH, "utf8");
				this._ENV_NAME = <EnvName>content;
				let str: String = "  :: Current environment \"" + content + "\" ::  ";
				let head: string = str.replace(/./g, " ");
				console.log("\n");
				console.log(LogStyle.BgGreen + head + LogStyle.Reset);
				console.log(LogStyle.Bright + LogStyle.BgGreen + LogStyle.FgWhite + str + LogStyle.Reset);
				console.log(LogStyle.BgGreen + head + LogStyle.Reset);
				console.log("\n");
				
			} else {
				this._ENV_NAME = "dev";
				fs.writeFileSync(this._CONF_PATH, this._ENV_NAME);
				let str: String = "  /!\\ Missing file \"./" + this._CONF_PATH + "\" /!\\  ";
				let head: string = str.replace(/./g, " ");
				console.log("\n");
				console.log(LogStyle.BgRed + head + LogStyle.Reset);
				console.log(LogStyle.Bright + LogStyle.BgRed + LogStyle.FgWhite + str + LogStyle.Reset);
				console.log(LogStyle.BgRed + head + LogStyle.Reset);
				console.log("\n");
				console.log("Creating env.conf file autmatically and set it to \"standalone\"\n\n");
			}
		}

		//Get the data from hashmap
		if (map[this._ENV_NAME]) return map[this._ENV_NAME];
		return map[Object.keys(map)[0]];
	}
}

type EnvName = "dev" | "preprod" | "prod";