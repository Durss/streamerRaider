<template>
	<div :class="(hidden? 'hidden ' : '') + 'confirmView'">
		<div class="dimmer" ref="dimmer" @click="answer(false)"></div>
		<div class="holder" ref="holder">
			<div class="title" v-html="title"></div>
			<div class="description" v-html="description"></div>
			<div class="buttons">
				<Button class="cancel" type="cancel" @click="onCancel" :title="noLabel" alert />
				<Button class="confirm" @click="onConfirm" :title="yesLabel" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Button from '@/components/Button.vue';
import { useMainStore } from '@/store';

const store = useMainStore();
const title = ref("");
const description = ref("");
const yesLabel = ref("");
const noLabel = ref("");
const hidden = ref(true);
const dimmer = ref<HTMLElement>();
const holder = ref<HTMLElement>();
let keyUpHandler:(e:KeyboardEvent)=>void;

onMounted(() => {
	keyUpHandler = (e:KeyboardEvent) => onKeyUp(e);
	document.addEventListener("keyup", keyUpHandler);
});

onBeforeUnmount(() => {
	document.removeEventListener("keyup", keyUpHandler);
});

watch(() => store.confirm, () => {
	let isHidden = !store.confirm || !store.confirm.title;

	if(hidden.value == isHidden) return;//No change, ignore

	if(!isHidden) {
		hidden.value = isHidden;
		title.value = store.confirm.title;
		description.value = store.confirm.description;
		yesLabel.value = store.confirm.yesLabel || "Oui";
		noLabel.value = store.confirm.noLabel || "Non";
		//@ts-ignore
		document.activeElement.blur();//avoid clicking again on focused button if submitting confirm via SPACE key
		gsap.killTweensOf([holder.value, dimmer.value]);
		gsap.set(holder.value, {marginTop:0, opacity:1});
		gsap.to(dimmer.value, {duration:.25, opacity:1});
		gsap.from(holder.value, {duration:.25, marginTop:100, opacity:0, ease:"back.out"});
	}else{
		gsap.killTweensOf([holder.value, dimmer.value]);
		gsap.to(dimmer.value, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(holder.value, {duration:.25, marginTop:100, opacity:0, ease:"back.out", onComplete:()=> {
			hidden.value = true;
		}});
	}
}, { immediate: true, deep: true });

function onKeyUp(e:KeyboardEvent):void {
	if(hidden.value) return;
	if(e.keyCode == 13 || e.keyCode == 32) {//Enter / space
		answer(true);
		e.preventDefault();
		e.stopPropagation();
	}
	if(e.keyCode == 27) {//escape
		answer(false);
		e.preventDefault();
		e.stopPropagation();
	}
}

//Buttons re-emit the native click event; stop propagation here as the old
//template did via the (now removed) .native.stop modifier.
function onCancel(e:MouseEvent):void { e?.stopPropagation(); answer(false); }
function onConfirm(e:MouseEvent):void { e?.stopPropagation(); answer(true); }

function answer(confirm:boolean):void {
	if(!store.confirm) return;

	if(confirm) {
		if(store.confirm.confirmCallback) {
			store.confirm.confirmCallback();
		}
	}else{
		if(store.confirm.cancelCallback) {
			store.confirm.cancelCallback();
		}
	}
	store.confirm = null;
}
</script>

<style lang="less" scoped>

.confirmView {
	z-index: 99;
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;

	&.hidden {
		display: none;
	}
	.dimmer {
		backdrop-filter: blur(5px);
		background-color: rgba(0,0,0,.7);
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.holder {
		.center();
		position: absolute;
		background-color: @mainColor_light_extralight;
		padding: 30px;
		width: 400px;
		box-sizing: border-box;
		border-radius: 20px;

		.title {
			font-size: 45px;
			text-align: center;
		}

		.description {
			font-size: 24px;
			margin-top: 20px;
			:deep(strong) {
				color: @mainColor_warn;
				font-weight: bold;
			}
		}

		.buttons {
			display: flex;
			flex-direction: row;
			// max-width: 220px;
			margin: auto;
			margin-top: 30px;
			justify-content: space-evenly;
		}
	}
}

@media only screen and (max-width: 500px) {
	.confirmView {
		.holder {
			padding: 15px;
			width: 90vw;

			.title {
				font-size: 30px;
			}

			.description {
				font-size: 20px;
				margin-top: 10px;
			}

			.buttons {
				margin-top: 15px;
				button {
					font-size: 18px;
					padding: 10px;
				}
			}
		}
	}
}

@media only screen and (max-width: 360px) {
	.confirmView {
		.holder {
			padding: 15px;
			width: 90vw;


			.buttons {
				margin-top: 15px;
				button {
					font-size: 15px;
					padding: 10px;
				}
			}
		}
	}
}
</style>
