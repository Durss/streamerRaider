
<template>
	<div id="app" class="app">
		<router-view class="view" />
		<Footer class="footer" />
		<Confirm />
	</div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Confirm from "./views/Confirm.vue";
import Footer from "./components/Footer.vue";

@Component({
	components:{
		Footer,
		Confirm,
	}
})
export default class App extends Vue {

	public async mounted():Promise<void> {
	}

	public beforeDestroy():void {
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

	.view {
		padding-bottom: 50px;
	}
	.footer {
		position: fixed;
		background-color: @mainColor_dark_light;
		margin-top: 30px;
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