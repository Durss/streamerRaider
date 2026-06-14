<template>
	<div :class="classes">
		<transition name="fade">
			<MainLoader v-if="loading" />
		</transition>

		<div class="confError" v-if="missingTwitchKeys">Please fill in the <strong>client_id</strong> and
			<strong>secret_id</strong> values inside the file <strong>data/credentials.json</strong> created at the root
			of the project!</div>

		<div class="confError" v-if="invalidTwitchKeys">The configured Twitch credentials are invalid!</div>

		<div class="confError" v-if="missingTwitchUsers">Please add users to the file
			<strong>data/{{ userFile }}.json</strong> at the root of the project</div>

		<div class="confError" v-if="loadError">
			Woops... there was an error loading data... there may have been a server update, please try reloading the
			page !
			<Button title="Reload" highlight :icon="reloadIcon" class="reloadBt" :loading="reloading"
				@click="reloadPage()" />
		</div>

		<div v-if="!loading && !missingTwitchKeys && !invalidTwitchKeys && !missingTwitchUsers && !loadError"
			class="page">
			<div v-if="!lightMode">
				<img :src="logoPath" height="100" @error="onLogoError()">
				<h1>{{ title }}</h1>
			</div>

			<AuthForm class="menu" v-if="!connected" :lightMode="lightMode" />

			<!-- MAIN MENU -->
			<div v-if="connected" class="menu">
				<Button title="Lancer un raid aléatoire" v-if="onlineUsers.length > 0" white @click="randomRaid()"
					:icon="randomIcon" />

				<Button v-if="isAStreamer && !lightMode" title="Ma description" white @click="showProfileForm = true"
					:icon="editIcon" />

				<Button title="OBS Panel" white v-if="!lightMode" @click="getOBSPanel()" :icon="obsIcon" />

				<Button title="Outils" white v-if="lightMode" @click="openConfigPanel()" :icon="paramsIcon" />

				<Button v-if="!showConfigPanel" :title="lightMode ? '' : 'Logout'" highlight class="logout"
					@click="logout()" :icon="crossWhiteIcon" />
			</div>

			<!-- OBS PANEL INFO -->
			<OBSPanelInfo v-if="showOBSPanel" @close="showOBSPanel = false" />

			<!-- TWITCH BOT CONFIG PANEL -->
			<ObsConfigPanel v-if="showConfigPanel" @close="showConfigPanel = false" />

			<!-- USER FORM (edit description) -->
			<StreamerForm v-if="showProfileForm" @close="showProfileForm = false" />

			<!-- ONLINE USERS -->
			<div class="block online">
				<div class="title" v-if="!lightMode">
					<span class="line"></span>
					<h2>STREAMERS EN LIGNE ({{ onlineUsers.length }})</h2>
					<span class="line"></span>
				</div>
				<transition-group class="list" name="appear" tag="div" :css="false" @before-enter="beforeEnter"
					@enter="enter" @leave="leave">
					<StreamInfo class="stream" v-for="(u, index) in onlineUsers" :data-index="index" :key="u.id"
						:userName="u.display_name" :userInfos="u" :lightMode="lightMode" />
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
					<h2>STREAMERS HORS LIGNE ({{ offlineUsers.length }})</h2>
					<span class="line"></span>
				</div>

				<transition-group class="list" name="appear" tag="div" :css="false" @before-enter="beforeEnter"
					@enter="enter" @leave="leave">
					<StreamInfo class="stream" v-for="(u, index) in offlineUsers" :data-index="index * .25" :key="u.id"
						:userName="u.display_name" :userInfos="u" small />
				</transition-group>

				<div v-if="inactiveUsers.length > 0" class="inactive">
					<button class="showInactiveBt" @click="displayInactiveUsers()" v-if="!showInactive">
						<span v-if="inactiveUsers.length == 1">- {{ inactiveUsers.length }} personne inactive -</span>
						<span v-if="inactiveUsers.length > 1">- {{ inactiveUsers.length }} personnes inactives -</span>
					</button>
					<div class="title" v-if="showInactive">
						<span class="line"></span>
						<h2>Personnes inactives ({{ inactiveDays }} jours)</h2>
						<span class="line"></span>
					</div>
					<div v-if="showInactive" class="list">
						<StreamInfo class="stream" v-for="(u, index) in inactiveUsers" :data-index="index * .25"
							:key="u.id" :userName="u.display_name" :userInfos="u" small />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import AuthForm from "@/components/AuthForm.vue";
