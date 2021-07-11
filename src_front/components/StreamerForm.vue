<template>
	<div class="streamerform">
		<div class="holder">
			<div class="head">
				<span class="nickname">{{userName}}</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="$emit('close')" class="close"/>
			</div>
			<div class="content">
				<div class="description">
					<label for="description">Description :</label>
					<textarea id="description" v-model="description" cols="30" rows="5" :maxlength="maxLengthDescription"></textarea>
					<div class="counter">{{description.length}}/{{maxLengthDescription}}</div>
				</div>
				<Button title="Mettre à jour" @click="submit()" :loading="saving" />
				<Button class="apiBt"
					:title="showAPI? '' : 'API'"
					:icon="require('@/assets/icons/'+(showAPI? 'cross_white' : 'plug')+'.svg')"
					@click="showAPI = !showAPI"
					highlight />
				
				<div class="apiInfo" v-if="showAPI">
					<p>Vous pouvez récupérer la description d'un·e utilisateur·rice pour, par exemple, faire des shoutout personnalisés, via cette URL :</p>
					<p class="url"><a :href="apiUrl" target="_blank">{{apiUrl}}</a></p>
					<p>Si la personne ne possède pas de description l'API renvoie une 404, sinon elle renvoie le texte brut.</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Api from "@/utils/Api";
import Config from "@/utils/Config";
import IRCClient from "@/utils/IRCClient";
import { Component, Vue } from "vue-property-decorator";
import Button from "./Button.vue";

@Component({
	components:{
		Button,
	}
})
export default class StreamerForm extends Vue {

	public showAPI:boolean = false;
	public description:string = "";
	public maxLengthDescription:number = 350;
	public saving:boolean = false;

	public get userName():string{ return IRCClient.instance.authenticatedUserLogin; }

	public get apiUrl():string {
		return Config.API_PATH+"/description?login="+this.userName;
	}

	public mounted():void {
		this.loadDescription()
	}

	public beforeDestroy():void {
		
	}

	private async loadDescription():Promise<void> {
		this.description = await Api.get("description?login="+IRCClient.instance.authenticatedUserLogin);
	}

	public async submit():Promise<void> {
		this.saving = true;
		let res = await Api.post("description", {description:this.description, access_token:this.$store.state.OAuthToken});
		this.saving = false;
		this.$emit("close")
	}

}
</script>

<style scoped lang="less">
.streamerform{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	backdrop-filter: blur(5px);
	z-index: 1;
	.holder {
		.center();
		position: absolute;
		.block();
		margin: auto;
		.head {
			text-transform: capitalize;
			display: flex;
			.nickname {
				flex-grow: 1;
			}
			.close {
				width: 30px;
				height: 30px;
				max-width: 30px;
				max-height: 30px;
				padding: 5px;
				border-radius: 10px;
			}
		}

		.content {
			// padding-bottom: 20px;
			position: relative;
			label {
				font-size: 18px;
				text-align: left;
				display: block;
			}
			.description {
				position: relative;
				width: min-content;
				margin: auto;
				margin-bottom: 10px;
				textarea {
					min-width: 450px;
					max-width: 450px;
					max-height: 270px;
				}
				.counter {
					position: absolute;
					bottom: -20px;
					right: 0;
					font-style: italic;
					font-size: 14px;
				}
			}

			.apiBt {
				position: absolute;
				right: 0;
				bottom: 0;
				border-radius: 0;
				min-width: 40px;//Fix weird bug that makes the BT's icon 0x0px if it has no label on first display
				border-top-left-radius: 15px;
				font-size: 14px;
				/deep/ .icon {
					max-height: 15px;
				}
			}

			.apiInfo {
				margin-top: 15px;
				text-align: left;
				font-size: 14px;
				color: @mainColor_warn;
				border-top: 1px solid @mainColor_light;
				padding: 12px;
				background-color: fade(@mainColor_normal, 50%);
				.url {
					margin: 5px 0;
					padding: 4px;
					border-radius: 20px;
					color: @mainColor_light;
					background-color: fade(@mainColor_normal, 50%);
					text-align: center;
					a {
						color: @mainColor_light;
					}
				}
			}
		}
	}
}
</style>