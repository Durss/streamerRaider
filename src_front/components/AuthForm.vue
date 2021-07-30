<template>
	<div class="authform">
		<Button v-if="!showForm" :icon="require('@/assets/icons/twitch.svg')" @click="showForm=true" title="Connexion" white class="login"/>

		<transition name="scale">
			<div v-if="showForm" class="content">
				<div class="title">
					<span class="text">Connexion</span>
					<Button :icon="require('@/assets/icons/cross_white.svg')" @click="showForm=false" class="close"/>
				</div>
				<div>En te connectant tu pourras lancer un raid en un click et éditer ta description.</div>
				<Button :href="oAuthURL"
					type="link"
					target="_self"
					:icon="require('@/assets/icons/twitch.svg')"
					title="Me connecter" />
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import Button from "@/components/Button.vue";
import Config from "@/utils/Config";
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
	components:{
		Button,
	}
})
export default class AuthForm extends Vue {
	@Prop()
	public lightMode:boolean;

	public token:string = null;
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
		url += "&state="+this.$route.name;//Used to redirect to the route we came from
		return url;
	}

	public async mounted():Promise<void> {
		
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

@media only screen and (max-width: 500px) {
	.authform{
		.content {
			width: 90%;
		}
	}
}
</style>