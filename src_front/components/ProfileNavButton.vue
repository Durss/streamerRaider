<template>
	<div :class="classes" @mouseenter="over=true" @mouseleave="over=false">
		<a :href="url" class="link">
			<img class="icon" :src="logo" :alt="data.id" @error="onLogoError()">
			<div class="label">{{title}}</div>
		</a>
	</div>
</template>

<script setup lang="ts">
import type { ProfileData } from "@/views/ProfileSwitcher.vue";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

const props = defineProps<{
	data:ProfileData;
	position?:"left"|"right";
	lightMode?:boolean;
}>();

const route = useRoute();

const over = ref(false);
const forceDefaultLogo = ref(false);

const logo = computed(():string => {
	if(forceDefaultLogo.value) {
		return "/logos/default.png";
	}else{
		return "/logos/"+props.data.id+".png";
	}
});

const classes = computed(():string[] => {
	let res = ["profilenavbutton"];
	res.push(props.position);
	if(over.value) res.push("open");
	if(props.lightMode) res.push("lightMode");
	return res;
});

const title = computed(():string => {
	if(props.data?.title) return props.data?.title;
	return "";
});

const url = computed(():string => {
	return "https://"+props.data.domains[0] + route.path;
});

/**
 * Called if logo loading failed
 */
function onLogoError():void {
	console.warn("No logo specified for profile \""+props.data.id+"\" on folder \"public/logos\". Fallback to default logo. Add a \""+props.data.id+".png\" on \"public/logos\" folder to change it !");
	forceDefaultLogo.value = true;
}
</script>

<style scoped lang="less">
.profilenavbutton{
	position: fixed;
	top: 50%;
	border-radius: @border_radius;
	background-color: @mainColor_light;
	transition: transform .5s;
	box-shadow: rgba(0, 0, 0, 0.5) 0px 6px 16px 0px;

	&.right {
		right: 0;
		transform: translate(calc(100% - 55px), -50%);
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	&.left {
		left: 0;
		transform: translate(calc(-100% + 55px), -50%);
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		.link {
			flex-direction: row-reverse;
		}
	}

	&.open {
		transform: translate(0, -50%);
	}

	&.lightMode {
		top: calc(100% - 20px);
		&.right:not(.open) {
			transform: translate(calc(100% - 40px), -50%);
		}

		&.left:not(.open) {
			transform: translate(calc(-100% + 40px), -50%);
		}
		.link {
			.icon {
				width: 40px;
				height: 40px;
			}
			.label {
				font-size: 18px;
			}
		}
	}

	.link {
		display: flex;
		flex-direction: row;
		align-items: center;
		text-transform: capitalize;
		.icon {
			width: 55px;
			height: 55px;
		}
		.label {
			margin: 0 10px;
		}
	}
}
</style>