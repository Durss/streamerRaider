<template>
	<div class="obspanelinfo">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Panneau OBS</span>
				<Button :icon="crossWhiteIcon" @click="close()" class="close"/>
			</div>
			<div class="content">
				<p class="intro">Vous pouvez intégrer cette page à OBS avec un design minimaliste dédié.</p>
				<p class="spacer">Pour cela rendez-vous ici dans OBS :</p>
				<p class="path"><strong>View</strong> -> <strong>Docks</strong> -> <strong>Custom Browser Dock</strong></p>
				<p>Ajoutez une nouvelle ligne avec l'URL suivante :</p>
				<p class="path" ref="url">
					<strong @click="selectText()" ref="actualURL" v-if="!copiedText">{{obsPanelURL}}</strong>
					<strong v-if="copiedText" class="copied">URL copiée !</strong>
					<Button :icon="copyIcon" class="copy" @click="copyLink()" data-tooltip="Copy" />
				</p>
				<p>Vous pouvez maintenant ajouter ce panneau où vous le souhaitez dans l'interface d'OBS.</p>
				<p class="spacer">Dans ce panneau vous aurez en plus la possibilité d'activer un bot pour effectuer des shoutouts personnalisés avec la description de chaque personne.</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Utils from "@/utils/Utils";
import gsap from "gsap";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "./Button.vue";
import crossWhiteIcon from "@/assets/icons/cross_white.svg";
import copyIcon from "@/assets/icons/copy.svg";

const emit = defineEmits<{ close: [] }>();

const router = useRouter();

const copiedText = ref(false);
const dimmer = ref<HTMLElement>();
const holder = ref<HTMLElement>();
const url = ref<HTMLElement>();
const actualURL = ref<HTMLElement>();

let keyUpHandler:(e:KeyboardEvent)=>void;

const obsPanelURL = computed(():string => {
	let route = router.resolve({name: "obs"}).href;
	return document.location.origin + route;
});

onMounted(() => {
	gsap.killTweensOf([holder.value, dimmer.value]);
	gsap.set(holder.value, {marginTop:0, opacity:1});
	gsap.to(dimmer.value, {duration:.25, opacity:1});
	gsap.from(holder.value, {duration:.25, marginTop:100, opacity:0, ease:"back.out"});

	keyUpHandler = (e:KeyboardEvent) => { if(e.key == "Escape") close(); }

	document.addEventListener("keyup", keyUpHandler);
});

onBeforeUnmount(() => {
	document.removeEventListener("keyup", keyUpHandler);
});

function close():void {
	gsap.killTweensOf([holder.value, dimmer.value]);
	gsap.to(dimmer.value, {duration:.25, opacity:0, ease:"sine.in"});
	gsap.to(holder.value, {duration:.25, marginTop:100, opacity:0, ease:"back.out", onComplete:()=> {
		emit("close");
	}});
}

function copyLink():void {
	Utils.copyToClipboard(obsPanelURL.value);
	gsap.set(url.value, {filter:"brightness(1) saturate(1)", background:"rgba(255,255,255,0)"});
	gsap.from(url.value, {duration:.5, ease:"sine.in", filter:"brightness(2) saturate(0)", background:"rgba(255,255,255,1)"});
	copiedText.value = true;
	setTimeout(()=> {
		copiedText.value = false;
	}, 1000);
}

function selectText():void {
	var range = document.createRange();
	range.selectNode(actualURL.value);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
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
				display: inline-block;
				border-radius: 10px;
				.copied {
					padding: 0 58px;
				}
			}
			strong {
				color: @mainColor_warn;
			}

			.copy {
				padding: 5px;
				:deep(.icon) {
					width: 14px;
					height: 14px;
				}
			}
		}
	}
}
</style>