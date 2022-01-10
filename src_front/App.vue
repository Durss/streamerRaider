
<template>
	<div id="app" class="app">
		<vue-headful :title="pageTitle" v-if="pageTitle" />
		<router-view class="view" />
		<Footer class="footer" v-if="!lightMode" />
		<ProfileSwitcher :lightMode="lightMode" />
		<Confirm />
		<Alert />
		<Tooltip />
		<MainLoader v-if="!storeInitComplete" />
	</div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import Footer from "./components/Footer.vue";
import MainLoader from "./components/MainLoader.vue";
import Tooltip from "./components/Tooltip.vue";
import Config from "./utils/Config";
import Utils from "./utils/Utils";
import Alert from "./views/AlertView.vue";
import Confirm from "./views/Confirm.vue";
import ProfileSwitcher, { ProfileData } from "./views/ProfileSwitcher.vue";

@Component({
	components:{
		Alert,
		Footer,
		Tooltip,
		Confirm,
		MainLoader,
		ProfileSwitcher,
	}
})
export default class App extends Vue {

	public pageTitle:string = null;

	public get storeInitComplete():boolean {
		return this.$store.state.initComplete;
	}

	public get lightMode():boolean {
		return Utils.getRouteMetaValue(this.$route, "lightMode") === true;
	}

	public async mounted():Promise<void> {
		if(this.$store.state.profile) {
			this.onReady();
		}
	}

	public beforeDestroy():void {
	}

	@Watch("$store.state.initComplete", { immediate: true, deep: true })
	public onReady():void {
		let p = <ProfileData>this.$store.state.profile;
		if(!p) {
			this.pageTitle = p+" Raider";
		}else{
			let title = p.title? p.title : Config.DEFAULT_PAGE_TITLE;
			this.pageTitle = title;
		}
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