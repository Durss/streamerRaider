<template>
	<div class="authform">
		<Button v-if="!showForm" :icon="require('@/assets/icons/twitch.svg')" @click="showForm=true" title="Connexion" white class="login"/>

		<transition name="scale">
			<div v-if="!success && showForm" class="content">
				<div class="title">
					<span class="text">Connexion</span>
					<Button :href="oAuthURL" :icon="require('@/assets/icons/cross_white.svg')" @click="showForm=false" class="close"/>
				</div>
				<div>En vous connectant vous pourrez Raid une chaîne aléatoirement ou en cliquant sur le bouton dédié.</div>
				<Button :href="oAuthURL" type="link" target="_self" :icon="require('@/assets/icons/twitch.svg')" title="Me connecter" />
				<div class="error" v-if="error" @click="error=false">invalid token</div>
			</div>
		</transition>

		<!-- <div class="success" v-if="success">Token validated <img src="@/assets/icons/checkmark.svg" class="check"></div> -->
	</div>
</template>

<script lang="ts">
import Button from "@/components/Button.vue";
import Config from "@/utils/Config";
import { Component, Vue } from "vue-property-decorator";

@Component({
	components:{
		Button,
	}
})
export default class AuthForm extends Vue {

	public token:string = null;
	public error:boolean = false;
	public success:boolean = false;
	public loading:boolean = false;
	public showForm:boolean = false;

	public get oAuthURL():string {
		let path = this.$router.resolve({name:"oauth"}).href;
		let redirect = encodeURIComponent( document.location.origin+path );
		let scopes = encodeURIComponent( Config.TWITCH_SCOPES.join(" ") );
		let clientID = this.$store.state.clientID;

		let url = "https://id.twitch.tv/oauth2/authorize?";
		url += "client_id="+clientID
		url += "&redirect_uri="+redirect;
		url += "&response_type=token";
		url += "&scope="+scopes;
		return url;
	}

	public async mounted():Promise<void> {
		console.log(this.oAuthURL);
	}

	public beforeDestroy():void {
		
	}

	// @Watch("showForm")
	// public onFormChange():void {
	// 	gsap.set(this.$el, {scale:1, maxHeight:"250px"});
	// 	gsap.from(this.$el, {duration:.5, maxHeight:"35px", scale:1});
	// }

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
	.scale-enter, .scale-leave-to {
		max-height: 0px;
	}

}
</style>