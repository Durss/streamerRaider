<template>
	<div class="botconfigpanel">
		<div class="holder">
			<div class="head">
				<span class="title"><img src="@/assets/icons/twitch.svg" alt="twitch"> Bot Config</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="close()" class="close"/>
			</div>
			<div class="content">
				<div>En activant le bot, tu pourras effectuer des shoutouts personnalisés avec la description de la personne, si elle en en a définit une.</div>
				
				<Button type="checkbox" title="Activer" class="toggle" v-model="enabled" />
				
				<div :class="formClasses">
					<div class="row">
						<label for="command">Commande</label>
						<input type="text" id="command" v-model="command">
					</div>
					
					<div class="row">
						<label for="text">Texte</label>
						<textarea id="text" v-model="text" rows="4"></textarea>
					</div>
					
					<Button title="Reset" highlight @click="reset()" />
				</div>

			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import Button from "./Button.vue";

@Component({
	components:{
		Button,
	}
})
export default class BotConfigPanel extends Vue {

	public enabled:boolean = false
	public command:string = "";
	public text:string = "";

	public get formClasses():string[] {
		let res = ["form"]
		if(!this.enabled) res.push("disabled");
		return res;
	}

	public mounted():void {
		if(this.$store.state.botEnabled) {
			this.enabled = true;
		}

		this.command = this.$store.state.botCommand;
		this.text = this.$store.state.botText;
	}

	public beforeDestroy():void {
		
	}

	public close():void {
		this.$emit("close");
	}

	@Watch("enabled")
	public onToggle():void {
		this.$store.dispatch("setBotEnabled", this.enabled);
	}

	@Watch("command")
	public onComandChange():void {
		this.$store.dispatch("setBotCommand", this.command);
	}

	@Watch("text")
	public onTextChange():void {
		this.$store.dispatch("setBotText", this.text);
	}

	public reset():void {
		this.$store.dispatch("resetBotConfig");
		this.command = this.$store.state.botCommand;
		this.text = this.$store.state.botText;
	}

}
</script>

<style scoped lang="less">
.botconfigpanel{
	width: 100%;
	.holder {
		.block();
		width: 100%;
		margin-top: 20px;
		.head {
			display: flex;
			padding: 5px;
			.title {
				flex-grow: 1;
				font-size: 20px;
				img {
					height: 21px;
					vertical-align: middle;
				}
			}
			.close {
				width: 20px;
				height: 20px;
				max-width: 20px;
				max-height: 20px;
				padding: 5px;
				border-radius: 5px;
			}
		}

		.content {
			.toggle {
				margin: 10px 0;
			}

			.form {
				transition: opacity 0.2s;
				&.disabled {
					pointer-events: none;
					opacity: .25;
				}
				.row {
					display: flex;
					flex-direction: row;
					margin-bottom: 5px;
					label {
						text-align: right;
						font-size: 16px;
						margin-right: 10px;
						width: 100px;
						display: inline-block;
					}
					textarea {
						font-size: 16px;
						font-family: "Futura";
					}
				}
			}
		}

	}
}
	
@media only screen and (max-width: 500px) {
	.botconfigpanel{
		.holder {
			width: 100%;
		}
	}
}
</style>