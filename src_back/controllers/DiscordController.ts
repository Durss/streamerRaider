import { Express } from "express-serve-static-core";
import * as Discord from "discord.js"
import * as fs from "fs"
import Logger from '../utils/Logger';
import Config from "../utils/Config";
import TwitchUtils from "../utils/TwitchUtils";
import APIController from "./APIController";
import Utils from "../utils/Utils";

/**
* Created : 15/10/2020 
*/
export default class DiscordController {

	private client:Discord.Client;
	private watchListCache:{[key:string]:string[]};
	private adminsCache:{[key:string]:string[]};
	private BOT_TOKEN:string = Config.DISCORDBOT_TOKEN;
	
	
	constructor() {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async create(app:Express):Promise<void> {
		if(!this.BOT_TOKEN) return;
		
		if(!fs.existsSync(Config.DISCORD_CHANNELS_LISTENED)) {
			fs.writeFileSync(Config.DISCORD_CHANNELS_LISTENED, "{}");
			this.watchListCache = {};
		}else{
			this.watchListCache = JSON.parse(fs.readFileSync(Config.DISCORD_CHANNELS_LISTENED, "utf8"));
		}
		
		if(!fs.existsSync(Config.DISCORD_CHANNELS_ADMINS)) {
			fs.writeFileSync(Config.DISCORD_CHANNELS_ADMINS, "{}");
			this.adminsCache = {};
		}else{
			this.adminsCache = JSON.parse(fs.readFileSync(Config.DISCORD_CHANNELS_ADMINS, "utf8"));
		}

		this.client = new Discord.Client();
		try {
			await this.client.login(this.BOT_TOKEN);
		}catch(error) {
			Logger.error("Invalid discord token !");
		}

		this.client.on("message", (message) => this.onMessage(message));

		this.client.on("ready", ()=> this.onReady());

		this.client.on("guildMemberAdd", (member) => this.onAddMember(member))

		this.client.on("raw", (link) => {
			// console.log("ON RAW")
			// console.log(link);
		})
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private async onReady():Promise<void> {
		Logger.success("Discord bot connected");
		// this.client.guilds.cache.map(async (g) => {
		// });
	}

	/**
	 * Called when someone sends a message to a channel
	 * 
	 * @param message 
	 */
	private async onMessage(message:Discord.Message):Promise<void> {
		if (message.author.bot) return;
		if (message.channel.type == "dm") return
		
		if(message.content.indexOf("!") == 0) this.parseCommand(message);
		
	}

	/**
	 * Called when someone joins the discord server
	 * @param member 
	 */
	private onAddMember(member:Discord.GuildMember | Discord.PartialGuildMember) {
		console.log("New member ! ", member.lastMessageChannelID);
		// console.log(member.guild.channels)
		// console.log(member)
		// member.guild.channels.cache.find((c) => c.name == "general").send("Hello <@"+member.id+"> ! ");
	}


	/**
	 * Parses a command entered on chat
	 * @param text 
	 */
	private async parseCommand(message:Discord.Message):Promise<void> {
		let userId = message.member.id;
		let isAdmin = false;
		
		for (let i = 0; i < this.adminsCache[message.member.guild.id].length; i++) {
			const adminList = this.adminsCache[message.member.guild.id][i];
			if(adminList.indexOf(userId) > -1) {
				isAdmin = true;
				break;
			}
		}
		let txt = message.content.substr(1, message.content.length);
		let chunks = txt.split(/\s/gi);
		let	cmd = chunks[0];
		switch(cmd) {
			case "raider-add":
				if(isAdmin) {
					let channelName = (<any>message.channel).name;
					this.updateWatchList(message.guild.id, message.channel.id, true);
					message.reply("Le bot a bien été configuré sur le channel #"+channelName);
				}else{
					message.reply("Seul un Administrateur peut ajouter le bot à un channel");
				}
				break;
			
			case "raider-del":
				if(isAdmin) {
					let channelName = (<any>message.channel).name;
					this.updateWatchList(message.guild.id, message.channel.id, false);
					message.reply("Le bot a bien été supprimé du channel #"+channelName);
				}
				break;
		
			//List all registered users
			case "raider-list":
				let users = Utils.getUserList(null, message.guild.id);
				if(users.length == 0) {
					message.channel.send(`Il n'y a actuellement personne d'enregistré.`);
				}else{
					message.channel.send(`Il y a actuellement ${users.length} personnes enregistrées :\`\`\`
${users.join(", ")}
\`\`\``);
				}
				break;
			
			//Adds/Removes a user from the list
			case "add-user":
			case "del-user":
				this.addDelUser(message, chunks);
				break;
			
			//Adds/Removes a user from the list
			case "add-description":
			case "del-description":
				this.addDelDescription(message, chunks);
				break;

			case "raider-help":
				if(!this.isWatchingChannel(message) && !isAdmin) return;
				message.channel.send(`Voici les commandes disponibles :\`\`\`
!raider-add
	(admin)Ajouter le bot à un chan

!raider-del
	(admin)Supprimer le bot d'un chan

!raider-list
	Liste toutes les personnes enregistrées

!add-user TWITCH_LOGIN
	Ajouter un·e utilisateur/trice twitch

!del-user TWITCH_LOGIN
	Supprimer un·e utilisateur/trice twitch

!add-description TWITCH_LOGIN DESCRIPTION
	Ajouter une description à un·e utilisateur/trice twitch

!del-description TWITCH_LOGIN DESCRIPTION
	Supprimer la description d'un·e utilisateur/trice twitch
\`\`\`
`);
				break;
		}
	}

	/**
	 * Adds or removes a channel from the watch list of the bot
	 * 
	 * @param serverId 
	 * @param channelId 
	 * @param add 
	 * @returns 
	 */
	private updateWatchList(serverId:string, channelId:string, add:boolean = true):void {
		let text = fs.readFileSync(Config.DISCORD_CHANNELS_LISTENED, "utf8");
		let json:{[key:string]:string[]};
		try {
			json = JSON.parse(text);
		}catch(error) { json = {}; }
		
		if(add) {
			//Add a channel
			if(!json[serverId]) json[serverId] = [];
			let index = json[serverId].indexOf(channelId);
			if(index == -1) {
				json[serverId].push(channelId);
			}
		}else{
			//Remove a channel
			if(!json[serverId]) return;
			let index = json[serverId].indexOf(channelId);
			if(index > -1) {
				json[serverId].splice(index, 1);
			}
		}

		this.watchListCache = json;

		fs.writeFileSync(Config.DISCORD_CHANNELS_LISTENED, JSON.stringify(json));
	}

	/**
	 * Check if the channel sending a message is actually in the watch list of the bot
	 * @param message 
	 * @returns 
	 */
	private isWatchingChannel(message:Discord.Message):boolean {
		return this.watchListCache[message.guild.id]?.indexOf(message.channel.id) > -1;
	}

	/**
	 * Check if the channel sending a message is actually in the watch list of the bot
	 * @param message 
	 * @returns 
	 */
	private isGuildValid(message:Discord.Message):boolean {
		Utils.getProfile(null, message.guild.id)
		return this.watchListCache[message.guild.id]?.indexOf(message.channel.id) > -1;
	}

	/**
	 * Adds or removes a user from the JSON file
	 * 
	 * @param message 
	 * @param chunks 
	 * @returns 
	 */
	private async addDelUser(message:Discord.Message, chunks:string[]):Promise<void> {
		if(!this.isWatchingChannel(message)) return;
		if(!this.isGuildValid(message)) return

		let cmd = chunks[0];

		//Check if twitch user actually exists
		let login = chunks[1];
		try {
			let result = await TwitchUtils.loadChannelsInfo([login]);
			let json = await result.json();
			if(json.data.length == 0) {
				message.reply("Le compte Twitch **\""+login+"\"** n'existe pas.");
				return;
			}
		}catch(error) {
			message.reply("Woops... y a eu une erreur pas prévue :(");
			return;
		}

		//Add or remove the user from the JSON file
		let users = Utils.getUserList(null, message.guild.id);
		let userIndex = users.indexOf(login);
		Logger.info(`Add user: ${login}`);
		if( (cmd == "add-user" && userIndex == -1)
		|| (cmd == "del-user" && userIndex > -1)) {
			if(cmd == "add-user") {
				users.push(login);
				message.reply("Le compte Twitch **\""+login+"\"** a bien été ajouté à la liste.");
			}else{
				users.splice(userIndex, 1);
				message.reply("Le compte Twitch **\""+login+"\"** a bien été supprimé de la liste.");
			}
			fs.writeFileSync(Config.TWITCH_USER_NAMES_FILE(null, message.guild.id), JSON.stringify(users));
		}else{
			if(cmd == "add-user") {
				message.reply("Le compte Twitch **\""+login+"\"** est déjà ajouté à la liste.");
			}else{
				message.reply("Le compte Twitch **\""+login+"\"** est déjà absent de la liste.");
			}
		}
	}

	/**
	 * Adds or removes a description from the JSON file
	 * 
	 * @param message 
	 * @param chunks 
	 * @returns 
	 */
	private async addDelDescription(message:Discord.Message, chunks:string[]):Promise<void> {
		if(!this.isWatchingChannel(message)) return;

		let cmd = chunks[0];

		//Check if twitch user actually exists
		let login = chunks[1];
		try {
			let result = await TwitchUtils.loadChannelsInfo([login]);
			let json = await result.json();
			if(json.data.length == 0) {
				message.reply("Le compte Twitch **\""+login+"\"** n'existe pas.");
				return;
			}
		}catch(error) {
			message.reply("Woops... y a eu une erreur pas prévue :(");
			return;
		}

		//Add or remove the description from the JSON file
		let descriptions = Utils.getUserDescriptions(null, message.guild.id);
		Logger.info(`Add description: ${login}`);
		if(cmd == "add-description") {
			descriptions[login] = chunks.splice(2).join(" ");
			message.reply("La description a bien été enregistrée pour le compte **\""+login+"\"**.");
		}else{
			delete descriptions[login];
			message.reply("La description a bien été supprimée pour le compte **\""+login+"\"**.");
		}
		fs.writeFileSync(Config.TWITCH_USER_DESCRIPTIONS_FILE(null, message.guild.id), JSON.stringify(descriptions));
		APIController.invalidateDescriptionCache();
	}

}