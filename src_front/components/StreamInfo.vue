<template>
	<div :class="classes">
		<div class="userName">
			<img v-if="userInfos" :src="userInfos.profile_image_url" alt="avatar" class="avatar">
			<a :href="'https://twitch.tv/'+userName" target="_blank">{{userName}}</a>
		</div>
		
		<div class="detailsHolder" v-if="streamInfos">
			<div class="infos">
				<div class="title">{{streamInfos.title}}</div>
				<div class="category" v-if="streamInfos.game_name">{{streamInfos.game_name}}</div>
				<div class="duration">{{streamDuration}}</div>
			</div>
			<div class="preview" @mouseenter="hoverItem()" @mouseleave="outItem()">
				<div class="streamImage" v-if="!showLive"><img :src="previewUrl"></div>
				<iframe
					class="streamImage"
					v-if="showLive"
					:src="'https://player.twitch.tv/?channel='+userName+'&parent=localhost&autoplay=true'"
					height="190"
					width="340"
					allowfullscreen="true">
				</iframe>
				<div v-if="streamInfos" class="viewersCount">{{streamInfos.viewer_count}} viewers</div>
			</div>
		</div>

		<Button v-if="streamInfos" :title="'Raid '+userName" class="raid" @click="startRaid()" :disabled="!canRaid" />
	</div>
</template>

<script lang="ts">
import IRCClient from "@/utils/IRCClient";
import { TwitchTypes } from "@/utils/TwitchUtils";
import Utils from "@/utils/Utils";
import { Component, Prop, Vue } from "vue-property-decorator";
import Button from "./Button.vue";

@Component({
	components:{
		Button,
	}
})
export default class StreamInfo extends Vue {

	@Prop()
	public userName:string;

	@Prop({default:false})
	public small!:boolean;

	@Prop()
	public streamInfos:TwitchTypes.StreamInfo;

	@Prop()
	public userInfos:TwitchTypes.UserInfo;
	
	public showLive:boolean = false;

	private increment:number = 0;
	private refreshThumbInterval:number;
	private incrementInterval:number;
	private pictureRefreshInc:number = 0;

	public get classes():string[] {
		let res = ["streaminfo"]
		if(this.showLive) res.push("expand");
		if(this.small !== false) res.push("small");
		return res;
	}

	public get canRaid():boolean {
		return this.$store.state.OAuthToken;
	}

	public get streamDuration():string {
		let ellapsed = Date.now() - new Date(this.streamInfos.started_at).getTime() + this.increment;
		return Utils.formatDuration(ellapsed)
	}

	public get previewUrl():string {
		return this.streamInfos.thumbnail_url.replace(/\{width\}/gi, "340").replace(/\{height\}/gi, "190")+"?ck="+this.pictureRefreshInc;
	}

	public async mounted():Promise<void> {
		//Allows to increment durations every seconds
		this.incrementInterval = setInterval(_=> {
			this.increment ++;
		},1000);

		//Refresh stream pictures every 5min + random duration to
		//avoid having all pictures refreshing at once
		this.refreshThumbInterval = setInterval(_=> {
			this.pictureRefreshInc ++;
		}, 5 * 60 * 1000 + Math.random()*30000);
	}

	public beforeDestroy():void {
		clearInterval(this.incrementInterval);
		clearInterval(this.refreshThumbInterval);
	}

	public hoverItem():void {
		this.showLive = true;
	}

	public outItem():void {
		this.showLive = false;
	}

	public startRaid():void {
		Utils.confirm("Lancer un raid", "Veux-tu vraiment lancer un raid vers la chaîne de "+this.userName+" ?")
		.then(_=> {
			IRCClient.instance.sendMessage("/raid "+this.userName);
		}).catch(error=>{});
	}

}
</script>

<style scoped lang="less">
.streaminfo{
	width: 500px;
	color: @mainColor_light;
	font-family: "Inter";
	font-size: 18px;
	background-color: @mainColor_dark_light;
	box-shadow: rgba(0, 0, 0, 0.5) 0px 6px 16px 0px, rgba(0, 0, 0, 0.4) 0px 0px 4px 0px;
	box-sizing: border-box;
	border-radius: 10px;
	overflow: hidden;

	&.expand {
		.detailsHolder {
			.preview {
				.streamImage {
					@ratio: 1;
					width: calc(340px * @ratio);
					height: calc(190px * @ratio);
				}
			}
		}
	}

	&.small {
		width: 250px;
		.userName {
			margin-bottom: 0px;
			a {
				font-size: 20px;
				// word-wrap: break-word;
			}
		}
	}

	.userName {
		margin-bottom: 10px;
		padding: 10px;
		background-color: @mainColor_dark_extralight;
		display: flex;
		flex-direction: row;
		align-items: center;
		a {
			flex-grow: 1;
			text-align: center;
			font-family: "Nunito";
			font-size: 30px;
			text-transform: capitalize;
			color: @mainColor_normal;
		}
		.avatar {
			width: 30px;
			height: 30px;
			border-radius: 50%;
			vertical-align: top;
			margin-right: 10px;
			border: 1px solid @mainColor_normal;
		}
	}

	.detailsHolder {
		padding: 10px;
		display: flex;
		flex-direction: row;
		text-align: left;
		justify-content: space-between;
		.infos {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			margin-right: 10px;
			.title {
				font-size: 20px;
				font-weight: bold;
				margin-bottom: 10px;
			}
			.category {
				font-size: 14px;
				margin-bottom: 10px;
			}
			.duration {
				font-size: 14px;
			}
		}
		.preview {
			.streamImage {
				@ratio: .5;
				width: calc(340px * @ratio);
				height: calc(190px * @ratio);
				background-color: #cccccc;
				padding: 0;
				margin: auto;
				border: none;
				img, iframe {
					width: calc(340px * @ratio);
					height: calc(190px * @ratio);
				}
			}

			.viewersCount {
				font-style: italic;
				font-size: 14px;
				text-align: center;
			}
		}
	}

	.raid {
		padding-left: 50px;
		padding-right: 50px;
		margin-bottom: 20px;
	}

}
</style>