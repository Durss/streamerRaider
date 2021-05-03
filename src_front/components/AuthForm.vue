<template>
	<div class="authform">
		<Button v-if="!showForm" :icon="require('@/assets/icons/twitch.svg')" @click="showForm=true" title="Connexion" white class="login"/>

		<transition name="scale">
			<div v-if="!success && showForm" class="content">
				<div class="title">
					<span class="text">Connexion</span>
					<Button :icon="require('@/assets/icons/cross_white.svg')" @click="showForm=false" class="close"/>
				</div>
				<div>En vous connectant vous pourrez Raid une chaîne aléatoirement ou en cliquant sur le bouton dédié.</div>
				<div>Rendez-vous <a href="https://twitchapps.com/tmi/" target="_blank">sur cette page</a> pour générer un token puis collez-le dans le champs ci-dessous :</div>
				<div class="form">
					<input type="text" v-model="token" @keyup.enter="saveToken()">
					<Button :icon="require('@/assets/icons/checkmark_white.svg')" :loading="loading" @click="saveToken()"/>
				</div>
				<div class="error" v-if="error" @click="error=false">invalid token</div>
			</div>
		</transition>

		<!-- <div class="success" v-if="success">Token validated <img src="@/assets/icons/checkmark.svg" class="check"></div> -->
	</div>
</template>

<script lang="ts">
import Button from "@/components/Button.vue";
import TwitchUtils from "@/utils/TwitchUtils";
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

	public async mounted():Promise<void> {
	}

	public beforeDestroy():void {
		
	}

	public async saveToken():Promise<void> {
		this.error = false;
		this.loading = true;
		if(this.token && this.token.indexOf("oauth:")==0) {
			this.token = this.token.replace("oauth:", "");
		}
		console.log(this.token);
		let valid = await TwitchUtils.validateToken(this.token);
		if(!valid) {
			this.error = true;
		}else{
			this.success = true;
			this.$store.dispatch("setOAuthToken", this.token);
		}
		this.loading = false;
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
		.form {
			display: flex;
			flex-direction: row;
			width: 70%;
			height: 30px;
			margin-left: auto;
			margin-right: auto;
			input {
				text-align: center;
				flex-grow: 1;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			button {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
				height: 100%;
			}
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