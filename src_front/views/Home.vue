<template>
	<div :class="classes">
		<transition name="fade">
			<div class="loader" v-if="loading">
				<img src="@/assets/loader/loader.svg">
				<div class="label">...chargement des chaînes...</div>
			</div>
		</transition>

		<div class="confError" v-if="missingTwitchKeys">Please fill in the <strong>client_id</strong> and <strong>secret_id</strong> values inside the file <strong>data/credentials.json</strong> created at the root of the project!</div>
		
		<div class="confError" v-if="missingTwitchUsers">Please add users to the file <strong>data/{{userFile}}.json</strong> at the root of the project</div>

		<div v-if="!loading && !missingTwitchKeys && !missingTwitchUsers" class="page">
			<div v-if="!lightMode">
				<img :src="logoPath" height="100">
				<h1>{{title}} Raider</h1>
			</div>

			<AuthForm class="menu"
				v-if="!connected"
				:lightMode="lightMode" />
			
			<!-- OBS PANEL INFO -->
			<OBSPanelInfo v-if="showOBSPanel" @close="showOBSPanel=false" />

			<!-- USER FORM (edit description) -->
			<StreamerForm v-if="showProfileForm" @close="showProfileForm=false" />
			
			<!-- MAIN MENU -->
			<div v-if="connected" class="menu">
				<Button title="Lancer un raid aléatoire" v-if="onlineUsers.length > 0" white
					@click="randomRaid()"
					:icon="require('@/assets/icons/random.svg')" />

				<Button v-if="isAStreamer && !lightMode" title="Mes infos" white
					@click="showProfileForm=true"
					:icon="require('@/assets/icons/edit.svg')" />

				<Button title="OBS Panel" white
					v-if="!lightMode"
					@click="getOBSPanel()"
					:icon="require('@/assets/icons/obs.svg')" />

				<Button :title="lightMode? '' : 'Logout'" highlight class="logout"
					@click="logout()"
					:icon="require('@/assets/icons/cross_white.svg')" />
			</div>
			
			<!-- ONLINE USERS -->
			<div class="block">
				<div class="title" v-if="!lightMode">
					<span class="line"></span>
					<h2>STREAMERS EN LIGNE ({{onlineUsers.length}})</h2>
					<span class="line"></span>
				</div>
				<transition-group class="list" name="appear" tag="div"
				v-bind:css="false"
				v-on:before-enter="beforeEnter"
				v-on:enter="enter"
				v-on:leave="leave">
					<StreamInfo class="stream" v-for="(u, index) in onlineUsers"
						:data-index="index"
						:key="u.userName"
						:userName="u.userName"
						:streamInfos="u.stream"
						:userInfos="u.user"
						:lightMode="lightMode" />
				</transition-group>
				<div class="noResult" v-if="onlineUsers.length == 0">
					<img src="@/assets/icons/sadFace.svg" class="icon">
					<span>Personne n'est en ligne</span>
				</div>
			</div>

			<!-- OFFLINE USERS -->
			<div class="block offline" v-if="!lightMode">
				<div class="title">
					<span class="line"></span>
					<h2>STREAMERS HORS LIGNE ({{offlineUsers.length}})</h2>
					<span class="line"></span>
				</div>
				
				<transition-group class="list" name="appear" tag="div"
				v-bind:css="false"
				v-on:before-enter="beforeEnter"
				v-on:enter="enter"
				v-on:leave="leave">
					<StreamInfo class="stream" v-for="(u, index) in offlineUsers"
						:data-index="index*.25"
						:key="u.userName"
						:userName="u.userName"
						:userInfos="u.user"
						small />
				</transition-group>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import AuthForm from "@/components/AuthForm.vue";
import Button from "@/components/Button.vue";
import StreamInfo from "@/components/StreamInfo.vue";
import StreamerForm from "@/components/StreamerForm.vue";
import Api from "@/utils/Api";
import IRCClient from "@/utils/IRCClient";
import { TwitchTypes } from "@/utils/TwitchUtils";
import Utils from "@/utils/Utils";
import gsap from "gsap/all";
import { Component, Prop, Vue } from "vue-property-decorator";
import Config from "@/utils/Config";
import OBSPanelInfo from "@/components/OBSPanelInfo.vue";

@Component({
	components: {
		Button,
		AuthForm,
		StreamInfo,
		StreamerForm,
		OBSPanelInfo,
	},
})
export default class Home extends Vue {

	public loading:boolean = true;
	public showOBSPanel:boolean = false;
	public showProfileForm:boolean = false;
	public missingTwitchKeys:boolean = false;
	public missingTwitchUsers:boolean = false;

	public userNameToInfos:TwitchTypes.UserInfo[] = [];
	public onlineUsers:{userName:string, user?:TwitchTypes.UserInfo, stream?:TwitchTypes.StreamInfo}[] = [];
	public offlineUsers:{userName:string, user?:TwitchTypes.UserInfo, stream?:TwitchTypes.StreamInfo}[] = [];
	
