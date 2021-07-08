import { Express } from "express-serve-static-core";
import * as Discord from "discord.js"
import Logger from '../utils/Logger';

/**
* Created : 15/10/2020 
*/
export default class DiscordController {

	private client:Discord.Client;
	private BOT_TOKEN:string = "";
	private CHANNEL_ID:string = "766270413746864178";
	
	
	constructor() {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async create(app:Express):Promise<void> {
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
		this.client.guilds.cache.map(async (g) => {
		});
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
	private parseCommand(message:Discord.Message):void {
		switch(message.content.substr(1, message.content.length)) {
			case "register":
				message.author.send(`Hello <@${message.member.id}>, you apparently want to register your box!
I'm happy about this, it will give you access to private channels to chat .
Just send me the **Register code** written on the card given with the box!`);
				message.reply("I just sent you a private message to proceed your box registration :)");
				break;
		}
	}

}