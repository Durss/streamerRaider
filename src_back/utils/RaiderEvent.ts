import { Event } from './EventDispatcher';
import { TwitchStreamInfos } from './TwitchUtils';

/**
* Created : 07/12/2020 
*/
export default class RaiderEvent extends Event {

	public static SUB_TO_LIVE_EVENT:string = "SUB_TO_LIVE_EVENT";
	public static DISCORD_ALERT_LIVE:string = "DISCORD_ALERT_LIVE";
	public static USER_ADDED:string = "USER_ADDED";
	public static USER_REMOVED:string = "USER_REMOVED";
	
	constructor(type:string, public profile?:string, public channelId?:string) {
		super(type, null);
	}
	
}