	private mouseMoveHandler:any;
	private refreshTimeout:number;

	public get classes():string[] {
		let res = ["home"];
		if(this.lightMode) res.push("light");
		return res;
	}

	public get lightMode():boolean {
		return Utils.getRouteMetaValue(this.$route, "lightMode") === true;
	}

	public get connected():boolean {
		return this.$store.state.OAuthToken;
	}

	public get title():string {
		let res = "";
		if(Config.profile) res = Config.profile;
		return res;
	}

	public get userFile():string {
		let res = "userList";
		if(Config.profile) res += "_"+Config.profile;
		return res;
	}

	public get logoPath():string {
		if(Config.profile) {
			return require("@/assets/logos/"+Config.profile+".png");
		}else{
			return require("@/assets/logos/protopotes.png");
		}
		// @/assets/logos/pogscience.png
	}

	public get isAStreamer():boolean {
		let authLogin = IRCClient.instance.authenticatedUserLogin;

		return this.onlineUsers.findIndex(v => v.userName == authLogin) > -1
		|| this.offlineUsers.findIndex(v => v.userName == authLogin) > -1;
	}

	public async mounted():Promise<void> {
		this.loadData(true);
		this.mouseMoveHandler = (e:MouseEvent) => this.onMouseMove(e);
		document.body.addEventListener("mousemove", this.mouseMoveHandler);
	}

	public beforeDestroy(): void {
		clearTimeout(this.refreshTimeout);
		document.body.removeEventListener("mousemove", this.mouseMoveHandler);
	}

	public randomRaid():void {
		let user;
		do {
			user = Utils.pickRand(this.onlineUsers);
		}while(user.userName.toLowerCase() == this.$store.state.userLogin.toLowerCase());
		Utils.confirm("Lancer un raid", "Veux-tu vraiment lancer un raid vers la chaîne de "+user.userName+" ?")
		.then(_=> {
			IRCClient.instance.sendMessage("/raid "+user.userName);
		}).catch(error=>{});
	}

	public beforeEnter(el:HTMLElement):void {
		gsap.set(el, {opacity:0, y:-50});
	}

	public enter(el:HTMLDivElement):void {
		let delay = parseInt(el.dataset.index) * .15;
		gsap.to(el, {duration:.5, opacity:1, y:0, delay});
	}

	public leave(el:HTMLElement):void {

	}

	/**
	 * Called on mouse move event.
	 */
	private onMouseMove(e:MouseEvent):void {
		this.sheduleReload();
	}

	/**
	 * Loads all the data from server
	 */
	private async loadData(isFirstLoad:boolean = false):Promise<void> {
		if(isFirstLoad)  {
			//Avoid showing the loader when doing background reload
			this.loading = true;
		}
		
		//Load user name list from server
		let channelList = await Api.get("user_names");
		if(!(channelList instanceof Array) || channelList.length == 0) {
			this.loading = false;
			this.missingTwitchUsers = true;
			return;
		}
		
		let channelListBackup = channelList.concat();
		let maxBatch = 100;//Twitch API cannot get more than 100 users at once
		let onlineUsers = [];
		let offlineUsers = [];
		do{
			let channels = channelList.splice(0, maxBatch);
			try {
				
				//Get users infos
				let result;
				try {
					result = await Api.get("user_infos", {channels});
				}catch(error) {
					if(error.error_code == "INVALID_TWITCH_KEYS") {
						//Show configuration tips
						this.missingTwitchKeys = true;
						this.loading = false;
						return;
					}
				}
				if(result.data?.length > 0) {
					for (let i = 0; i < result.data.length; i++) {
						const infos:TwitchTypes.UserInfo = result.data[i];
						this.userNameToInfos[infos.login.toLowerCase()] = infos;
					}
				}

				//Get channels states
				result = await Api.get("stream_infos", {channels});
				if(result.data?.length > 0) {
					for (let i = 0; i < result.data.length; i++) {
						const infos:TwitchTypes.StreamInfo = result.data[i];
						onlineUsers.push({
							userName:infos.user_login,
							stream:infos,
							user: this.userNameToInfos[infos.user_login.toLowerCase()]
						});
					}
				}
			}catch(error) {

			}
		}while(channelList.length > 0);

		onlineUsers.sort((a, b) => {
			if(a.stream.viewer_count > b.stream.viewer_count) return 1;
			if(a.stream.viewer_count < b.stream.viewer_count) return -1;
			return 0;
		})
		
		for (let i = 0; i < channelListBackup.length; i++) {
			if(onlineUsers.findIndex((v)=>{ return v.userName == channelListBackup[i]; }) == -1) {
				let login = channelListBackup[i];
				offlineUsers.push({userName:login, user:this.userNameToInfos[login.toLowerCase()]});
			}
		}

		offlineUsers.sort((a, b) => {
			if(a.userName.toLowerCase() > b.userName.toLowerCase()) return 1;
			if(a.userName.toLowerCase() < b.userName.toLowerCase()) return -1;
			return 0;
		})

		this.loading = false;
		await this.$nextTick();
		this.onlineUsers = onlineUsers;
		this.offlineUsers = offlineUsers;
		
		this.sheduleReload();
	}

