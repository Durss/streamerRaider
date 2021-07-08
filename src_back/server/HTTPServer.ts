import * as historyApiFallback from 'connect-history-api-fallback';
import { SHA256 } from "crypto-js";
import * as express from "express";
import { Express, NextFunction, Request, Response } from "express-serve-static-core";
import * as fs from "fs";
import * as http from "http";
import APIController from '../controllers/APIController';
import DiscordController from '../controllers/DiscordController';
import Config from '../utils/Config';
import Logger, { LogStyle } from '../utils/Logger';
import TwitchUtils from '../utils/TwitchUtils';

export default class HTTPServer {

	private app:Express;

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
		Logger.error("Error happened !");
		console.log(LogStyle.FgRed+error+LogStyle.Reset);
	}

	protected async doPrepareApp(): Promise<void> {
		//Check if twitch keys are ok
		try {
			await TwitchUtils.getClientCredentialToken();
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
		new APIController().create(this.app);
		new DiscordController().create(this.app);
	}
}