<template>
	<div class="home">
		<transition name="fade">
			<div class="loader" v-if="loading">
				<img src="@/assets/loader/loader.svg">
				<div class="label">...chargement des chaînes...</div>
			</div>
		</transition>

		<div class="confError" v-if="missingTwitchKeys">Please fill in the <strong>client_id</strong> and <strong>secret_id</strong> values inside the file <strong>twitch_keys.json</strong> created at the root of the project!</div>
		
		<div class="confError" v-if="missingTwitchUsers">Please add users to the file <strong>protobuddiesList.json</strong> at the root of the project</div>

		<div v-if="!loading && !missingTwitchKeys && !missingTwitchUsers">
			<AuthForm v-if="!connected" />
			<Button title="Lancer un raid aléatoire" v-if="connected && onlineUsers.length > 0" white
				@click="randomRaid()"
				:icon="require('@/assets/icons/random.svg')" />
			
			<div class="block">
				<h2>PROTOPOTES EN LIGNE ({{onlineUsers.length}})</h2>
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
						:userInfos="u.user" />
				</transition-group>
				<div class="noResult" v-if="onlineUsers.length == 0">
					<img src="@/assets/icons/sadFace.svg" class="icon">
					<span>Personne n'est en ligne</span>
				</div>
			</div>
			<div class="block">
				<h2>PROTOPOTES HORS LIGNE ({{offlineUsers.length}})</h2>
					
				<transition-group class="list small" name="appear" tag="div"
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
	},
})
export default class Home extends Vue {

	public loading:boolean = true;
	public missingTwitchKeys:boolean = false;
	public missingTwitchUsers:boolean = false;

	public userNameToInfos:TwitchTypes.UserInfo[] = [];
	public onlineUsers:{userName:string, user?:TwitchTypes.UserInfo, stream?:TwitchTypes.StreamInfo}[] = [];
	public offlineUsers:{userName:string, user?:TwitchTypes.UserInfo, stream?:TwitchTypes.StreamInfo}[] = [];
	
	private mouseMoveHandler:any;
	private refreshTimeout:number;

	public get connected():boolean {
		return this.$store.state.OAuthToken;
	}

	public async mounted():Promise<void> {
		this.loadData();
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
	private async loadData():Promise<void> {
		
		//Load user name list from server
		let channelList = await Api.get("user_names");
		if(!(channelList instanceof Array) || channelList.length == 0) {
			this.missingTwitchUsers = true;
			return;
		}
		
		let channelListBackup = channelList.concat();
		let maxBatch = 100;//Twitch API cannot get more than 100 users at once
		this.loading = true;
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
						this.missingTwitchKeys = true;
						this.loading = false;
						return;
					}
				}
				if(result.data?.length > 0) {
					for (let i = 0; i < result.data.length; i++) {
						const infos:TwitchTypes.UserInfo = result.data[i];
						this.userNameToInfos[infos.login.toLowerCase()] = infos;
						console.log(infos);
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
		}, 10 * 60 * 1000);
	}

}
</script>

<style scoped lang="less">
.home {
	padding-top: 50px;

	.loader {
		.center();
		position: absolute;
		img {
			width: 100px;
			height: 100px;
		}
		.label {
			color: @mainColor_light;
			font-family: "Nunito Light";
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

	.block {
		margin-top: 50px;
		&:last-child {
			margin-top: 100px;
		}

		.noResult {
			color: @mainColor_normal;
			text-shadow: #ffffff55 0px 0px 5px;
			font-style: italic;
			.icon {
				max-height: 150px;
			}
		}

		h2 {
			font-family: "Nunito Black";
			font-size: 40px;
			color: @mainColor_normal;
			margin-bottom: 20px;
			text-shadow: #ffffff55 0px 0px 5px;
		}

		.list {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			max-width: 90vw;
			margin: auto;
			justify-content: space-around;
			.stream {
				margin: 10px;
				// margin: auto;
				margin-bottom: 20px;
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
</style>