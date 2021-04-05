import * as bodyParser from "body-parser";
import * as historyApiFallback from 'connect-history-api-fallback';
import * as express from "express";
import { Express, NextFunction, Request, Response } from "express-serve-static-core";
import * as fs from "fs";
import * as http from "http";
import Config from '../utils/Config';
import Logger from '../utils/Logger';
import fetch from "node-fetch";

export default class HTTPServer {

	private app:Express;
	private token:string;
	private token_invalidation_date:number;

	constructor(public port:number) {
		
		if(!fs.existsSync(Config.UPLOAD_PATH)) {
			fs.mkdirSync(Config.UPLOAD_PATH);
		}

		this.app = <Express>express();
		let server = http.createServer(<any>this.app);
		server.listen(Config.SERVER_PORT, '0.0.0.0', null, ()=> {
			Logger.success("Server ready on port " + Config.SERVER_PORT);
		});

		this.doPrepareApp();
	}

	protected initError(error: any): void {
		Logger.error("Error happened !", error);
	}

	protected async doPrepareApp(): Promise<void> {
		//Check if twitch keys are ok
		try {
			await this.getClientCredentialToken();
		}catch(error) {
			//Invalid token
			Logger.error("Invalid twitch tokens. Please check the client_id and secret_id values in the file twitch_keys.json")
		}
		
		//init default users list if necessary
		if(!fs.existsSync(Config.TWITCH_USER_NAMES_PATH)) {
			let defaultUsers = ["freecadfrance", "protopotes", "alf_arobase", "t4lus", "pixiecosplay", "durss", "lazarelive", "barbatroniclive", "ioodyme", "tixlegeek", "Evy_Cooper", "Yorzian", "virtualabs","MaxenceClt_", "tainalo2", "pimentofr", "cabridiy", "dianae_cosplay", "sombrepigeon", "mt_mak3r", "kmikazrobotics", "Libereau", "akanoa", "Kromette", "bynaris", "kathleenfabric", "coutureetpaillettes", "spectrenoir06", "motherofrats_", "FindTheStream", "alexnesnes", "lady_dcr", "hippo_fabmaker", "klebermaker"];
			fs.writeFileSync(Config.TWITCH_USER_NAMES_PATH, JSON.stringify(defaultUsers));
		}
		
		//Redirect to homepage invalid requests
		this.app.use(historyApiFallback({
			index:"/index.html",
			// verbose:true,
			
			rewrites: [
				{
					//Avoiding rewrites for API calls and socket
					from: /.*\/(api|sock)\/?.*$/,
					to: function(context) {
						return context.parsedUrl.pathname;
					}
				},
			],
		}));

		//SERVE PUBLIC FILES
		this.app.use("/", express.static(Config.PUBLIC_PATH));
		this.app.use("/uploads", express.static(Config.UPLOAD_PATH));

		this.app.use(<any>bodyParser.urlencoded({ extended: true }));
		this.app.use(<any>bodyParser.json({limit: '10mb'}));

		this.app.all("/*", (req:Request, res:Response, next:NextFunction) => {
			// Set CORS headers
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
			res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,X-AUTH-TOKEN');
			res.header("Access-Control-Allow-Origin", "*");
			if (req.method == 'OPTIONS') {
				res.status(200).end();
				return;
			}
			
			next();
		});
		this.app.all("/api/*", (req:Request, res:Response, next:NextFunction) => {
			if(!this.token) {
				res.status(401).send(JSON.stringify({success:false, error_code:"INVALID_TWITCH_KEYS", error:"missing or invalid twitch API keys"}));
			}else{
				next();
			}
		})

		this.createEndpoints();
		
		this.app.use((error : any, request : Request, result : Response, next : NextFunction) => {
			this.errorHandler(error , request, result, next)
		});
		
		let fallback = async (req, res) => {
			console.log("NOT FOUND : ",req.url);
			res.status(404).send(JSON.stringify({success:false, code:"ENDPOINT_NOT_FOUND", message:"Requested endpoint does not exists"}));
		};
		//Fallback endpoints
		this.app.get("*", fallback);
		this.app.post("*", fallback);
		this.app.put("*", fallback);
		this.app.delete("*", fallback);
		this.app.patch("*", fallback);
		this.app.options("*", fallback);
	}

	protected errorHandler(error: any, req: Request, res: Response, next: NextFunction): any {
		Logger.error("Express error");
		Logger.simpleLog(error);
		res.status(404).send(JSON.stringify({success:false, code:"EXPRESS_ERROR", message:"An error has occured while processing the request"}));
		next();
	}

