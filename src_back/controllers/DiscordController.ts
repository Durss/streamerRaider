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
import ProfileUtils from "../utils/ProfileUtils";

/**
* Created : 15/10/2020 
*/
export default class DiscordController extends EventDispatcher {

	private client:Discord.Client;
	private watchListCache:{[key:string]:string[]};
	private liveAlertChannelsListCache:{[key:string]:string[]};
	private adminsCache:{[key:string]:string[]};
	private maxViewersCount:{[key:string]:number} = {};
	private lastStreamInfos:{[key:string]:TwitchStreamInfos} = {};
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
		this.liveAlertChannelsListCache = {};
		
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
	}

	/**
	 * Called when eventsub is ready
	 */
	public onEventsubReady():void {
		
		if(!fs.existsSync(Config.DISCORD_CHANNELS_LIVE_ALERTS)) {
			fs.writeFileSync(Config.DISCORD_CHANNELS_LIVE_ALERTS, "{}");
			this.liveAlertChannelsListCache = {};
		}else{
			this.liveAlertChannelsListCache = JSON.parse(fs.readFileSync(Config.DISCORD_CHANNELS_LIVE_ALERTS, "utf8"));
			this.subToUsers();
		}
	}

	/**
	 * Sends a message to warn that a user went live on twitch
	 */
	public async alertLiveChannel(profile:string, uid:string, attemptCount:number = 0, editedMessage?:Discord.Message):Promise<void> {
		//If there's data in cache, it's becasue the stream is already live.
		//Avoid having two messages for the same stream by ignoring this one.
		if(this.lastStreamInfos[uid] && !editedMessage) return;

		let res = await TwitchUtils.getStreamsInfos(null, [uid]);
		let streamDetails = res.data[0];
		if(!streamDetails) {
			let maxAttempt = 10;
			if(attemptCount < maxAttempt) {
				if(!editedMessage) {
					Logger.info("No stream infos found for user " + uid + " try again.");
				}
				setTimeout(_=> this.alertLiveChannel(profile, uid, attemptCount+1, editedMessage), 5000 * (attemptCount+1));
			}

			if(attemptCount>=maxAttempt && editedMessage) {
				//user closed his/her stream, replace the stream picture by the offline one
				let res = await TwitchUtils.loadChannelsInfo(null, [uid]);
				let userInfo:TwitchUserInfos = (await res.json()).data[0];
				// editedMessage.embeds[0].setImage(userInfo.offline_image_url.replace("{width}", "1080").replace("{height}", "600"));

				let card = this.buildLiveCard(profile, this.lastStreamInfos[userInfo.id], userInfo, false, true);
				await editedMessage.edit({embeds:[card]});
				delete this.lastStreamInfos[userInfo.id];
				delete this.maxViewersCount[userInfo.id];
			}
			return;
		}
		
		//Get discord guild ID from current profile
		let guildId = Config.DISCORD_GUILD_ID_FROM_PROFILE(profile);
		//Get channels IDs in which send alerts
		let channelIDs = this.liveAlertChannelsListCache[guildId];
		if(channelIDs) {
			for (let i = 0; i < channelIDs.length; i++) {
				const id = channelIDs[i];
				//Get actual channel's reference
				let channel = this.client.channels.cache.get(id) as Discord.TextChannel;
				if(channel) {
					//Get twitch channel's infos
					let res = await TwitchUtils.loadChannelsInfo(null, [uid]);
					let userInfo:TwitchUserInfos = (await res.json()).data[0];
					let card = this.buildLiveCard(profile, streamDetails, userInfo, editedMessage!=null);
					let message:Discord.Message;
					if(editedMessage) {
						//Edit existing message
						message = editedMessage;
						message = await message.edit({embeds:[card]});
					}else{
						message = await channel.send({embeds:[card]});
					}
					//Schedule message update 1min later
					setTimeout(_=> {
						this.alertLiveChannel(profile, uid, 0, message);
					}, 1 * 60 * 1000);
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
		for (const key in this.liveAlertChannelsListCache) {
			//if a live alert channel has been defined for this discord
			//sub to all users of the corresponding profile.
			if(this.liveAlertChannelsListCache[key]) {
				let users = Utils.getUserList(null, key);
				let profile = ProfileUtils.getProfile(null, key)?.id;
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
		const txt = message.content.substr(1, message.content.length);
		const chunks = txt.split(/\s/gi);
		const cmd = chunks[0];
		const profile = ProfileUtils.getProfile(null, message.guild.id);
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

			case "eventsub-unsub-all":
				this.dispatchEvent(new RaiderEvent(RaiderEvent.RESET_EVENTSUB, profile.id));
				break;

			case "eventsub-resub-all":
				this.subToUsers();
				break;

			case "raider-help":
				if(!this.isWatchingChannel(message) && !isAdmin) return;

				//Add a command specific to "protopotes" group as we have a custom
				//command managed transparently by another bot. You won't need this.
				let protopoteSpecifics = "";
				let liveAlertSpecifics = "";

				//Just some specific commands for the "protopotes" group
				if(profile.id == "protopotes") {
					protopoteSpecifics = `
!add-user TWITCH_LOGIN TWITTER_LOGIN
	Ajouter un·e utilisateur/trice twitch et son compte twitter

!remove-twitter TWITTER_LOGIN
	Supprimer son compte twitter du bot twitter d'alertes de live
`;
				}

				//Adding "live alert" bot infos if credentials are set
				if(Config.EVENTSUB_SECRET && Config.EVENTSUB_CALLBACK) {
					liveAlertSpecifics = `
!raider-live-add
	(admin) Ajouter le bot d'alertes de live à un chan.
	Lorsqu'un·e utilisateur/trice twitch passe en live un message sera posté dans ce chan

!raider-live-del
	(admin) Supprime le bot d'alertes de live d'un chan.
`;
				}

	
				message.channel.send(`Voici les commandes disponibles :\`\`\`
!raider-add
	(admin) Ajouter le bot à un chan

!raider-del
	(admin) Supprimer le bot d'un chan

!raider-list
	Liste toutes les personnes enregistrées
${liveAlertSpecifics}
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

		this.liveAlertChannelsListCache = json;

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

		let profile = ProfileUtils.getProfile(null, message.guild.id)?.id;
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
					lastActivity: Date.now(),
				});
				message.reply("Le compte Twitch **\""+login+"\"** a bien été ajouté à la liste.");


		
				//Get discord guild ID from current profile
				let guildId = Config.DISCORD_GUILD_ID_FROM_PROFILE(profile);
				//Get channels IDs in which send alerts
				let channelIDs = this.liveAlertChannelsListCache[guildId];
				if(channelIDs) {
					for (let i = 0; i < channelIDs.length; i++) {
						const id = channelIDs[i];
						//Get actual channel's reference
						let channel = this.client.channels.cache.get(id) as Discord.TextChannel;
						if(channel) {
							//A channel is configured, subscribe user for eventsub notifications
							this.dispatchEvent(new RaiderEvent(RaiderEvent.SUB_TO_LIVE_EVENT, profile, twitchUser.id));
						}
					}
				}
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
		let profile = ProfileUtils.getProfile(null, message.guild.id)?.id;
		APIController.invalidateCache(profile);
	}

	/**
	 * Creates a message card for a live stream
	 */
	private buildLiveCard(profile:string, infos:TwitchStreamInfos, userInfo:TwitchUserInfos, liveMode:boolean, offlineMode:boolean =false):Discord.MessageEmbed {
		if(offlineMode) {
			let url = userInfo.offline_image_url;
			if(!url) {
				url = "https://"+ProfileUtils.getPublicDomainFromProfile(profile);
				url += "/offline.png";
			}
			infos.thumbnail_url = url.replace("{width}", "1080").replace("{height}", "600");
		}else{
			infos.thumbnail_url = infos.thumbnail_url.replace("{width}", "1080").replace("{height}", "600");
		}

		let refreshInterval = 5 * 60 * 1000;//Twitch stream preview updates every 5 minutes
		let cacheKiller = Math.floor(Date.now()/refreshInterval)*refreshInterval;
		let card = new Discord.MessageEmbed();
		card.setTitle(infos.title);
		card.setColor("#a970ff");
		card.setURL(`https://twitch.tv/${infos.user_login}`);
		card.setThumbnail(userInfo.profile_image_url);
		card.setImage(infos.thumbnail_url+"?t=" + cacheKiller );
		card.addFields(
			{ name: 'Catégorie', value: infos.game_name, inline: false },
		);
		if(liveMode) {
			card.setAuthor("🔴 "+infos.user_name+" est en live !", userInfo.profile_image_url);
			let ellapsed = Date.now() - new Date(infos.started_at).getTime();
			let uptime:string = Utils.formatDuration(ellapsed);
			if(!this.maxViewersCount[userInfo.id]) this.maxViewersCount[userInfo.id] = 0;
			this.maxViewersCount[userInfo.id] = Math.max(this.maxViewersCount[userInfo.id], infos.viewer_count);
			card.addFields(
				{ name: 'Viewers', value: infos.viewer_count.toString(), inline: true },
				{ name: 'Uptime', value: uptime, inline: true },
			);
			this.lastStreamInfos[userInfo.id] = infos;
		}else if(offlineMode) {
			card.setAuthor(infos.user_name+" était en live.", userInfo.profile_image_url);
			let fields:Discord.EmbedField[] = [];
			if(this.maxViewersCount[userInfo.id]) {
				fields.push({ name: 'Viewers max', value: this.maxViewersCount[userInfo.id].toString(), inline: true });
			}
			let ellapsed = Date.now() - new Date(infos.started_at).getTime();
			let uptime:string = Utils.formatDuration(ellapsed);
			fields.push({ name: 'Durée du stream', value: uptime, inline: true });
			card.addFields( fields );
		}
		card.setFooter(userInfo.description);
		return card;
	}

}