import ObsConfigPanel from "@/components/ObsConfigPanel.vue";
import Button from "@/components/Button.vue";
import MainLoader from "@/components/MainLoader.vue";
import OBSPanelInfo from "@/components/OBSPanelInfo.vue";
import StreamerForm from "@/components/StreamerForm.vue";
import StreamInfo from "@/components/StreamInfo.vue";
import Api, { ApiError } from "@/utils/Api";
import IRCClient from "@/utils/IRCClient";
import type { TwitchTypes } from "@/utils/TwitchUtils";
import Utils from "@/utils/Utils";
import Config from "@/utils/Config";
import gsap from "gsap";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useMainStore } from "@/store";
import type { ProfileData } from "./ProfileSwitcher.vue";
import reloadIcon from "@/assets/icons/reload.svg";
import randomIcon from "@/assets/icons/random.svg";
import editIcon from "@/assets/icons/edit.svg";
import obsIcon from "@/assets/icons/obs.svg";
import paramsIcon from "@/assets/icons/params.svg";
import crossWhiteIcon from "@/assets/icons/cross_white.svg";

const store = useMainStore();
const route = useRoute();

const loading = ref(true);
const reloading = ref(false);
const loadError = ref(false);
const showOBSPanel = ref(false);
const showInactive = ref(false);
const showConfigPanel = ref(false);
const showProfileForm = ref(false);
const missingTwitchKeys = ref(false);
const invalidTwitchKeys = ref(false);
const missingTwitchUsers = ref(false);
const forceDefaultLogo = ref(false);

const onlineUsers = ref<TwitchTypes.UserInfo[]>([]);
const offlineUsers = ref<TwitchTypes.UserInfo[]>([]);
const inactiveUsers = ref<TwitchTypes.UserInfo[]>([]);

let refreshTimeout: number;

const classes = computed((): string[] => {
	let res = ["home"];
	if (lightMode.value) res.push("light");
	return res;
});

const inactiveDays = computed((): number => Config.INACTIVITY_DURATION / (1000 * 60 * 60 * 24));

const lightMode = computed((): boolean => Utils.getRouteMetaValue(route, "lightMode") === true);

const connected = computed((): boolean => !!store.OAuthToken);

const profile = computed((): ProfileData => store.profile);

const title = computed((): string => {
	if (profile.value?.title) return profile.value?.title;
	return Config.DEFAULT_PAGE_TITLE;
});

const userFile = computed((): string => {
	let res = "userList";
	if (profile.value.id) res += "_" + profile.value.id;
	return res;
});

const logoPath = computed((): string => {
	if (profile.value.id && !forceDefaultLogo.value) {
		return "/logos/" + profile.value.id + ".png";
	} else {
		return "/logos/default.png";
	}
});

const isAStreamer = computed((): boolean => {
	let authLogin = IRCClient.instance.authenticatedUserLogin?.toLowerCase();

	return onlineUsers.value.findIndex(v => v.display_name.toLowerCase() == authLogin) > -1
		|| offlineUsers.value.findIndex(v => v.display_name.toLowerCase() == authLogin) > -1;
});

onMounted(() => {
	loadData(true);
});

onBeforeUnmount(() => {
	clearTimeout(refreshTimeout);
});

function randomRaid(): void {
	let user: TwitchTypes.UserInfo;
	do {
		user = Utils.pickRand(onlineUsers.value);
	} while (user.display_name.toLowerCase() == store.userLogin.toLowerCase());

	Utils.confirm("Lancer un raid", "Veux-tu vraiment lancer un raid vers la chaîne de " + user.display_name + " ?")
		.then(() => {
			IRCClient.instance.sendMessage("/raid " + user.display_name);
		}).catch(error => { });
}

