<template>
	<div :class="(hidden? 'hidden ' : '') + 'confirmView'">
		<div class="dimmer" ref="dimmer" @click="answer(false)"></div>
		<div class="holder" ref="holder">
			<div class="title" v-html="title"></div>
			<div class="description" v-html="description"></div>
			<div class="buttons">
				<Button class="cancel" type="cancel" @click.native.stop="answer()" :title="noLabel" alert />
				<Button class="confirm" @click.native.stop="answer(true)" :title="yesLabel" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from 'vue-property-decorator';
import gsap from 'gsap';
import Button from '@/components/Button.vue';

@Component({
	components:{
		Button
	}
})
export default class ConfirmView extends Vue {
	public title:string = "";
	public description:string = "";
	public yesLabel:string = "";
	public noLabel:string = "";
	public hidden:boolean = true;

	private keyUpHandler:any;

	public mounted():void {
		this.keyUpHandler = (e:KeyboardEvent) => this.onKeyUp(e);
		document.addEventListener("keyup", this.keyUpHandler);
	}

	public beforeDestroy():void {
		document.removeEventListener("keyup", this.keyUpHandler);
	}

	@Watch('$store.state.confirm', { immediate: true, deep: true })
	public onConfirmChanged() {
		let hidden = !this.$store.state.confirm || !this.$store.state.confirm.title;
		
		if(this.hidden == hidden) return;//No change, ignore

		if(!hidden) {
			this.hidden = hidden;
			this.title = this.$store.state.confirm.title;
			this.description = this.$store.state.confirm.description;
			this.yesLabel = this.$store.state.confirm.yesLabel || "Oui";
			this.noLabel = this.$store.state.confirm.noLabel || "Non";
			//@ts-ignore
			document.activeElement.blur();//avoid clicking again on focused button if submitting confirm via SPACE key
			gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
			gsap.set(this.$refs.holder, {marginTop:0, opacity:1});
			gsap.to(this.$refs.dimmer, {duration:.25, opacity:1});
			gsap.from(this.$refs.holder, {duration:.25, marginTop:100, opacity:0, ease:"back.out"});
		}else{
			gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
			gsap.to(this.$refs.dimmer, {duration:.25, opacity:0, ease:"sine.in"});
			gsap.to(this.$refs.holder, {duration:.25, marginTop:100, opacity:0, ease:"back.out", onComplete:()=> {
				this.hidden = true;
			}});
		}
	}

	private onKeyUp(e:KeyboardEvent):void {
		if(this.hidden) return;
		if(e.keyCode == 13 || e.keyCode == 32) {//Enter / space
			this.answer(true);
			e.preventDefault();
			e.stopPropagation();
		}
		if(e.keyCode == 27) {//escape
			this.answer(false);
			e.preventDefault();
			e.stopPropagation();
		}
	}

	private answer(confirm:boolean):void {
		if(!this.$store.state.confirm) return;
		
		if(confirm) {
			if(this.$store.state.confirm.confirmCallback) {
				this.$store.state.confirm.confirmCallback();
			}
		}else{
			if(this.$store.state.confirm.cancelCallback) {
				this.$store.state.confirm.cancelCallback();
			}
		}
		this.$store.state.confirm = null;
	}
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
			/deep/ strong {
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
				font-size: 22px;
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

			.title {
				font-size: 20px;
			}

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
