<template>
	<div class="alert" v-if="message && message.length > 0" @click="close()">
		<p v-html="message" class="label"></p>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from 'vue-property-decorator'
import gsap from 'gsap';

@Component
export default class AlertView extends Vue {

	public message:string = "";
	public timeout:number;

	public mounted():void {
		this.onWatchAlert();
	}

	@Watch("$store.state.alert")
	public async onWatchAlert():Promise<void> {
		let mess = this.$store.state.alert;
		if(mess && mess.length > 0) {
			this.message = mess;
			await this.$nextTick();
			this.$el.removeAttribute("style");
			gsap.killTweensOf(this.$el);
			gsap.from(this.$el, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.out"});
			this.timeout = setTimeout(_=> this.close(), this.message.length*80 +2000);
		}else if(this.message) {
			gsap.to(this.$el, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.in", onComplete:()=> {
				this.message = null;
			}});
		}
	}

	public close():void {
		clearTimeout(this.timeout);
		this.$store.state.alert = null;
	}
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