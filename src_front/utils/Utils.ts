import VueI18n from 'vue-i18n';
import { Route } from 'vue-router';
import store from '../store';

/**
 * Created by Durss
 */
export default class Utils {
		
	/**
	 * Picks random entry
	 *
	 * @param a
	 */
	public static pickRand<T>(a:T[]):T {
		return a[ Math.floor(Math.random() * a.length) ];
	}

	/**
	* getLessVars parses your LESS variables to Javascript (provided you make a dummy node in LESS)
	* @param {String} id The CSS-id your variables are listed under.
	* @param {Boolean} [parseNumbers=true] Try to parse units as numbers.
	* @return {Object} A value object containing your LESS variables.
	* @example
	* LESS:
	* 	@myLessVariable: 123px;
	* 	#dummyLessId { width: @myLessVariable; }
	* Javascript:
	* 	getLessVars('dummyLessId');
	* returns:
	* 	{myLessVariable:123}
	*/
	private static cachedVars = null;
	public static getLessVars(id:string = "lessVars", parseNumbers: boolean = true): any {
		if(this.cachedVars) return this.cachedVars;

		var bNumbers = parseNumbers === undefined ? true : parseNumbers
			, oLess = {}
			, rgId = /\#[\w-]+/
			, rgKey = /\.([\w-]+)/
			, rgUnit = /[a-z]+$/
			, aUnits = 'em,ex,ch,rem,vw,vh,vmin,cm,mm,in,pt,pc,px,deg,grad,rad,turn,s,ms,Hz,kHz,dpi,dpcm,dppx'.split(',')
			, rgValue = /:\s?(.*)\s?;\s?\}/
			, rgStr = /^'([^']+)'$/
			, sId = '#' + id
			, oStyles = document.styleSheets;
		for (var i = 0, l = oStyles.length; i < l; i++) {
			var oRules;
			try { oRules = (<any>oStyles[i]).cssRules; }
			catch (e) { continue; }
			if (oRules) {
				for (var j = 0, k = oRules.length; j < k; j++) {
					try { var sRule = oRules[j].cssText; }
					catch (e) { continue; }
					var aMatchId = sRule.match(rgId);
					if (aMatchId && aMatchId[0] == sId) {
						var aKey = sRule.match(rgKey)
							, aVal = sRule.match(rgValue);
						if (aKey && aVal) {
							var sKey = aKey[1]
								, oVal = aVal[1]
								, aUnit
								, aStr;
							if (bNumbers && (aUnit = oVal.match(rgUnit)) && aUnits.indexOf(aUnit[0]) !== -1) {
								oVal = parseFloat(oVal);
							} else if (aStr = oVal.match(rgStr)) {
								oVal = aStr[1];
							}
							(<any>oLess)[sKey] = oVal;
						}
					}
				}
			}
		}
		this.cachedVars = oLess;
		return oLess;
	}


	/**
	 * Opens up a confirm window so the user can confirm or cancel an action.
	 */
	public static confirm<T>(title: string|VueI18n.TranslateResult,
		description?: string|VueI18n.TranslateResult,
		data?: T,
		yesLabel?:string|VueI18n.TranslateResult,
		noLabel?:string|VueI18n.TranslateResult): Promise<T> {
		let prom = <Promise<T>>new Promise((resolve, reject) => {
			let confirmData: any = {}
			confirmData.title = title;
			confirmData.description = description;
			confirmData.yesLabel = yesLabel;
			confirmData.noLabel = noLabel;
			confirmData.confirmCallback = () => {
				resolve(data);
			};
			confirmData.cancelCallback = () => {
				reject(data);
			};
			store.dispatch("confirm", confirmData);
		});
		prom.catch((error) => {/*ignore*/ });//Avoid uncaugh error if not catched externally
		return prom;
	}


	/**
	 * Copies a text to clipboard
	 */
	public static copyToClipboard(text: string): void {
		const el = document.createElement('textarea');
		el.value = text;
		el.setAttribute('readonly', '');
		el.style.position = 'absolute';
		el.style.left = '-9999px';
		document.body.appendChild(el);
		const selected =
			document.getSelection().rangeCount > 0
				? document.getSelection().getRangeAt(0)
				: false;
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
		if (selected) {
			document.getSelection().removeAllRanges();
			document.getSelection().addRange(selected);
		}
	}

	public static getQueryParameterByName(name, url?) {
		if (!url) url = window.location.href;
		name = name.replace(/[\[\]]/g, "\\$&");
		let regex = new RegExp("[#?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}

	public static secondsToInputValue(seconds: number): string {
		let h = Math.floor(seconds / 3600000);
		let m = Math.floor((seconds - h * 3600000) / 60000);
		let s = Math.round((seconds - h * 3600000 - m * 60000) / 1000);
		let res = this.toDigits(s);
		if(m > 0 || h > 0) res = this.toDigits(m) + ":" + res;
		if(h > 0) res = this.toDigits(h) + ":" + res;
		return res;
	}

	public static promisedTimeout(delay: number): Promise<void> {
		return new Promise(function (resolve) {
			setTimeout(_ => resolve(), delay);
		})
	}

	/**
	 * Parse all matched routes from last to first to check
	 * for a meta prop and return it.
	 * 
	 * @param route 
	 * @param metaKey 
	 */
	public static getRouteMetaValue(route:Route, metaKey:string):any {
		let res = null;
		for (let i = route.matched.length-1; i >= 0; i--) {
			const v = route.matched[i].meta[metaKey];
			if(v === undefined) continue;
			res = v;
			break;
		}
		return res;
	}

	private static toDigits(num:number, digits:number = 2):string {
		let res = num.toString();
		while(res.length < digits) res = "0"+res;
		return res;
	}

	public static formatDuration(millis: number): string {
		let res = this.secondsToInputValue(millis);
		let days = Math.floor(millis / (24 * 3600*1000));
		if(days > 1) {
			res = days+"j "+res;
		}
		return res;
	}
}