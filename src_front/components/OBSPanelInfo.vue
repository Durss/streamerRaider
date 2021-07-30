<template>
	<div class="obspanelinfo">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Panneau OBS</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="close()" class="close"/>
			</div>
			<div class="content">
				<p class="intro">Vous pouvez intégrer cette page à OBS avec un design minimaliste dédié.</p>
				<p class="spacer">Pour cela rendez-vous ici dans OBS :</p>
				<p class="path"><strong>View</strong> -> <strong>Docks</strong> -> <strong>Custom Browser Dock</strong></p>
				<p>Ajoutez une nouvelle ligne avec l'URL suivante :</p>
				<p class="path"><strong>{{obsPanelURL}}</strong></p>
				<p>Vous pouvez maintenant ajouter ce panneau où vous le souhaitez dans l'interface d'OBS.</p>
				<p class="spacer">Dans ce panneau vous aurez en plus la possibilité d'activer un bot pour effectuer des shoutouts personnalisés avec les descriptions de chaque personne.</p>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import gsap from "gsap/all";
import { Component, Vue } from "vue-property-decorator";
import Button from "./Button.vue";

@Component({
	components:{
		Button,
	}
})
export default class OBSPanelInfo extends Vue {

	private keyUpHandler:any;

	public get obsPanelURL():string {
		let route = this.$router.resolve({name: "obs"}).href;
		return document.location.origin + route;
	}

	public mounted():void {
		console.log("ok");
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.set(this.$refs.holder, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder, {duration:.25, marginTop:100, opacity:0, ease:"back.out"});

		this.keyUpHandler = (e:KeyboardEvent) => { if(e.key == "Escape") this.close(); }

		document.addEventListener("keyup", this.keyUpHandler);
	}

	public beforeDestroy():void {
		document.removeEventListener("keyup", this.keyUpHandler);
	}

	public close():void {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder, {duration:.25, marginTop:100, opacity:0, ease:"back.out", onComplete:()=> {
			this.$emit("close");
		}});
	}

}
</script>

<style scoped lang="less">
.obspanelinfo{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 1;

	.dimmer {
		backdrop-filter: blur(5px);
		background-color: rgba(0,0,0,.7);
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
	}

	.holder {
		.center();
		.block();
		position: absolute;
		margin: auto;
		.head {
			text-transform: capitalize;
			display: flex;
			.title {
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

		.content {
			// padding-bottom: 20px;
			position: relative;
			.spacer {
				margin-top: 10px;
			}
			.path {
				margin: 10px 0;
			}
			strong {
				color: @mainColor_warn;
			}
		}
	}
}
</style>