<template>
	<div class="obsconfigpanel">
		<div class="holder">
			<div class="head">
				<span class="title"><img src="@/assets/icons/params.svg" alt="params"> Outils</span>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="close()" class="close"/>
			</div>
			<div class="content">
				<div class="tabs">
					<Button :selected="content=='shoutout'" @click="content='shoutout'" title="Shoutout" :icon="require('@/assets/icons/shoutout.svg')" />
					<Button disabled data-tooltip="Coming soon?" :selected="content=='viewers-rating'" @click="content='viewers-rating'" title="Viewers" :icon="require('@/assets/icons/user_rate.svg')" />
					<Button disabled data-tooltip="Coming soon?" :selected="content=='autoban'" @click="content='autoban'" title="Auto ban" :icon="require('@/assets/icons/ban.svg')" />
				</div>
				<div>
					<ViewersRating v-if="content=='viewers-rating'" />
					<ShoutoutBot v-if="content=='shoutout'" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import Button from "./Button.vue";
import ShoutoutBot from "./obsconfig/ShoutoutBot.vue";
import ViewersRating from "./obsconfig/ViewersRating.vue";

@Component({
	components:{
		Button,
		ViewersRating,
		ShoutoutBot,
	}
})
export default class ObsConfigPanel extends Vue {

	public content:string = "shoutout";

	public mounted():void {
		
	}

	public beforeDestroy():void {
		
	}

	public close():void {
		this.$emit("close");
	}

}
</script>

<style scoped lang="less">
.obsconfigpanel{
	top: 0;
	left: 0;
	position: absolute;
	z-index: 1;
	width: 100%;
	height: 100%;
	.holder {
		.block();
		width: 100%;
		height: calc(100% - 40px);
		margin-top: 20px;
		.head {
			display: flex;
			padding: 5px;
			margin-bottom: 0px;
			.title {
				flex-grow: 1;
				font-size: 20px;
				img {
					height: 21px;
					margin-bottom: -4px;
					// vertical-align: middle;
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
			padding-top: 0;
			.tabs {
				display: flex;
				flex-direction: row;
				justify-content: space-around;
				width: 100%;
				margin-bottom: 10px;
				button {
					flex-grow: 1;
					border-top-left-radius: 0;
					border-top-right-radius: 0;
					font-size: 16px;
					&:not(:last-child) {
						margin-right: 1px;
					}
					&:not(.selected) {
						background-color: lighten(@mainColor_dark_light, 20%);
						&:hover {	
							background-color: lighten(@mainColor_dark_light, 40%);
						}
					}
				}
			}
		}

	}
}
	
@media only screen and (max-width: 500px) {
	.obsconfigpanel{
		.holder {
			width: 100%;
		}
	}
}
</style>