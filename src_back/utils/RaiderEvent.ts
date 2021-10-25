import { Event } from './EventDispatcher';
import { TwitchStreamInfos } from './TwitchUtils';

/**
* Created : 07/12/2020 
*/
export default class RaiderEvent extends Event {

	public static SUB_TO_LIVE_EVENT:string = "SUB_TO_LIVE_EVENT";
	public static DISCORD_ALERT_LIVE:string = "DISCORD_ALERT_LIVE";
	
	constructor(type:string, public profile?:string, public channelId?:string) {
		super(type, null);
	}
	
}