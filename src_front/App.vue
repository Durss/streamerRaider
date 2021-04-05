
<template>
	<div id="app" class="app">
		<router-view class="view" />
		<Confirm />
	</div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Confirm from "./views/Confirm.vue";

@Component({
	components:{
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
	height: 100%;

	.view {
		height: 100%;
	}
	.offline {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 30px;
		margin: 10px;
	}
}
</style>