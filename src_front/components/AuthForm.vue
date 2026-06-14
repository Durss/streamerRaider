<template>
	<div class="authform">
		<Button v-if="showButton"
			:icon="twitchIcon"
			@click="showForm=true; showButton=false" title="Connexion" white
			class="login"/>

		<transition name="scale"
		@after-leave="onClose">
			<div v-if="showForm" class="content">
				<div class="title">
					<span class="text">Connexion</span>
					<Button :icon="crossWhiteIcon" @click="showForm=false" class="close"/>
				</div>
				<div v-if="lightMode">En te connectant tu pourras lancer un raid en un click et activer un bot pour faire des shoutouts personnalisés.</div>
				<div v-if="!lightMode">En te connectant tu pourras lancer un raid en un click et éditer ta description.</div>
				<Button :href="oAuthURL"
					class="auth"
					type="link"
					target="_self"
					:icon="twitchIcon"
					title="Me connecter" />
			</div>
		</transition>
	</div>
</template>

<script setup lang="ts">
import Config from "@/utils/Config";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMainStore } from "@/store";
import Button from "@/components/Button.vue";
import twitchIcon from "@/assets/icons/twitch.svg";
import crossWhiteIcon from "@/assets/icons/cross_white.svg";

defineProps<{
	lightMode?:boolean;
}>();

const store = useMainStore();
const router = useRouter();
const route = useRoute();

const showForm = ref(false);
const showButton = ref(true);

const oAuthURL = computed(():string => {
	let path = router.resolve({name:"oauth"}).href;
	let redirect = encodeURIComponent( document.location.origin+path );
	let scopes = encodeURIComponent( Config.TWITCH_SCOPES.join(" ") );
	let clientID = store.clientID;

	let url = "https://id.twitch.tv/oauth2/authorize?";
	url += "client_id="+clientID
	url += "&redirect_uri="+redirect;
	url += "&response_type=token";
	url += "&scope="+scopes;
	url += "&state="+String(route.name);//Used to redirect to the route we came from
	return url;
});

function onClose():void {
	showButton.value = true;
}
</script>

<style scoped lang="less">
.authform{
	color: @mainColor_light;

	.content {
		background-color: @mainColor_dark_light;
		box-shadow: rgba(0, 0, 0, 0.5) 0px 6px 16px 0px, rgba(0, 0, 0, 0.4) 0px 0px 4px 0px;
		border-radius: 10px;
		overflow: hidden;
		margin: auto;
		width: 500px;
		font-family: "Inter";
		font-size: 18px;
		transition: all .5s;

		.title {
			padding: 10px;
			background-color: @mainColor_dark_extralight;
			font-family: "Nunito";
			font-size: 30px;
			text-transform: capitalize;
			color: @mainColor_normal;
			display: flex;
			.text {
				flex-grow: 1;
			}
			.close {
				width: 30px;
				height: 30px;
				max-width: 30px;
				max-height: 30px;
				padding: 5px;
				border-radius: 10px;
			}
		}

		&>* {
			margin-bottom: 10px;
		}
	}

	.error {
		color: @mainColor_alert;
		font-size: 14px;
	}

	.success {
		font-size: 40px;
		text-align: center;
		.check {
			display: block;
			margin: auto;
			height: 60px;
			margin-bottom: -7px;
		}
	}

	.scale-enter-active, .scale-leave-active {
		max-height: 235px;
	}
	.scale-enter-from, .scale-leave-to {
		max-height: 0px;
	}

}

@media only screen and (max-width: 500px) {
	.authform{
		.login {
			font-size: 15px;
			padding: 5px 20px;
		}
		.content {
			width: 90%;
			font-size: 15px;
			.title {
				font-size: 20px;
				padding: 5px;
				.close {
					width: 20px;
					height: 20px;
					border-radius: 5px;
				}
			}

			.auth {
				font-size: 15px;
				padding: 5px 20px;
			}
		}

	}
}
</style>