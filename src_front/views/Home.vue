<template>
	<div :class="classes">
		<transition name="fade">
			<MainLoader v-if="loading" />
		</transition>

		<div class="confError" v-if="missingTwitchKeys">Please fill in the <strong>client_id</strong> and <strong>secret_id</strong> values inside the file <strong>data/credentials.json</strong> created at the root of the project!</div>
		
		<div class="confError" v-if="missingTwitchUsers">Please add users to the file <strong>data/{{userFile}}.json</strong> at the root of the project</div>
		
		<div class="confError" v-if="loadError">Oops... something went wrong while loading data from server...</div>

		<div v-if="!loading && !missingTwitchKeys && !missingTwitchUsers && !loadError" class="page">
			<div v-if="!lightMode">
				<img :src="logoPath" height="100">
				<h1>{{title}} Raider</h1>
			</div>

			<AuthForm class="menu"
				v-if="!connected"
				:lightMode="lightMode" />
			
			<!-- MAIN MENU -->
			<div v-if="connected" class="menu">
				<Button title="Lancer un raid aléatoire" v-if="onlineUsers.length > 0" white
					@click="randomRaid()"
					:icon="require('@/assets/icons/random.svg')" />

				<Button v-if="isAStreamer && !lightMode" title="Ma description" white
					@click="showProfileForm=true"
					:icon="require('@/assets/icons/edit.svg')" />

				<Button title="OBS Panel" white
					v-if="!lightMode"
					@click="getOBSPanel()"
					:icon="require('@/assets/icons/obs.svg')" />

				<Button :title="botEnabled? 'Bot actif' : 'Bot inactif'"
					:white="!botEnabled"
					v-if="lightMode"
					@click="getBotConfigPanel()"
					:icon="require('@/assets/icons/twitch.svg')" />

				<Button :title="lightMode? '' : 'Logout'" highlight class="logout"
					@click="logout()"
					:icon="require('@/assets/icons/cross_white.svg')" />
			</div>
			
			<!-- OBS PANEL INFO -->
			<OBSPanelInfo v-if="showOBSPanel" @close="showOBSPanel=false" />
			
			<!-- TWITCH BOT CONFIG PANEL -->
			<BotConfigPanel v-if="showBotConfigPanel" @close="showBotConfigPanel=false" />

			<!-- USER FORM (edit description) -->
			<StreamerForm v-if="showProfileForm" @close="showProfileForm=false" />
			
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
						:key="u.id"
						:userName="u.display_name"
						:streamInfos="u.streamInfos"
						:userInfos="u"
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
						:key="u.id"
						:userName="u.display_name"
						:userInfos="u"
						small />
				</transition-group>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import AuthForm from "@/components/AuthForm.vue";
import BotConfigPanel from "@/components/BotConfigPanel.vue";
import Button from "@/components/Button.vue";
import MainLoader from "@/components/MainLoader.vue";
import OBSPanelInfo from "@/components/OBSPanelInfo.vue";
import StreamerForm from "@/components/StreamerForm.vue";
import StreamInfo from "@/components/StreamInfo.vue";
import Api from "@/utils/Api";
import IRCClient from "@/utils/IRCClient";
import { TwitchTypes } from "@/utils/TwitchUtils";
import Utils from "@/utils/Utils";
import gsap from "gsap/all";
import { Component, Vue } from "vue-property-decorator";

@Component({
	components: {
		Button,
		AuthForm,
		StreamInfo,
		MainLoader,
		StreamerForm,
		OBSPanelInfo,
		BotConfigPanel,
	},
})
export default class Home extends Vue {

	public loading:boolean = true;
	public loadError:boolean = false;
	public showOBSPanel:boolean = false;
	public showBotConfigPanel:boolean = false;
	public showProfileForm:boolean = false;
	public missingTwitchKeys:boolean = false;
	public missingTwitchUsers:boolean = false;

	public onlineUsers:TwitchTypes.UserInfo[] = [];
	public offlineUsers:TwitchTypes.UserInfo[] = [];
	
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

	public get botEnabled():boolean {
		return this.$store.state.botEnabled;
	}

	public get connected():boolean {
		return this.$store.state.OAuthToken;
	}

	public get title():string {
		let res = "";
		if(this.$store.state.profileName) res = this.$store.state.profileName;
		return res;
	}

	public get userFile():string {
		let res = "userList";
		if(this.$store.state.profileName) res += "_"+this.$store.state.profileName;
		return res;
	}

	public get logoPath():string {
		if(this.$store.state.profileName) {
			return require("@/assets/logos/"+this.$store.state.profileName+".png");
		}else{
			return require("@/assets/logos/protopotes.png");
		}
		// @/assets/logos/pogscience.png
	}

	public get isAStreamer():boolean {
		let authLogin = IRCClient.instance.authenticatedUserLogin?.toLowerCase();

		return this.onlineUsers.findIndex(v => v.display_name.toLowerCase() == authLogin) > -1
		|| this.offlineUsers.findIndex(v => v.display_name.toLowerCase() == authLogin) > -1;
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
			//Avoids showing the loader when doing background reload
			this.loading = true;
		}
		
		let onlineUsers:TwitchTypes.UserInfo[] = [];
		let offlineUsers:TwitchTypes.UserInfo[] = [];
		this.loadError = false;
		try {
			//Get channels list and states
			let result = await Api.get("private/stream_infos");
			if(result?.length > 0) {
				for (let i = 0; i < result.length; i++) {
					const user:TwitchTypes.UserInfo = result[i];
					if(user.streamInfos) {
						onlineUsers.push(user);
					}else{
						offlineUsers.push(user);
					}
				}
			}else{
				this.missingTwitchUsers = true;
			}
		}catch(error) {
			this.loadError = true;
			this.loading = false;
			console.log(error);
			return;
		}

		onlineUsers.sort((a, b) => {
			if(a.streamInfos?.viewer_count > b.streamInfos?.viewer_count) return 1;
			if(a.streamInfos?.viewer_count < b.streamInfos?.viewer_count) return -1;
			return 0;
		})

		offlineUsers.sort((a, b) => {
			if(a.login.toLowerCase() > b.login.toLowerCase()) return 1;
			if(a.login.toLowerCase() < b.login.toLowerCase()) return -1;
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
		}, 2 * 120 * 1000);
	}

	public logout():void {
		Utils.confirm("Deconnexion", "Souhaites-tu te déconnecter ?").then(()=>{
			this.$store.dispatch("logout");
		}).catch(()=>{});
	}

	public getOBSPanel():void {
		this.showOBSPanel = true;
	}

	public getBotConfigPanel():void {
		this.showBotConfigPanel = !this.showBotConfigPanel;
	}

}
</script>

<style scoped lang="less">
.home {

	&.light {
		width: 100%;
		max-width: 350px;
		min-width: 200px;
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
					padding: 20px 0;
				}
			}
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