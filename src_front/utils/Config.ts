
/**
 * Created by Durss
 */
export default class Config {
	
	private static _ENV_NAME: EnvName;

	public static IS_PROD:boolean = /.*\.(com|fr|net|org|ninja|st)$/gi.test(window.location.hostname);
	// public static TWITCHAPP_CLIENT_ID:string = "zmt5rqjd07kqv8me3hd74gzb6z5jq0";
	// public static TWITCHAPP_SCOPES:string[] = ['channel:read:redemptions','channel:manage:redemptions','channel:moderate','channel:read:subscriptions','bits:read','whispers:read'];

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
	
	public static get TWITCHAPP_REDIRECT_URI(): string {
		return this.getEnvData({
			dev: document.location.protocol+"//"+document.location.hostname+":"+document.location.port+"/oauth",
			prod:"https://protopotes.durss.ninja/oauth",
		});
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

type EnvName = "dev" | "preprod" | "prod" | "standalone";