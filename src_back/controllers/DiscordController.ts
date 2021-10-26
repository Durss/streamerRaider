import { Express } from "express-serve-static-core";
import * as Discord from "discord.js"
import * as fs from "fs"
import Logger from '../utils/Logger';
import Config from "../utils/Config";
import TwitchUtils, { TwitchStreamInfos, TwitchUserInfos } from "../utils/TwitchUtils";
import APIController from "./APIController";
import Utils from "../utils/Utils";
import { EventDispatcher } from "../utils/EventDispatcher";
import RaiderEvent from "../utils/RaiderEvent";

/**
* Created : 15/10/2020 
*/
export default class DiscordController extends EventDispatcher {

	private client:Discord.Client;
	private watchListCache:{[key:string]:string[]};
	private liveAlertsListCache:{[key:string]:string[]};
	private adminsCache:{[key:string]:string[]};
	private BOT_TOKEN:string = Config.DISCORDBOT_TOKEN;
	
	
	constructor() {
		super();
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
		
		if(!fs.existsSync(Config.DISCORD_CHANNELS_LIVE_ALERTS)) {
			fs.writeFileSync(Config.DISCORD_CHANNELS_LIVE_ALERTS, "{}");
			this.liveAlertsListCache = {};
		}else{
			this.liveAlertsListCache = JSON.parse(fs.readFileSync(Config.DISCORD_CHANNELS_LIVE_ALERTS, "utf8"));
			this.subToUsers();
		}
		
		if(!fs.existsSync(Config.DISCORD_CHANNELS_ADMINS)) {
			fs.writeFileSync(Config.DISCORD_CHANNELS_ADMINS, "{}");
			this.adminsCache = {};
		}else{
			this.adminsCache = JSON.parse(fs.readFileSync(Config.DISCORD_CHANNELS_ADMINS, "utf8"));
		}

		this.client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.DIRECT_MESSAGES] });
		try {
			await this.client.login(this.BOT_TOKEN);
		}catch(error) {
			Logger.error("Invalid discord token !");
			console.log(error);
		}

		this.client.on("messageCreate", (message) => this.onMessage(message));

		this.client.on("ready", ()=> this.onReady());

		this.client.on("guildMemberAdd", (member) => this.onAddMember(member))

		this.client.on("raw", (link) => {
			// console.log("ON RAW")
			// console.log(link);
		})
		// this.alertLiveChannel("pogscience", "252445282");//TODO remove debug
	}

	/**
	 * Sends a message to warn that a user went live on twitch
	 */
	public async alertLiveChannel(profile:string, uid:string, attemptCount:number = 0):Promise<void> {
		let res = await TwitchUtils.getStreamsInfos(null, [uid]);
		let infos = res.data[0];
		if(!infos) {
			if(attemptCount < 3) {
				Logger.info("No stream infos found for user " + uid + " try again.");
				setTimeout(_=> this.alertLiveChannel(profile, uid, attemptCount+1), 5000);
			}
			return;
		}
		
		// console.log("Message to send on profile ", profile);
		let guildId = Config.DISCORD_PROFILE_FROM_GUILD_ID(profile);
		// console.log("GuildID", guildId);
		let channelIDs = this.liveAlertsListCache[guildId];
		// console.log("Channel IDS", channelIDs);
		if(channelIDs) {
			for (let i = 0; i < channelIDs.length; i++) {
				const id = channelIDs[i];
				// console.log("Send to ID", id);
				let channel = this.client.channels.cache.get(id) as Discord.TextChannel;
				// console.log("Channel found ? "+(channel ? "yes" : "no"));
				
				if(channel) {
					let res = await TwitchUtils.loadChannelsInfo(null, [uid]);
					let userInfo:TwitchUserInfos = (await res.json()).data[0];
					infos.thumbnail_url = infos.thumbnail_url.replace("{width}", "320").replace("{height}", "180");

					let card = new Discord.MessageEmbed();
					card.setTitle(infos.title);
					card.setColor("#a970ff");
					card.setURL(`https://twitch.tv/${infos.user_login}`);
					card.setThumbnail(userInfo.profile_image_url);
					card.setImage(infos.thumbnail_url)
					card.setAuthor(infos.user_name+" est en live !", userInfo.profile_image_url)
					card.addFields(
						{ name: 'Catégorie', value: infos.game_name, inline: true },
						{ name: 'Viewers', value: infos.viewer_count.toString(), inline: true },
					);
					card.setFooter(userInfo.description);
					channel.send({embeds:[card]});
				}else{
					Logger.error("Channel not found");
				}
			}
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private async onReady():Promise<void> {
		Logger.success("Discord bot connected");
		// this.client.guilds.cache.map(async (g) => {
		// });
	}

	private subToUsers() {
		for (const key in this.liveAlertsListCache) {
			//if a live alert channel has been defined for this discord
			//sub to all users of the corresponding profile.
			if(this.liveAlertsListCache[key]) {
				let users = Utils.getUserList(null, key);
				let profile = Utils.getProfile(null, key)
				for (let i = 0; i < users.length; i++) {
					this.dispatchEvent(new RaiderEvent(RaiderEvent.SUB_TO_LIVE_EVENT, profile, users[i].id));
				}
			}
		}
	}

	/**
	 * Called when someone sends a message to a channel
	 * 
	 * @param message 
	 */
	private async onMessage(message:Discord.Message):Promise<void> {
		// console.log("Message received : ", message.author.bot, message.channel.type, message.content);
		
		if (message.author.bot) return;
		if (message.channel.type == "DM") return
		
		if(message.content.indexOf("!") == 0) this.parseCommand(message);
	}

	/**
	 * Called when someone joins the discord server
	 * @param member 
	 */
	private onAddMember(member:Discord.GuildMember | Discord.PartialGuildMember) {
		// console.log("New member ! ", member);
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
		let isAdmin = message.member.permissions.has("ADMINISTRATOR");
		
		for (let i = 0; i < this.adminsCache[message.member.guild.id]?.length; i++) {
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

			case "raider-live-add":
				if(isAdmin) {
					let channelName = (<any>message.channel).name;
					this.updateLiveAlertList(message.guild.id, message.channel.id, true);
					message.reply("Le bot d'alertes de live a bien été configuré sur le channel #"+channelName);
				}else{
					message.reply("Seul un Administrateur peut ajouter le bot à un channel");
				}
				break;

			case "raider-live-del":
				if(isAdmin) {
					let channelName = (<any>message.channel).name;
					this.updateLiveAlertList(message.guild.id, message.channel.id, false);
					message.reply("Le bot d'alertes de live a bien supprimé du channel #"+channelName);
				}else{
					message.reply("Seul un Administrateur peut ajouter le bot à un channel");
				}
				break;
		
			//List all registered users
			case "raider-list":
				let users = Utils.getUserList(null, message.guild.id);
				if(users.length == 0) {
					message.channel.send(`Il n'y a actuellement personne d'enregistré.`);
				}else{
					message.channel.send(`Il y a actuellement ${users.length} personnes enregistrées :\`\`\`
${users.map(v => v.name).join(", ")}
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

				//Add a command specific to "protopotes" group as we have a custom
				//command managed transparently by another bot. You won't need this.
				let protopoteSpecifics = "";
				let profile = Utils.getProfile(null, message.guild.id);
				if(profile == "protopotes") {
					protopoteSpecifics = `
!add-user TWITCH_LOGIN TWITTER_LOGIN
	Ajouter un·e utilisateur/trice twitch et son compte twitter

!remove-twitter TWITTER_LOGIN
	Supprimer son compte twitter du bot twitter d'alertes de live
`;
				}

				message.channel.send(`Voici les commandes disponibles :\`\`\`
!raider-add
	(admin) Ajouter le bot à un chan

!raider-del
	(admin) Supprimer le bot d'un chan

!raider-live-add
	(admin) Ajouter le bot d'alertes de live à un chan.
	Lorsqu'un·e utilisateur/trice twitch passe en live un message sera posté dans ce chan

!raider-live-del
	(admin) Supprime le bot d'alertes de live d'un chan.

!raider-list
	Liste toutes les personnes enregistrées

!add-user TWITCH_LOGIN
	Ajouter un·e utilisateur/trice twitch
${protopoteSpecifics}
!del-user TWITCH_LOGIN
	Supprimer un·e utilisateur/trice twitch

!add-description TWITCH_LOGIN DESCRIPTION
	Ajouter une description à un·e utilisateur/trice twitch

!del-description TWITCH_LOGIN
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
	 * Adds or removes a channel from the live alert list of the bot
	 * 
	 * @param serverId 
	 * @param channelId 
	 * @param add 
	 * @returns 
	 */
	private updateLiveAlertList(serverId:string, channelId:string, add:boolean = true):void {
		let text = fs.readFileSync(Config.DISCORD_CHANNELS_LIVE_ALERTS, "utf8");
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

		this.liveAlertsListCache = json;

		fs.writeFileSync(Config.DISCORD_CHANNELS_LIVE_ALERTS, JSON.stringify(json));
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

		let profile = Utils.getProfile(null, message.guild.id);
		let cmd = chunks[0];

		//Check if twitch user actually exists
		let login = chunks[1];
		let twitchUser;
		try {
			let result = await TwitchUtils.loadChannelsInfo([login]);
			let json = await result.json();
			
			if(json.data.length == 0) {
				message.reply("Le compte Twitch **\""+login+"\"** n'existe pas.");
				return;
			}
			twitchUser = json.data[0];
		}catch(error) {
			Logger.error("Failed to load channels info:");
			Logger.log(error);
			message.reply("Woops... y a eu une erreur pas prévue :(");
			return;
		}

		//Add or remove the user from the JSON file
		let users = Utils.getUserList(null, message.guild.id);
		let userIndex = users.findIndex(v => v.id == twitchUser.id);
		Logger.info(`Add/Del user: ${login}`);
		if( (cmd == "add-user" && userIndex == -1)
		|| (cmd == "del-user" && userIndex > -1)) {
			if(cmd == "add-user") {
				users.push({
					id:twitchUser.id,
					name:twitchUser.display_name,
					created_at: Date.now(),
				});
				message.reply("Le compte Twitch **\""+login+"\"** a bien été ajouté à la liste.");
				this.dispatchEvent(new RaiderEvent(RaiderEvent.USER_ADDED, profile, twitchUser.id));
			}else{
				users.splice(userIndex, 1);
				message.reply("Le compte Twitch **\""+login+"\"** a bien été supprimé de la liste.");
				this.dispatchEvent(new RaiderEvent(RaiderEvent.USER_REMOVED, profile, twitchUser.id));
			}
			fs.writeFileSync(Config.TWITCH_USERS_FILE(null, message.guild.id), JSON.stringify(users));
			APIController.invalidateCache(profile);
		}else{
			if(cmd == "add-user") {
				//Custom logic for "protopotes" site that has 2 discord bots running in sync
				if(profile != "protopotes" || chunks.length == 2) {
					message.reply("Le compte Twitch **\""+login+"\"** est déjà ajouté à la liste.");
				}
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

		//Check if twitch user actually exists
		let login = chunks[1];
		try {
			let result = await TwitchUtils.loadChannelsInfo([login]);
			let json = await result.json();
			if(json.data.length == 0) {
				message.reply("Le compte Twitch **\""+login+"\"** n'existe pas. Voici ce qque tu dois m'envoyer : `!add-description TWITCH_LOGIN DESCRIPTION`");
				return;
			}
		}catch(error) {
			message.reply("Woops... y a eu une erreur pas prévue :(");
			return;
		}

		//Add or remove the description from the JSON file
		let users = Utils.getUserList(null, message.guild.id);
		let userIndex = users.findIndex(v => v.name?.toLowerCase() == login?.toLowerCase());

		if(userIndex == -1) {
			//User not found on local DB
			message.reply("Le compte **\""+login+"\"** n'est pas enregistré. Commence par l'ajouter via cette commande : `!user-add "+login+"`");
			return;
		}

		let cmd = chunks[0];
		if(cmd == "add-description") {
			Logger.info(`Add description: ${login}`);
			//Add description to user
			let description = chunks.splice(2).join(" ");
			if(description?.length > 0) {
				users[userIndex].description = description;
				message.reply("La description a bien été enregistrée pour le compte **\""+login+"\"**.");
			}else{
				message.reply("Il faut me donner ta description comme ceci : `!add-description "+login+" DESCRIPTION`");
			}
		}else{
			Logger.info(`Delete description: ${login}`);
			//Delete description from user
			delete users[userIndex].description;
			message.reply("La description a bien été supprimée pour le compte **\""+login+"\"**.");
		}
		fs.writeFileSync(Config.TWITCH_USERS_FILE(null, message.guild.id), JSON.stringify(users));
		let profile = Utils.getProfile(null, message.guild.id)
		APIController.invalidateCache(profile);
	}

}