function beforeEnter(el: Element): void {
	gsap.set(el, { opacity: 0, y: -50 });
}

function enter(el: Element): void {
	let delay = parseInt((<HTMLElement>el).dataset.index) * .15;
	gsap.to(el, { duration: .5, opacity: 1, y: 0, delay });
}

function leave(el: Element): void {

}

/**
 * Called if logo loading failed
 */
function onLogoError(): void {
	console.warn("No logo specified for current profile (" + store.profile.id + ") on folder \"public/logos\". Fallback to default logo. Add a \"" + store.profile.id + ".png\" on \"public\" folder to change it !");
	forceDefaultLogo.value = true;
}


/**
 * Loads all the data from server
 */
async function loadData(isFirstLoad: boolean = false): Promise<void> {
	if (isFirstLoad) {
		//Avoids showing the loader when doing background reload
		loading.value = true;
	}

	let onlineList: TwitchTypes.UserInfo[] = [];
	let offlineList: TwitchTypes.UserInfo[] = [];
	let inactiveList: TwitchTypes.UserInfo[] = [];
	loadError.value = false;
	try {
		//Get channels list and states
		let result = await Api.get("private/stream_infos");
		if (result?.length > 0) {
			for (let i = 0; i < result.length; i++) {
				const user: TwitchTypes.UserInfo = result[i];
				if (user.streamInfos) {
					onlineList.push(user);
				} else {
					if (Date.now() - user.rawData.lastActivity > Config.INACTIVITY_DURATION) {
						inactiveList.push(user);
					} else {
						offlineList.push(user);
					}
				}
			}
		} else {
			missingTwitchUsers.value = true;
		}
	} catch (error) {
		loadError.value = true;
		loading.value = false;
		if (error instanceof ApiError) {
			if (error.error_code === "INVALID_TWITCH_KEYS") {
				invalidTwitchKeys.value = true;
				loadError.value = false;
			} else if (error.error_code === "INVALID_TWITCH_KEYS") {
				missingTwitchKeys.value = true;
				loadError.value = false;
			}
		}
		scheduleReload();
		return;
	}

	const today = new Date();
	if (profile.value.id == "protopotes" && today.getDate() === 1 && today.getMonth() == 3) {
		//April fool
		onlineList.push({
			id: "135468063",
			login: "antoinedaniel",
			display_name: "AntoineDaniel",
			type: "",
			broadcaster_type: "partner",
			description: "Et oui je suis là",
			profile_image_url: "https://static-cdn.jtvnw.net/jtv_user_pictures/7474d9d8-ab27-46c8-95f4-0c71b1878c78-profile_image-70x70.png",
			offline_image_url: "",
			view_count: 6000 + Math.round(Math.random() * 10000),
			created_at: "2012-08-24T20:05:04Z",
			streamInfos: {
				"id": "45113231804",
				"user_id": "135468063",
				"user_login": "antoinedaniel",
				"user_name": "AntoineDaniel",
				"game_id": "1469308723",
				"game_name": "Software and Game Development",
				"type": "live",
				"title": "Je viens d'arriver chez les Protopotes, je leur code un bot avec mes gros talents de codeur !",
				"viewer_count": 6000 + Math.round(Math.random() * 10000),
				"started_at": new Date(Date.now() - 5215000).toISOString(),
				"language": "fr",
				"thumbnail_url": "https://static-cdn.jtvnw.net/cf_vods/dgeft87wbj63p/35747a068688f7e3580b_antoinedaniel_45099654428_1648660897/thumb/thumb0-{width}x{height}.jpg",
				"tag_ids": [
					"6f655045-9989-4ef7-8f85-1edcec42d648"
				]
			},
			rawData: {
				"name": "antoinedaniel",
				"created_at": Date.now(),
				"id": "45113231804",
				"lastActivity": Date.now()
			}
		})
	}

	onlineList.sort((a, b) => {
		if (a.streamInfos?.viewer_count > b.streamInfos?.viewer_count) return 1;
		if (a.streamInfos?.viewer_count < b.streamInfos?.viewer_count) return -1;
		return 0;
	})

	offlineList.sort((a, b) => {
		if (a.login.toLowerCase() > b.login.toLowerCase()) return 1;
		if (a.login.toLowerCase() < b.login.toLowerCase()) return -1;
		return 0;
	})

	inactiveList.sort((a, b) => {
		if (a.login.toLowerCase() > b.login.toLowerCase()) return 1;
		if (a.login.toLowerCase() < b.login.toLowerCase()) return -1;
		return 0;
	})

	loading.value = false;
	onlineUsers.value = onlineList;
	offlineUsers.value = offlineList;
	inactiveUsers.value = inactiveList;

	scheduleReload();
}

