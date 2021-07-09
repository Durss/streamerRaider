<template>
	<div class="streamerform">
		<Button title="Editer mes infos" :icon="require('@/assets/icons/edit.svg')" v-if="!opened" @click="opened=true" white />
		<div v-if="opened" class="holder">
			<div class="head">
				<span class="nickname">{{userName}}</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="opened=false" class="close"/>
			</div>
			<div class="content">
				<div class="description">
					<label for="description">Description :</label>
					<textarea id="description" v-model="description" cols="30" rows="5" :maxlength="maxLengthDescription"></textarea>
					<div class="counter">{{description.length}}/{{maxLengthDescription}}</div>
				</div>
				<Button title="Mettre à jour" @click="submit()" :loading="saving" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Api from "@/utils/Api";
import IRCClient from "@/utils/IRCClient";
import { Component, Vue } from "vue-property-decorator";
import Button from "./Button.vue";

@Component({
	components:{
		Button,
	}
})
export default class StreamerForm extends Vue {

	public opened:boolean = false;
	public description:string = "";
	public maxLengthDescription:number = 350;
	public saving:boolean = false;

	public get userName():string{ return IRCClient.instance.authenticatedUserLogin; }

	public mounted():void {
		this.loadDescription()
	}

	public beforeDestroy():void {
		
	}

	private async loadDescription():Promise<void> {
		this.description = await Api.get("description?login="+IRCClient.instance.authenticatedUserLogin);
		console.log(this.description);
	}

	public async submit():Promise<void> {
		this.saving = true;
		let res = await Api.post("description", {description:this.description, access_token:this.$store.state.OAuthToken});
		this.saving = false;
		this.opened = false;
	}

}
</script>

<style scoped lang="less">
.streamerform{
	margin-top: 15px;
	.holder {
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
			label {
				font-size: 18px;
				text-align: left;
				display: block;
			}
			.description {
				position: relative;
				width: min-content;
				margin: auto;
				margin-bottom: 15px;
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
		}
	}
}
</style>