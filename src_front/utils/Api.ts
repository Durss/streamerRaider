import store from '@/store';
import Config from '@/utils/Config';

export default class Api {

	public static get(endpoint: string, params: any = null, headers: any = null, setDefaultheader:boolean = true, autoPrefixApiPath:boolean = true): Promise<any> {
		return this._call(endpoint, params, headers, 'GET', setDefaultheader, autoPrefixApiPath);
	}
	public static post(endpoint: string, params: any = null, headers: any = null, setDefaultheader:boolean = true, autoPrefixApiPath:boolean = true): Promise<any> {
		return this._call(endpoint, params, headers, 'POST', setDefaultheader, autoPrefixApiPath);
	}
	public static put(endpoint: string, params: any = null, headers: any = null, setDefaultheader:boolean = true, autoPrefixApiPath:boolean = true): Promise<any> {
		return this._call(endpoint, params, headers, 'PUT', setDefaultheader, autoPrefixApiPath);
	}
	public static patch(endpoint: string, params: any = null, headers: any = null, setDefaultheader:boolean = true, autoPrefixApiPath:boolean = true): Promise<any> {
		return this._call(endpoint, params, headers, 'PATCH', setDefaultheader, autoPrefixApiPath);
	}
	public static delete(endpoint: string, params: any = null, headers: any = null, setDefaultheader:boolean = true, autoPrefixApiPath:boolean = true): Promise<any> {
		return this._call(endpoint, params, headers, 'DELETE', setDefaultheader, autoPrefixApiPath);
	}

	protected static _call(endpoint: string, params: any = null, headers: any = null, verb: string = 'GET', setDefaultheader:boolean = true, autoPrefixApiPath:boolean = true): Promise<any> {
		let _headers:any = {};
		if(setDefaultheader) {
			_headers["Content-Type"] = "application/json";
		}
		if (headers) {
			for(let key in headers) {
				_headers[key] = headers[key];
			}
		}
		var options = {
			method: verb,
			headers: _headers
		};
		
		//Inject current profile if necessary
		// if(Config.profile) {
		// 	if(!params) params = {};
		// 	params.profile = Config.profile;
		// }
		
		let url = endpoint;
		if(autoPrefixApiPath) url = Config.API_PATH + "/" + url;
		if (verb == 'GET' && params != null) {
			let chunks = [];
			for (let key in params) {
				chunks.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
			}
			url += (url.indexOf("?") == -1? "?" : "") + chunks.join("&");
			params = null;
		}
		// let url = "//" + document.location.hostname + ":" + Config.API_PORT + '/api/' + api_version + "/" + endpoint;
		params = (params && _headers["Content-Type"] == "application/json" && typeof params != "string") ? JSON.stringify(params) : params;
		return this._sendRequest(url, options, params);
	}



	protected static async _sendRequest(url:string, options: any, bodyParams?: string): Promise<any> {
		if(bodyParams) {
			options.body = bodyParams;
		}
		
		let result = await fetch(url, options)
		if(result.status == 200) {
			let text = await result.text()
			try {
				let json = JSON.parse(text);
				if(json.success === false) {
					//Status 200 but JSON says there's an error
					throw(new ApiError(json));
				}else if(json.data){
					return json.data;
				}else{
					return json;
				}
			}catch(error) {
				if(text) {
					return text;
				}else{
					console.log(error);
					throw({success:false, error_code:"unknown", message:"Unable to decode query result"});
				}
			}
		}else if(result.status == 429) {
			let json = await result.json()
			let duration = Math.ceil(json.retryAfter/1000);
			store.dispatch("alert", "Too many requests, try again in "+duration+" seconds");
			throw({success:false, error_code:"unknown", message:"Too many requests, try again in "+duration+" seconds"});
		}else{
			let err:ApiError;
			try {
				let json = await result.json();
				err = new ApiError(json);
			}catch(error) {
				err = new ApiError({success:false, error_code:"unknown", message:"Unable to decode query result"});
			};
			throw(err);
		}
    }
}

export class ApiError {
	public success:boolean;
	public error_code:string;
	public message:string;

	constructor(json:any) {
		this.success = json.success;
		this.error_code = json.error_code;
		this.message = json.message;
	}
}