	/**
	 * Schedule a data reload in 10min
	 * Clears the previous schedule.
	 */
	private sheduleReload():void {
		clearTimeout(this.refreshTimeout);
		this.refreshTimeout = setTimeout(_=> {
			this.loadData();
		}, 2 * 60 * 1000);
	}

	public logout():void {
		Utils.confirm("Deconnexion", "Souhaites-tu te déconnecter ?").then(()=>{
			this.$store.dispatch("logout");
		}).catch(()=>{});
	}

	public getOBSPanel():void {
		this.showOBSPanel = true;
	}

}
</script>

<style scoped lang="less">
.home {

	&.light {
		width: 100%;
		max-width: 350px;
		margin: auto;
		// border: 1px dashed rgba(255, 255, 255, .2);
		button {
			padding: 5px 10px;
			font-size: 16px;
			/deep/ .icon {
				height:15px;
				margin-right: 5px;
			}
		}
	
		.page {
			.menu {
				.logout {
					position: absolute;
					top: 0;
					right: 0;
					border-radius: 0;
					border-bottom-left-radius: 15px;
					width: 30px;
					height: 30px;
					/deep/ .icon {
						margin-right: 0;
					}
				}
			}

			.block {
				padding-top: 0px;
				.list {
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					padding: 20px 5px;
				}
			}
		}
	}

	.loader {
		.center();
		position: absolute;
		img {
			width: 100px;
			height: 100px;
		}
		.label {
			color: @mainColor_light;
			font-family: "Nunito light";
			font-size: 16px;
			margin-top: 15px;
		}
	}

	.confError {
		.center();
		position: absolute;
		font-family: "Inter";
		font-size: 20px;
		color: @mainColor_warn;
		max-width: 500px;
		padding: 25px 40px;
		background-color: @mainColor_dark_light;
		box-shadow: rgba(0, 0, 0, 0.5) 0px 6px 16px 0px, rgba(0, 0, 0, 0.4) 0px 0px 4px 0px;
		box-sizing: border-box;
		border-radius: 10px;
	}

	.page {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		flex-grow: 1;
	
		h1 {
			font-family: "Nunito Black";
			font-size: 50px;
			color: @mainColor_normal;
			margin-bottom: 20px;
			text-shadow: #ffffff55 0px 0px 5px;
			text-transform: capitalize;
		}
	
		.menu {
			margin-top: 20px;
			box-sizing: border-box;
			.button {
				margin-bottom: 5px;
				&:not(:last-child) {
					margin-right: 5px;
				}
			}
		}
	
		.block {
			width: 100%;
			padding-top: 100px;
	
			.noResult {
				color: @mainColor_normal;
				text-shadow: #ffffff55 0px 0px 5px;
				font-style: italic;
				display: flex;
				flex-direction: column;
				.icon {
					max-height: 150px;
				}
			}
	
			.title {
				display: flex;
				flex-direction: row;
				align-items: center;
				padding-bottom: 20px;
	
				.line {
					flex-grow: 1;
					background-color: @mainColor_normal;
					height: 1px;
				}
	
				h2 {
					font-family: "Nunito Black";
					font-size: 30px;
					color: @mainColor_normal;
					margin: 0 15px;
					text-shadow: #ffffff55 0px 0px 5px;
				}
			}
	
			.list {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				padding: 20px 5vw;
				margin: auto;
				justify-content: space-around;
				align-items: flex-start;
				.stream {
					margin: 10px;
					// margin: auto;
					margin-bottom: 20px;
				}
			}
	
			&.offline {
				flex-grow: 1;
				width: 100%;
				height: 100%;
				display: flex;
				flex-direction: column;
				.title {
					background: linear-gradient(0deg, rgba(0,0,0,0.5) 20%, rgba(0,0,0,0) 100%);
				}
				.list {
					box-sizing: border-box;
					width: 100%;
					flex-grow: 1;
					background-color: rgba(0,0,0,0.5);
				}
			}
		}
	}


	.fade-enter-active, .fade-leave-active {
		transition: opacity .5s;
	}
	.fade-enter, .fade-leave-to {
		opacity: 0;
	}
}

@media only screen and (max-width: 500px) {
	.home{
		.page {
			.menu {
				margin-top: 0;
			}
			.block {
				padding-top: 25px;
				.title {
					padding-bottom: 0;
				}
			}
		}
	}
}
</style>