/**
 * Schedule a data reload in 2min
 * Clears the previous schedule just in case.
 */
function scheduleReload(): void {
	clearTimeout(refreshTimeout);
	refreshTimeout = setTimeout(() => {
		loadData();
	}, 2 * 60 * 1000);
}

function logout(): void {
	Utils.confirm("Deconnexion", "Souhaites-tu te déconnecter ?").then(() => {
		store.logout();
	}).catch(() => { });
}

function getOBSPanel(): void {
	showOBSPanel.value = true;
}

function openConfigPanel(): void {
	showConfigPanel.value = !showConfigPanel.value;
}

function reloadPage(): void {
	reloading.value = true;
	document.location.reload();
}

async function displayInactiveUsers(): Promise<void> {
	showInactive.value = true;
	await nextTick();
	window.scrollBy(0, 100);
}
</script>

<style scoped lang="less">
.home {
	position: relative;
	width: 100%;
	height: 100%;

	&.light {
		width: 100%;
		max-width: 350px;
		min-width: 200px;
		margin: auto;

		// border: 1px dashed rgba(255, 255, 255, .2);
		button {
			padding: 5px 10px;
			font-size: 16px;

			:deep(.icon) {
				height: 15px;
				margin-right: 5px;
			}
		}

		.page {
			width: 100%;
			height: 100%;

			.menu {
				.logout {
					position: absolute;
					top: 0;
					right: 0;
					border-radius: 0;
					border-bottom-left-radius: 15px;
					width: 30px;
					height: 30px;

					:deep(.icon) {
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

		.reloadBt {
			display: block;
			margin: auto;
			margin-top: 20px;

			:deep(.icon) {
				margin-bottom: 4px;
			}
		}
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
			padding-top: 50px;

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

			&.online {
				flex-grow: 1;
			}

			&.offline {
				width: 100%;
				height: 100%;
				display: flex;
				flex-direction: column;

				&>.title {
					background: linear-gradient(0deg, rgba(0, 0, 0, 0.5) 20%, rgba(0, 0, 0, 0) 100%);
				}

				.list {
					box-sizing: border-box;
					width: 100%;
					flex-grow: 1;
					background-color: rgba(0, 0, 0, 0.5);
				}

				.inactive {
					padding-top: 20px;
					background-color: rgba(0, 0, 0, 0.5);

					.list {
						background-color: transparent;

						.stream {
							filter: saturate(0%);
						}
					}
				}

				.showInactiveBt {
					background-color: @mainColor_dark_light;
					border-radius: 5px;
					padding: 2px 10px;
					cursor: pointer;
					margin-bottom: 10px;
				}
			}
		}
	}


	.fade-enter-active,
	.fade-leave-active {
		transition: opacity .5s;
	}

	.fade-enter-from,
	.fade-leave-to {
		opacity: 0;
	}
}

@media only screen and (max-width: 500px) {
	.home {
		.page {
			h1 {
				font-size: 30px;
			}

			.menu {
				margin-top: 0;
				// .button {
				// font-size: 11px;
				// }
			}

			.block {
				padding-top: 25px;

				.title {
					padding-bottom: 0;

					h2 {
						font-size: 15px;
					}
				}

				.showInactiveBt {
					font-size: 14px;
				}

				.list {
					padding-top: 10px;
				}
			}
		}
	}
}
</style>