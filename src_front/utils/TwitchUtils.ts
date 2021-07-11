/**
* Created : 19/01/2021 
*/
export default class TwitchUtils {
	
	public static validateToken(oAuthToken:string):Promise<boolean|any> {
		return new Promise((resolve, reject) => {
			let headers:any = {
				"Authorization":"OAuth "+oAuthToken
			};
			var options = {
				method: "GET",
				headers: headers,
			};
			fetch("https://id.twitch.tv/oauth2/validate", options)
			.then((result) => {
				if(result.status == 200) {
					result.json().then((json)=> {
						resolve(json)
					});
				}else{
					resolve(false);
				}
			});
		});
	}
}

export declare module TwitchTypes {
	export interface StreamInfo {
		id:            string;
		user_id:       string;
		user_login:    string;
		user_name:     string;
		game_id:       string;
		game_name:     string;
		type:          string;
		title:         string;
		viewer_count:  number;
		started_at:    string;
		language:      string;
		thumbnail_url: string;
		tag_ids:       string[];
		description:   string;//Custom injected data from server.
	}

	export interface UserInfo {
		id:                string;
		login:             string;
		display_name:      string;
		type:              string;
		broadcaster_type:  string;
		description:       string;
		profile_image_url: string;
		offline_image_url: string;
		view_count:        number;
		created_at:        string;
	}
}