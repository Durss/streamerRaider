<template>
	<div class="footer">
		<div>Sources on <a href="https://github.com/Durss/streamerRaider" target="_blank"><img src="@/assets/icons/github.svg" alt="logo" height="18">Github</a></div>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";

@Component({
	components:{}
})
export default class Footer extends Vue {

	public mounted():void {
		
	}

	public beforeDestroy():void {
		
	}

}
</script>

<style scoped lang="less">
.footer{
	
}
</style>