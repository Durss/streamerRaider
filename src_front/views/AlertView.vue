<template>
	<div class="alert" v-if="message && message.length > 0" @click="close()" ref="rootEl">
		<p v-html="message" class="label"></p>
	</div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { nextTick, onMounted, ref, watch } from 'vue';
import { useMainStore } from '@/store';

const store = useMainStore();
const message = ref<string>("");
const rootEl = ref<HTMLElement>();
let timeout:number;

async function onWatchAlert():Promise<void> {
	let mess = store.alert;
	if(mess && mess.length > 0) {
		message.value = mess;
		await nextTick();
		rootEl.value.removeAttribute("style");
		gsap.killTweensOf(rootEl.value);
		gsap.from(rootEl.value, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.out"});
		timeout = setTimeout(()=> close(), message.value.length*80 +2000);
	}else if(message.value) {
		gsap.to(rootEl.value, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.in", onComplete:()=> {
			message.value = null;
		}});
	}
}

watch(() => store.alert, () => onWatchAlert());

onMounted(() => onWatchAlert());

function close():void {
	clearTimeout(timeout);
	store.alert = null;
}
</script>

<style lang="less" scoped>

.alert {
	background-color: @mainColor_alert;
	color: @mainColor_light;
	padding: 20px 0;
	height: auto;
	width: 100%;
	position: fixed;
	overflow: hidden;
	z-index: 1;
	position: fixed;
	top: 0;
	left: 0;
	cursor: pointer;

	.label {
		max-width: 600px;
		margin: auto;
		padding: 10px 30px 10px 10px;
		text-align: center;
		&::after {
			content: "X";
			font-family: "Arial";
			color: #fff;
			position: absolute;
			top: 10px;
			right: 10px;
			padding-left: 20px;
			font-size: 20px;
		}
	}
}
</style>