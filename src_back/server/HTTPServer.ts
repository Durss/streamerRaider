import * as historyApiFallback from 'connect-history-api-fallback';
import { SHA256 } from "crypto-js";
import * as express from "express";
import { Express, NextFunction, Request, Response } from "express-serve-static-core";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import APIController from '../controllers/APIController';
import DiscordController from '../controllers/DiscordController';
import Config from '../utils/Config';
import Logger, { LogStyle } from '../utils/Logger';
import TwitchUtils from '../utils/TwitchUtils';
import Utils from "../utils/Utils"
import UserData from '../utils/UserData';

export default class HTTPServer {

	private app:Express;

	constructor(public port:number) {

		this.app = <Express>express();
		let server = http.createServer(<any>this.app);
		server.listen(Config.SERVER_PORT, '0.0.0.0', null, ()=> {
			Logger.success("Server ready on port " + Config.SERVER_PORT);
		});

		this.doPrepareApp();
	}

	protected initError(error: any): void {
		Logger.error("Error happened !");
		console.log(LogStyle.FgRed+error+LogStyle.Reset);
	}

	protected async doPrepareApp(): Promise<void> {
		//Check if twitch keys are ok
		try {
			await TwitchUtils.getClientCredentialToken();
		}catch(error) {
			//Invalid token
			Logger.error("Invalid twitch tokens. Please check the client_id and secret_id values in the file data/credentials.json")
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

		//CORS security
		this.app.all("/*", (req:Request, res:Response, next:NextFunction) => {
			// Set CORS headers
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
			res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,X-AUTH-TOKEN');
			
			//Allow access to private API only if coming from authorized domain
			if(req.url.indexOf("/api/private") > -1) {
				let profile = Utils.getProfile(req);
				if(profile) {
					//If a profile is found, that's because domain origin is valid, allow the request
					res.header('Access-Control-Allow-Origin', "*");
				}
			}else{
				res.header("Access-Control-Allow-Origin", "*");
			}
			if (req.method == 'OPTIONS') {
				res.status(200).end();
				return;
			}
			
			next();
		});

		//SERVE PUBLIC FILES
		this.app.use("/", express.static(Config.PUBLIC_PATH));

		this.app.use(express.json());

		/**
		 * Auth middleware to protect POST and DELETE endpoints via SHA256 hash
		 */
		this.app.all("/api/*", async (request:Request, response:Response, next:NextFunction) => {
			if(!TwitchUtils.ready) {
				response.status(401).send(JSON.stringify({success:false, error_code:"INVALID_TWITCH_KEYS", error:"missing or invalid twitch API keys"}));
			}else{
				if(request.method == "POST" || request.method == "DELETE") {
					let login = <string>request.query.login;
					let key = request.headers.authorization;
					let hash = SHA256(login + Config.PRIVATE_API_KEY).toString();
					let access_token = <string>request.body.access_token;
					//If using API externally
					if(!access_token) {
						//Check if the given authorization header hash is valid
						if(key != hash) {
							Logger.error(`Invalid authorization key`);
							response.status(401).send(JSON.stringify({success:false, error:"invalid authorization key", error_code:"INVALID_KEY"}));
							return;
						}
					}else{
						//If using API internally via twitch access token
						let result = await TwitchUtils.validateToken(access_token);
						if(result === false) {
							Logger.error(`Invalid twitch access token`);
							response.status(401).send(JSON.stringify({success:false, error:"invalid twitch access token", error_code:"INVALID_TWITCH_ACCESS_TOKEN"}));
							return;
						}else{
							//Populate login on request
							login = result.login;
							request.body.login = result.login;
							request.query.login = result.login;
						}
					}

					//Check if user is valid via twitch API
					let result = await TwitchUtils.loadChannelsInfo([login]);
					if(result.status != 200) {
						let txt = await result.text();
						response.status(result.status).send(txt);
					}else{
						let json = await result.json();
						if(!json || json.data.length == 0) {
							response.status(404).send(JSON.stringify({success:false, error:"user not found", error_code:"USER_NOT_FOUND"}));
							return;
						}
					}
				}
				next();
			}
		});

		this.createEndpoints();
		
		this.app.use((error : any, request : Request, response : Response, next : NextFunction) => {
			this.errorHandler(error , request, response, next)
		});
		
		let fallback = async (req, res) => {
			console.log("NOT FOUND : ",req.url);
			res.status(404).send(JSON.stringify({success:false, code:"ENDPOINT_NOT_FOUND", message:"Requested endpoint does not exists"}));
		};
		//Fallback endpoints
		this.app.all("*", fallback);
	}

	protected errorHandler(error: any, req: Request, res: Response, next: NextFunction): any {
		Logger.error("Express error");
		Logger.simpleLog(error);
		res.status(404).send(JSON.stringify({success:false, code:"EXPRESS_ERROR", message:"An error has occured while processing the request"}));
		next();
	}

	/**
	 * Creates API endpoints
	 */
	private async createEndpoints():Promise<void> {
		this.migrateData();
		new APIController().create(this.app);
		new DiscordController().create(this.app);
	}

	/**
	 * Migrate user's data.
	 * Before we had one file for user names and one for descriptions, which is quite dumb.
	 * This migration merges both files into one, adding possibility to have as many props
	 * as we want for every user.
	 */
	private async migrateData():Promise<void> {
		let root = path.join( path.dirname(require.main.filename), "../data/");
		let files = fs.readdirSync( root );
		let hasMigrated = false;
		for(let i = 0; i < files.length; i++) {
			let file = files[i];
			if(file.indexOf("userDescriptions") === 0) {
				Logger.info("Migrate profile", file.replace(/userDescriptions_(.*)\.json/gi, "$1"));
				let usersPath		= root + file.replace(/userDescriptions/gi, "userList");
				let descriptionPath	= root + file;
				let users			= JSON.parse(fs.readFileSync(usersPath, "utf8"));
				let descriptions	= JSON.parse(fs.readFileSync(descriptionPath, "utf8"));
				let newUsers		= [];
				for(let i = 0; i < users.length; i++) {
					let newUser:UserData = <any>{};
					newUser.name = users[i];
					let description = descriptions[ users[i] ];
					if(description) {
						newUser.description = description;
					}
					newUser.created_at = Date.now() - 32*24*60*60*1000;//set it 32 days ago to avoid "new" marker
					newUsers.push(newUser);
				}
				fs.writeFileSync(usersPath, JSON.stringify(newUsers));
				fs.unlinkSync(descriptionPath);
				hasMigrated = true;
			}
		}
		if(hasMigrated) {
			Logger.success("Migration complete");
		}
	}
}