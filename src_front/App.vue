
<template>
	<div id="app" class="app">
		<router-view class="view" />
		<Footer class="footer" v-if="!lightMode" />
		<ProfileSwitcher :lightMode="lightMode" />
		<Confirm />
		<Alert />
		<Tooltip />
		<MainLoader v-if="!storeInitComplete" />
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { useMainStore } from "./store";
import Footer from "./components/Footer.vue";
import MainLoader from "./components/MainLoader.vue";
import Tooltip from "./components/Tooltip.vue";
import Config from "./utils/Config";
import Utils from "./utils/Utils";
import Alert from "./views/AlertView.vue";
import Confirm from "./views/Confirm.vue";
import ProfileSwitcher, { ProfileData } from "./views/ProfileSwitcher.vue";

const store = useMainStore();
const route = useRoute();

const pageTitle = ref<string>(null);

const storeInitComplete = computed(():boolean => store.initComplete);

const lightMode = computed(():boolean => Utils.getRouteMetaValue(route, "lightMode") === true);

//Replaces the former vue-headful component: keep the document title in sync.
watchEffect(() => {
	if(pageTitle.value) document.title = pageTitle.value;
});

onMounted(() => {
	if(store.profile) {
		onReady();
	}
});

watch(() => store.initComplete, () => onReady(), { immediate: true });

function onReady():void {
	let p = <ProfileData>store.profile;
	if(!p) {
		pageTitle.value = Config.DEFAULT_PAGE_TITLE;
	}else{
		let title = p.title? p.title : Config.DEFAULT_PAGE_TITLE;
		pageTitle.value = title;
	}
}
</script>

<style scoped lang="less">
.app{
	font-family: Futura, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	height: 100%;
	min-height: 100vh;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;

	.view {
		height: 100%;
		min-height: 100%;
		padding-top: 20px;
		padding-bottom: 35px;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}
	.footer {
		position: fixed;
		background-color: @mainColor_dark_light;
		height: 35px;
		color: @mainColor_light;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-family: "Nunito Light";
		width: 100%;
		bottom: 0;
		box-shadow: 0px -5px 5px 0px rgba(0,0,0,0.2);
	}
}
</style>