	private async createEndpoints():Promise<void> {
		this.app.post("/api/user_infos", (req:Request, res:Response) => this.getUserInfos(req,res));
		this.app.post("/api/stream_infos", (req:Request, res:Response) => this.getStreamInfos(req,res));
		this.app.get("/api/user_names", (req:Request, res:Response) => this.getUserNames(req,res));
		this.app.get("/api/add_user", (req:Request, res:Response) => this.addUser(req,res));
		this.app.get("/api/remove_user", (req:Request, res:Response) => this.removeUser(req,res));
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
			users = JSON.parse(fs.readFileSync(Config.TWITCH_USER_NAMES_PATH, "utf8"));
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
	private async addUser(req:Request, res:Response):Promise<void> {
		let users = JSON.parse(fs.readFileSync(Config.TWITCH_USER_NAMES_PATH, "utf8"));
		users.push(req.query.login);
		fs.writeFileSync(Config.TWITCH_USER_NAMES_PATH, JSON.stringify(users));
		res.status(200).send(JSON.stringify({success:true, data:users}));
	}

	/**
	 * Removes a user from the list
	 * 
	 * @param req 
	 * @param res 
	 */
	private async removeUser(req:Request, res:Response):Promise<void> {
		let users:string[] = JSON.parse(fs.readFileSync(Config.TWITCH_USER_NAMES_PATH, "utf8"));
		let userIndex = users.indexOf(<string>req.query.login);
		if(userIndex > -1) {
			users.splice(userIndex,1);
			fs.writeFileSync(Config.TWITCH_USER_NAMES_PATH, JSON.stringify(users));
		}
		res.status(200).send(JSON.stringify({success:true, data:users}));
	}

	/**
	 * Gets 1 to 100 stream status infos
	 * 
	 * @param req 
	 * @param res 
	 */
	private async getStreamInfos(req:Request, res:Response):Promise<void> {
		let channels:string[] = <string[]>req.body.channels;
		let url = "https://api.twitch.tv/helix/streams?user_login="+channels.join("&user_login=");
		
		let result = await fetch(url, {
			headers:{
				"Client-ID": Config.TWITCHAPP_CLIENT_ID,
				"Authorization": "Bearer "+this.token,
				"Content-Type": "application/json",
			}
		});
		
		if(result.status != 200) {
			let txt = await result.text();
			res.status(result.status).send(txt);
		}else{
			let json = await result.json();
			res.status(200).send(JSON.stringify({success:true, data:json}));
		}
	}

	/**
	 * Gets info of the specified user(s)
	 * 
	 * @param req 
	 * @param res 
	 */
	private async getUserInfos(req:Request, res:Response):Promise<void> {
		let channels:string[] = <string[]>req.body.channels;
		let url = "https://api.twitch.tv/helix/users?login="+channels.join("&login=");
		// let url = "https://api.twitch.tv/helix/users?login="+user;
		console.log("LOAD INFOS");
		let result = await fetch(url, {
			headers:{
				"Client-ID": Config.TWITCHAPP_CLIENT_ID,
				"Authorization": "Bearer "+this.token,
				"Content-Type": "application/json",
			}
		});

		if(result.status != 200) {
			let txt = await result.text();
			res.status(result.status).send(txt);
		}else{
			let json = await result.json();
			res.status(200).send(JSON.stringify({success:true, data:json}));
		}
	}

	/**
	 * Generates a credential token if necessary from the client and private keys
	 * @returns 
	 */
	private getClientCredentialToken():Promise<string> {
		//Invalidate token if expiration date is passed
		if(Date.now() > this.token_invalidation_date) this.token = null;
		//Avoid generating a new token if one already exists
		if(this.token) return Promise.resolve(this.token);

		//Generate a new token
		return new Promise((resolve, reject) => {
			let headers:any = {
			};
			var options = {
				method: "POST",
				headers: headers,
			};
			fetch("https://id.twitch.tv/oauth2/token?client_id="+Config.TWITCHAPP_CLIENT_ID+"&client_secret="+Config.TWITCHAPP_SECRET_ID+"&grant_type=client_credentials&scope=", options)
			.then((result) => {
				if(result.status == 200) {
					result.json().then((json)=> {
						this.token = json.access_token;
						this.token_invalidation_date = Date.now() + json.expires_in - 1000;
						resolve(json.access_token);
					});
				}else{
					reject();
				}
			});
		})
	}
}