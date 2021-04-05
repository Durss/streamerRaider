import * as fs from "fs";
import * as path from "path";
import Logger, { LogStyle } from "../utils/Logger";
/**
 * Created by Durss
 */
export default class Config {

	private static _ENV_NAME: EnvName;
	private static _CONF_PATH: string = "env.conf";
	private static _TWITCH_KEYS_PATH: string = "twitch_keys.json";
	private static _TWITCH_KEYS:{client_id:string, secret_id:string};

	public static TWITCH_USER_NAMES_PATH:string = "protobuddiesList.json";

	public static get TWITCHAPP_CLIENT_ID():string {
		this.loadKeys();
		return this._TWITCH_KEYS.client_id;
	}
	public static get TWITCHAPP_SECRET_ID():string {
		this.loadKeys();
		return this._TWITCH_KEYS.secret_id;
	}
	
	private static loadKeys():void {
		if(this._TWITCH_KEYS) return;
		if(!fs.existsSync(this._TWITCH_KEYS_PATH)) {
			Logger.error(LogStyle.BgRed+LogStyle.FgWhite+"MISSING Twitch keys !"+LogStyle.Reset);
			Logger.error("Please fill in the client_id and secret_id values on the file twitch_keys.json");
			this._TWITCH_KEYS = {client_id:"",secret_id:""};
			fs.writeFileSync(this._TWITCH_KEYS_PATH, JSON.stringify(this._TWITCH_KEYS));
		}else{
			this._TWITCH_KEYS = JSON.parse(fs.readFileSync(this._TWITCH_KEYS_PATH, "utf8"));
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

	public static get UPLOAD_PATH(): string {
		return this.getEnvData({
			dev: "./uploads/",
			prod: path.resolve(__dirname+"/../uploads")+"/",
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