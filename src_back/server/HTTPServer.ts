import * as bodyParser from "body-parser";
import * as historyApiFallback from 'connect-history-api-fallback';
import * as express from "express";
import { Express, NextFunction, Request, Response } from "express-serve-static-core";
import * as fs from "fs";
import * as http from "http";
import Config from '../utils/Config';
import Logger from '../utils/Logger';
import fetch, {Response as FetchResponse} from "node-fetch";
import {SHA256} from "crypto-js";

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
		
		//init default users description list if necessary
		if(!fs.existsSync(Config.TWITCH_USER_DESCRIPTIONS_PATH)) {
			let defaultUsers = {
				kromette:"Chimiste et biochimiste de formation, je propose de l'aide aux étudiants sous forme de révision de point de cours et d'accompagnement sur des exercices. En parallèle je me suis aussi lancée dans la découverte et l'apprentissage du dev.",
				kleber:"Etudiant en micro-électronique et informatique je fais principalement des tutoriels de modélisation 3D sur Fusion 360. Je réalise aussi des créations perso, objets de déco, outils, cosplay...",
				bynaris:"Électronicien fou et Bidouilleur de l'extrême à Moustache !",
				virtualabs:"Hacker fada de code, de rétro-ingénierie, de conception/impression 3D, d'électronique, avec tout plein d'idées à la noix.",
				lazarelive:"Musicien, électronicien, spécialisé en traitement et synthèse du son.",
				coutureetpaillettes:"Ingenieure textile spécialisée dans les dispositifs médicaux, je me suis découvert une passion pour la couture. Je fais des lives 2 fois par semaine où j'explique pourquoi je fais certaines modifications.",
				barbatronic:"Barbu, enseignant et responsable d'un makerspace, je conçois et fabrique des robots en live dans mon petit lab perso.",
				ioodyme:"Node-RED",
				yorzian:"Dinosaure des Internets, d'avant le web, je partage mes connaissances, mes découvertes et mes expériences deux fois par semaine, en informatique et en radiocommunications. Et je diffuse parfois des cours post bac que je donne à des étudiants",
				alexnesnes:"Ingénieur en informatique, participant (et plus) à la coupe de France de robotique. J'aime le Javascript, les moteurs brushless et les robots holonomes. Je stream du code et quelques autres projets.",
				freecadfrance:"Expert autoproclamé de FreeCAD, je suis formateur, développeur et steamer pour ce formidable logiciel libre de modélisation 3D",
				durss:"Je fabrique un gros casse-tête mi physique mi numérique pendant que mon chat me maltraîte via les points de chaîne. J'aime bien rigoler.",
				alf_arobase:"Ingénieur électronicien de profession et mécanicien de loisir, je fabrique des \"robots-pas-prêt-le-jour-J\" pour la coupe de robotique et je stream ça avec quelques extra de temps à autre. #AttentionHumourNul",
				kathleenfabric:"Créatrice de vêtements de métier et étudiante en technologie textile, je partage ma passion au travers de live broderie, tricot et couture. Au programme : conseils techniques, partage, documentaires, bonne humeur et ... polka. Oui.",
				tixlegeek:"Formateur cyberpunk cryptoanarchiste technicodesigner. Je manipule la technologie, sécurise vos stratégies opérationnelles, dessine des BDs, et renifle de l'étain fondu (non ROHs) en codant des outils à l'UX somme-toute relative.",
				fibertooth:"Crafteuse émérite au niveau discutable, machine à idées et jeux de mots pas top, super contente d'être là. Je suis votre cheerleader à tout coup de mou <3",
			};
			fs.writeFileSync(Config.TWITCH_USER_DESCRIPTIONS_PATH, JSON.stringify(defaultUsers));
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

		this.app.use(express.json());

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

		/**
		 * Auth middleware to protect POST and DELETE endpoints via SHA256 hash
		 */
		this.app.all("/api/*", async (request:Request, response:Response, next:NextFunction) => {
			if(!this.token) {
				response.status(401).send(JSON.stringify({success:false, error_code:"INVALID_TWITCH_KEYS", error:"missing or invalid twitch API keys"}));
			}else{
				if(request.method == "POST" || request.method == "DELETE") {
					let login = <string>request.query.login;
					let key = request.headers.authorization;
					let hash = SHA256(login + Config.PRIVATE_API_KEY).toString();
					//Check if the given authorization header hash is valid
					if(key != hash) {
						Logger.error(`Invalid authorization key`);
						response.status(401).send(JSON.stringify({success:false, error:"invalid authorization key", error_code:"INVALID_KEY"}));
						return;
					}

					//Check if user is valid via twitch API
					let result = await this.loadChannelsInfo([login]);
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
		this.app.get("/api/user_infos", (req:Request, res:Response) => this.getUserInfos(req,res));
		this.app.get("/api/stream_infos", (req:Request, res:Response) => this.getStreamInfos(req,res));
		this.app.get("/api/user_names", (req:Request, res:Response) => this.getUserNames(req,res));
		this.app.get("/api/description", (req:Request, res:Response) => this.getUserDescription(req,res));
		
		//Keeping these endpoints for compatibility reason but prever using "/api/user" with proper
		//method (POST/DELETE) depending on the type of action to make
		this.app.post("/api/add_user", (req:Request, res:Response) => this.postUser(req,res));
		this.app.post("/api/remove_user", (req:Request, res:Response) => this.deleteUser(req,res));

		//These are sort of duplicate of previous endpoints but more REST-friendly
		this.app.post("/api/user", (req:Request, res:Response) => this.postUser(req,res));
		this.app.delete("/api/user", (req:Request, res:Response) => this.deleteUser(req,res));

		this.app.post("/api/description", (req:Request, res:Response) => this.postUserDescription(req,res));
		this.app.delete("/api/description", (req:Request, res:Response) => this.deleteUserDescription(req,res));
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
	 * Gets the description of a specific twitch user
	 * 
	 * @param req needs a "login" parameter
	 * @param res 
	 */
	private async getUserDescription(req:Request, res:Response):Promise<void> {
		let descriptions;
		let login = (<string>req.query.login)?.toLowerCase();
		try {
			descriptions = JSON.parse(fs.readFileSync(Config.TWITCH_USER_DESCRIPTIONS_PATH, "utf8"));
		}catch(err){
			descriptions = [];
		}
		if(descriptions && descriptions[ login ]) {
			res.status(200).send(descriptions[ login ]);
		}else{
			res.status(404).send("");
		}
	}

	/**
	 * Adds a user to the list
	 * 
	 * @param req 
	 * @param res 
	 */
	private async postUser(req:Request, res:Response):Promise<void> {
		let login = (<string>req.query.login)?.toLowerCase();
		let users = JSON.parse(fs.readFileSync(Config.TWITCH_USER_NAMES_PATH, "utf8"));
		let userIndex = users.indexOf(login);
		Logger.info(`Add user: ${login}`);
		if(userIndex == -1) {
			users.push(login);
			fs.writeFileSync(Config.TWITCH_USER_NAMES_PATH, JSON.stringify(users));
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
		let users:string[] = JSON.parse(fs.readFileSync(Config.TWITCH_USER_NAMES_PATH, "utf8"));
		let userIndex = users.indexOf(login);
		Logger.info(`Delete user: ${login}`);
		if(userIndex > -1) {
			users.splice(userIndex, 1);
			fs.writeFileSync(Config.TWITCH_USER_NAMES_PATH, JSON.stringify(users));
			res.status(200).send(JSON.stringify({success:true, data:users}));
		}else{
			Logger.warn(`User ${login} not found`);
			res.status(200).send(JSON.stringify({success:false, error:"User not found", error_code:"USER_NOT_FOUND"}));
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
		Logger.info(`Add user description: ${login}`);
		if(description) {
			let descriptions:{[key:string]:string} = JSON.parse(fs.readFileSync(Config.TWITCH_USER_DESCRIPTIONS_PATH, "utf8"));
			descriptions[login] = description;
			fs.writeFileSync(Config.TWITCH_USER_DESCRIPTIONS_PATH, JSON.stringify(descriptions));
			res.status(200).send(JSON.stringify({success:true, data:descriptions}));
		}else{
			Logger.warn(`User ${login} already added`);
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
		let descriptions:string[] = JSON.parse(fs.readFileSync(Config.TWITCH_USER_DESCRIPTIONS_PATH, "utf8"));
		Logger.info(`Delete user description: ${login}`);
		if(descriptions[login]) {
			delete descriptions[login];
			fs.writeFileSync(Config.TWITCH_USER_DESCRIPTIONS_PATH, JSON.stringify(descriptions));
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
		let url = "https://api.twitch.tv/helix/streams?user_login="+channels.split(",").join("&user_login=");
		
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
		let channels:string = <string>req.query.channels;
		let result = await this.loadChannelsInfo(channels.split(","));

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

	private async loadChannelsInfo(channels:string[]):Promise<FetchResponse> {
		let url = "https://api.twitch.tv/helix/users?login="+channels.join("&login=");
		// let url = "https://api.twitch.tv/helix/users?login="+user;
		let result = await fetch(url, {
			headers:{
				"Client-ID": Config.TWITCHAPP_CLIENT_ID,
				"Authorization": "Bearer "+this.token,
				"Content-Type": "application/json",
			}
		});
		return result;
	}
}