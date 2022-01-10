
/**
 * Created by Durss
 */
export default class Config {
	
	private static _ENV_NAME: EnvName;

	public static IS_PROD:boolean = /.*\.(com|fr|net|org|ninja|st|stream)$/gi.test(window.location.hostname);
	
	public static DEFAULT_PAGE_TITLE:string = "Streamer Raider";

	public static TWITCH_SCOPES:string[] = ["chat:read","chat:edit","channel_editor"];
	public static NEW_USER_DURATION:number = 1000 * 60 * 60 * 24 * 31;//31 days
	public static INACTIVITY_DURATION:number = 1000 * 60 * 60 * 24 * 60;//60 days

	public static init():void {
		let prod = this.IS_PROD;//document.location.port == "";
		if(prod) this._ENV_NAME = "prod";
		else this._ENV_NAME = "dev";
	}
	
	public static get SERVER_PORT(): number {
		return this.getEnvData({
			dev: 3012,
			prod: document.location.port,
		});
	}
	
	public static get API_PATH(): string {
		return this.getEnvData({
			dev: document.location.protocol+"//"+document.location.hostname+":"+Config.SERVER_PORT+"/api",
			prod:"/api",
		});
	}
	
	public static get API_PATH_ABSOLUTE(): string {
		let path = this.API_PATH;
		if(path.indexOf("http") == -1) {
			path = "https://"+document.location.host+path;
		}
		return path;
	}
	
	

	/**
	 * Extract a data from an hasmap depending on the current environment.
	 * @param map
	 * @returns {any}
	 */
	private static getEnvData(map: any): any {
		//Get the data from hashmap
		if (map[this._ENV_NAME] !== undefined) return map[this._ENV_NAME];
		return map[Object.keys(map)[0]];
	}
}

type EnvName = "dev" | "preprod" | "prod";