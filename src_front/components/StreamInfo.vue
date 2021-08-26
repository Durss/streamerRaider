<template>
	<div :class="classes" @mouseleave="outItem()">
		<!-- HEADER -->
		<div class="userName head">
			<img v-if="userInfos" :src="userPicture" alt="avatar" class="avatar">
			
			<a class="name" :href="'https://twitch.tv/'+userName" target="_blank">{{userName}}</a>
			
			<div v-if="lightMode" class="viewersCount small">
				<span>{{streamInfos.viewer_count}}</span>
				<img class="icon" src="@/assets/icons/eye.svg" alt="">
			</div>

			<Button class="link"
				v-if="streamInfos && !lightMode"
				:icon="require('@/assets/icons/open.svg')"
				type="link"
				target="_blank"
				:to="'https://twitch.tv/'+userName" />
		</div>
		
		<!-- CONTENT -->
		<div class="detailsHolder content" v-if="streamInfos">
			<div class="infos">
				<div class="title">{{streamInfos.title}}</div>
				<div class="category" v-if="streamInfos.game_name && !lightMode">{{streamInfos.game_name}}</div>
				<div class="duration">{{streamDuration}}</div>
			</div>
			
			<div class="preview" @mouseenter="hoverItem()" v-if="!lightMode">
				<div class="streamImage" v-if="!showLive"><img :src="previewUrl"></div>
				<iframe
					class="streamImage"
					v-if="showLive"
					:src="'https://player.twitch.tv/?channel='+userName+'&parent='+twitchParent+'&autoplay=true'"
					height="190"
					width="340"
					allowfullscreen="true">
				</iframe>
				<div v-if="!lightMode && streamInfos" class="viewersCount">{{streamInfos.viewer_count}} viewers</div>
			</div>

			<div class="description" v-if="!lightMode && userInfos.rawData.description && !showLive">{{userInfos.rawData.description}}</div>
		
			<!-- RAID BUTTON -->
			<Button v-if="streamInfos && !isSelf"
				:title="'Raid '"
				class="raid"
				@click="startRaid()"
				:disabled="!canRaid"
				:data-tooltip="connected? null : 'Connecte toi en haut de page pour lancer un raid chez '+userName" />
		</div>
		
		<div class="newUser" v-if="isNewUser">NEW</div>
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
	public userInfos:TwitchTypes.UserInfo;

	@Prop()
	public lightMode:boolean;
	
	public showLive:boolean = false;

	private increment:number = 0;
	private refreshThumbInterval:number;
	private incrementInterval:number;
	private pictureRefreshInc:number = 0;

	public get connected():boolean { return this.$store.state.OAuthToken; }

	public get streamInfos():TwitchTypes.StreamInfo { return this.userInfos.streamInfos; }
	
	public get isNewUser():boolean { return Date.now() - this.userInfos?.rawData.created_at < 31*24*60*60*1000; }

	public get twitchParent():string {
		return document.location.hostname;
	}

	public get isSelf():boolean {
		return this.userInfos.login.toLowerCase() == this.$store.state.userLogin.toLowerCase();
	}

	public get userPicture():string {
		return this.userInfos.profile_image_url.replace("300x300", "70x70");
	}

	public get classes():string[] {
		let res = ["streaminfo"];
		if(this.showLive) res.push("expand");
		if(this.small !== false) res.push("small");
		if(this.lightMode !== false) res.push("light");
		if(this.isNewUser !== false) res.push("isNew");
		return res;
	}

	public get canRaid():boolean {
		return this.$store.state.OAuthToken;
	}

	public get streamDuration():string {
		let ellapsed = Date.now() - new Date(this.userInfos.streamInfos.started_at).getTime() + this.increment;
		return Utils.formatDuration(ellapsed)
	}

	public get previewUrl():string {
		return this.userInfos.streamInfos.thumbnail_url.replace(/\{width\}/gi, "340").replace(/\{height\}/gi, "190")+"?ck="+this.pictureRefreshInc;
	}

	public async mounted():Promise<void> {
		//Allows to increment stream durations every seconds without using requestAnimationFrame
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
	.block();
	position: relative;
	
	&.expand {
		.detailsHolder {
			.infos {
				max-width: 25%;
			}
			.preview {
				max-width: 75%;
				.streamImage {
					@ratio: 1;
					width: calc(340px * @ratio);
					height: calc(190px * @ratio);
				}
			}
		}
	}

	&.isNew {
		background-color: mix(@mainColor_dark_light, @mainColor_warn_light, 80%);
		.head {
			background-color: mix(@mainColor_dark_extralight, @mainColor_warn, 50%);
			.name {
				color: @mainColor_normal_extralight;
			}
		}
	}

	&.small, &.light {
		width: 100%;
		margin-bottom: 10px !important;//ooouh...bad bad me :)
		&.small {
			width: 250px;
		}
		.head {
			padding: 0;
			.avatar {
				border-radius: 0;
				vertical-align: top;
				margin-right: 10px;
				border: 0px;
			}
		}
		.userName {
			margin-bottom: 0px;
			.name {
				font-size: 20px;
				// word-wrap: break-word;
			}
		}
		.detailsHolder {
			.infos {
				width: 100%;
				max-width: 100%;
				margin-right: 0;
				.title {
					width: 100%;
					font-size: 12px;
					font-weight: normal;
					text-align: center;
					margin-bottom: 0;
				}
				.duration {
					font-family: "Nunito Light";
					margin: auto;
					font-size: 10px;
					background-color: rgba(255, 255, 255, .25);
					padding: 2px 4px;
					position: absolute;
					bottom: 0;
					right: 0;
					border-radius: 0;
					border-top-left-radius: 7px;
					position: absolute;
					bottom: 0;
					right: 0;
				}
			}
			.raid {
				font-size: 15px;
				padding: 5px 20px;
			}
		}

		.newUser {
			position: absolute;
			top: 0;
			left: 30px;
			transform: unset;
			transform: rotate(90deg) translate(0, -100%);
			transform-origin: top left;
			color: #fff;
			height: 10px;
			width: 30px;
			color: @mainColor_dark;
			background-color: @mainColor_warn;
			font-family: "Nunito Black";
			padding: 1px 1px;
			font-size: 11px;
		}
	}

	.userName {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		.avatar {
			width: 30px;
			height: 30px;
			border-radius: 50%;
			vertical-align: top;
			border: 1px solid @mainColor_normal;
		}

		.name {
			flex-grow: 1;
			text-transform: capitalize;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.link {
			width: 30px;
			height: 30px;
			min-width: 30px;
			min-height: 30px;
			max-width: 30px;
			max-height: 30px;
			padding: 5px;
			border-radius: 10px;
		}
	}
		
	.viewersCount {
		font-style: italic;
		font-size: 12px;
		text-align: center;
		padding-right: 5px;
		&.small {
			color: white;
			opacity: 0.5;
			.icon {
				height: 10px;
				margin-left: 3px;
			}
		}
	}

	.detailsHolder {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		text-align: left;
		justify-content: space-between;
		position: relative;

		.infos {
			max-width: 50%;
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
			max-width: 50%;
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
		}

		.description {
			font-size: 17px;
			font-style: italic;
			padding-left: 40px;
			position: relative;
			margin-top: 10px;
			opacity: .6;
			font-family: "Nunito Light";
			width: 100%;
			box-sizing: border-box;
			&::before {
				content: "";
				background: url("../assets/icons/quote.svg");
				background-size: 30px 30px;
				width: 30px;
				height: 30px;
				display: block;
				top: 0;
				left: 0;
				position: absolute;
			}
		}

		.raid {
			padding-left: 50px;
			padding-right: 50px;
			margin: 0 auto;
			margin-top: 10px;
		}
	}

	.newUser {
		position: absolute;
		bottom: 0;
		left: 0;
		transform: translate(-20px, -10px) rotate(45deg);
		color: #fff;
		font-family: "Nunito Black";
		background-color: @mainColor_warn;
		padding: 3px 25px;
		font-size: 14px;
	}

}

@media only screen and (max-width: 500px) {
	.streaminfo{
		.detailsHolder {
			display: flex;
			flex-direction: column;
			flex-wrap: wrap;
			text-align: left;
			justify-content: space-between;
			.infos,.preview {
				max-width: 100%;
			}
			.preview {
				.streamImage {
					@ratio: 1;
					max-width: 100%;
					width: calc(340px * @ratio);
					height: calc(190px * @ratio);
					img, iframe {
						max-width: 100%;
						width: calc(340px * @ratio);
						height: calc(190px * @ratio);
					}
				}
			}
		}
	
		&.expand {
			.detailsHolder {
				.infos {
					max-width: 100%;
				}
				.preview {
					max-width: 100%;
				}
			}
		}
	}
}

@media only screen and (max-width: 320px) {
	.streaminfo{
		.detailsHolder {
			.preview {
				.streamImage {
					@ratio: .7;
					width: calc(340px * @ratio);
					height: calc(190px * @ratio);
					img, iframe {
						width: calc(340px * @ratio);
						height: calc(190px * @ratio);
					}
				}
			}
		}
	}
}
</style>