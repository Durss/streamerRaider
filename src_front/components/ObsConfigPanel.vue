<template>
	<div class="obsconfigpanel">
		<div class="holder">
			<div class="head">
				<span class="title"><img src="@/assets/icons/params.svg" alt="params"> Outils</span>
				<Button :icon="crossWhiteIcon" @click="close()" class="close"/>
			</div>
			<div class="content">
				<div class="tabs">
					<Button :selected="content=='shoutout'" @click="content='shoutout'" title="Shoutout" :icon="shoutoutIcon" />
					<Button disabled data-tooltip="Coming soon?" :selected="content=='viewers-rating'" @click="content='viewers-rating'" title="Viewers" :icon="userRateIcon" />
					<Button disabled data-tooltip="Coming soon?" :selected="content=='autoban'" @click="content='autoban'" title="Auto ban" :icon="banIcon" />
				</div>
				<div>
					<ViewersRating v-if="content=='viewers-rating'" />
					<ShoutoutBot v-if="content=='shoutout'" />
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Button from "./Button.vue";
import ShoutoutBot from "./obsconfig/ShoutoutBot.vue";
import ViewersRating from "./obsconfig/ViewersRating.vue";
import crossWhiteIcon from "@/assets/icons/cross_white.svg";
import shoutoutIcon from "@/assets/icons/shoutout.svg";
import userRateIcon from "@/assets/icons/user_rate.svg";
import banIcon from "@/assets/icons/ban.svg";

const emit = defineEmits<{ close: [] }>();

const content = ref("shoutout");

function close():void {
	emit("close");
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