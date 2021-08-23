<template>
	<div class="botconfigpanel">
		<div class="holder">
			<div class="head">
				<span class="title"><img src="@/assets/icons/twitch.svg" alt="twitch"> Bot Config</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="close()" class="close"/>
			</div>
			<div class="content">
				<div>
					<p>En activant le bot<sup>*</sup>, tu pourras effectuer des shoutouts personnalisés avec la description de la personne, si elle en a définit une.</p>
					<p>Le message sera envoyé en ton nom.</p>
				</div>
				
				<Button type="checkbox" title="Activer" class="toggle" v-model="enabled" />
				
				<div :class="formClasses">
					<div class="row">
						<label for="command">Commande :</label>
						<input type="text" id="command" v-model="command">
					</div>
					
					<div class="row">
						<label for="text">Message :</label>
						<textarea id="text" v-model="text" rows="4"></textarea>
					
						<div class="fallback">
							<Button type="checkbox" class="toggle" v-model="botDescriptionFallback" name="botDescriptionFallback" />
							<label for="botDescriptionFallback">Si la personne n'a pas renseigné de description, afficher la description de sa chaîne twitch à la place.</label>
						</div>
					</div>
					
					<div class="row roles">
						<label for="text">Rôles autorisés :</label>
						<div class="role">
							<Button type="checkbox" class="toggle" v-model="botRoleModerators" name="botRoleModerators" />
							<label for="botRoleModerators">Modérateurs/trices</label>
						</div>
						<div class="role">
							<Button type="checkbox" class="toggle" v-model="botRoleVIP" name="botRoleVIP" />
							<label for="botRoleVIP">VIP</label>
						</div>
						<div class="role">
							<Button type="checkbox" class="toggle" v-model="botRoleViewers" name="botRoleViewers" />
							<label for="botRoleViewers">Viewers</label>
						</div>
					</div>
					
					<Button title="Reset" highlight @click="reset()" />
				</div>

				<div class="infos"><sup>*</sup> : Le bot ne peut fonctionner que si cette page est présente dans un panneau OBS ou ouverte dans un onglet de navigateur !</div>

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
	public botDescriptionFallback:boolean = false
	public command:string = "";
	public text:string = "";
	public botRoleModerators:boolean = false;
	public botRoleVIP:boolean = false;
	public botRoleViewers:boolean = false;

	public get formClasses():string[] {
		let res = ["form"]
		if(!this.enabled) res.push("disabled");
		return res;
	}

	public mounted():void {
		if(this.$store.state.botEnabled) {
			this.enabled = true;
		}

		//Prefill form from store
		this.command = this.$store.state.botCommand;
		this.text = this.$store.state.botText;
		this.botDescriptionFallback = this.$store.state.botDescriptionFallback;
		let roles = this.$store.state.botRoles;
		this.botRoleModerators = roles.includes("moderator");
		this.botRoleVIP = roles.includes("vip");
		this.botRoleViewers = roles.includes("viewer");
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

	@Watch("botDescriptionFallback")
	public onBotDescriptionFallbackChange():void {
		this.$store.dispatch("setBotDescriptionFallback", this.botDescriptionFallback);
	}

	@Watch("botRoleModerators")
	public onBotRoleModeratorsChange():void { this.updateRolesList(); }
	@Watch("botRoleVIP")
	public onBotRoleVIPChange():void { this.updateRolesList(); }
	@Watch("botRoleViewers")
	public onBotRoleViewersChange():void { this.updateRolesList(); }

	public reset():void {
		this.$store.dispatch("resetBotConfig");
		this.command = this.$store.state.botCommand;
		this.text = this.$store.state.botText;
		this.botDescriptionFallback = this.$store.state.botDescriptionFallback;
		let roles = this.$store.state.botRoles;
		this.botRoleModerators = roles.includes("moderator");
		this.botRoleVIP = roles.includes("vip");
		this.botRoleViewers = roles.includes("viewer");
	}

	/**
	 * Called anytime a role is checked or unchecked
	 */
	private updateRolesList():void {
		let roles = [];
		if(this.botRoleModerators) roles.push("moderator");
		if(this.botRoleVIP) roles.push("vip");
		if(this.botRoleViewers) roles.push("viewer");
		this.$store.dispatch("setBotRoles", roles);
	}

}
</script>

<style scoped lang="less">
.botconfigpanel{
	width: calc(100% - 20px);
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
			font-size: 16px;
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
					flex-direction: column;
					margin-bottom: 15px;
					width: 100%;
					label {
						text-align: left;
						font-size: 16px;
						margin-right: 10px;
						display: inline-block;
					}
					input {
						margin-left: 10px;
					}
					textarea {
						margin-left: 10px;
						font-size: 16px;
						font-family: "Futura";
					}

					.fallback {
						display: flex;
						flex-direction: row;
						align-items: flex-start;
						justify-content: flex-start;
						margin-left: 10px;
						margin-top: 10px;
						label {
							font-size: 13px;
							cursor: pointer;
						}
						.button {
							min-width: 30px;
							margin: 0;
						}
					}

					&.roles {
						.role {
							display: flex;
							flex-direction: row;
							align-items: center;
							justify-content: flex-start;
							label {
								margin: 0;
								font-size: 13px;
								cursor: pointer;
							}
							.button {
								margin: 0;
								margin-left: 10px;
							}
						}
					}
				}
			}

			.infos {
				text-align: left;
				font-size: 13px;
				margin-top: 10px;
				color: @mainColor_warn;
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