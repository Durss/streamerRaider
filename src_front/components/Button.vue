<template>
	<component
	:class="classes"
	:is="nodeType"
	:type="type=='checkbox'? null : type"
	:target="target"
	:to="to"
	:href="type=='link'? to : null"
	@click="onClick($event)"
	:style="progressStyle">
		<img :src="parsedIcon" v-if="parsedIcon && !isIconSVG" alt="icon" class="icon" :class="loading? 'hide' : 'show'">
		<div v-html="parsedIcon" v-if="parsedIcon && isIconSVG" alt="icon" class="icon" :class="loading? 'hide' : 'show'"></div>

		<div class="checkboxContent" v-if="type=='checkbox'">
			<div class="checkmark">
				<img :src="checkMarkIcon" v-if="checked" alt="icon" class="img">
			</div>
			<span class="label" :class="loading? 'hide' : 'show'" v-if="title" v-html="title"></span>
			<input type="checkbox" :name="name" :id="name" class="checkboxInput" ref="checkbox" v-model="checked" v-if="type=='checkbox'" />
		</div>

		<img src="@/assets/loader/loader.svg" alt="loader" class="spinner" v-if="loading">
		<span class="label" :class="loading? 'hide' : 'show'" v-if="title && type!='checkbox'" v-html="title"></span>
		<input type="file" v-if="type=='file'" class="browse" :accept="accept" ref="browse" @change="onFileChange" />
	</component>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { computed, onMounted, ref, watch } from "vue";
import checkmarkWhiteIcon from '@/assets/icons/checkmark_white.svg';
import checkmarkIcon from '@/assets/icons/checkmark.svg';

const props = withDefaults(defineProps<{
	icon?:string;
	iconSelected?:string;
	title?:string;
	name?:string;
	loading?:boolean;
	type?:string;
	target?:string;
	to?:any;
	percent?:number;
	white?:boolean;
	big?:boolean;
	highlight?:boolean;
	selected?:boolean;
	disabled?:boolean;
	modelValue?:boolean;
	accept?:string;
}>(), {
	icon: null,
	iconSelected: null,
	title: null,
	name: null,
	loading: false,
	type: "button",
	target: null,
	to: null,
	percent: -1,
	white: false,
	big: false,
	highlight: false,
	selected: false,
	disabled: false,
	modelValue: false,
	accept: "image/*",
});

const emit = defineEmits<{
	click: [event:MouseEvent];
	change: [event:Event];
	"update:modelValue": [value:boolean];
}>();

const pInterpolated = ref(-1);
const checked = ref(false);
const browse = ref<HTMLInputElement>();

const isIconSVG = computed(():boolean => parsedIcon.value.indexOf("<") != -1);

const checkMarkIcon = computed(():string => {
	if(props.white !== false) {
		return checkmarkWhiteIcon;
	}else{
		return checkmarkIcon;
	}
});

const nodeType = computed(():string => {
	if(props.to) return "router-link";
	if(props.type == "checkbox") return "div";
	if(props.type == "link") return "a";
	return "button";
});

const parsedIcon = computed(():string => {
	if(props.selected !== false && props.iconSelected) {
		return props.iconSelected;
	}else{
		return props.icon;
	}
});

const progressStyle = computed(():any => {
	if(pInterpolated.value> -1 && pInterpolated.value<100) {
		let p:number = Math.round(pInterpolated.value);
		let color = "255, 255, 255";
		let alpha = .5;
		if(props.white !== false) {
			color = "75, 201, 194"
			alpha = .3;
		}
		return {backgroundImage: "linear-gradient(to right, rgba("+color+",0) "+p+"%,rgba("+color+",0) "+p+"%,rgba("+color+","+alpha+") "+p+"%,rgba("+color+","+alpha+") 100%)"};
	}else{
		return {};
	}
});

const classes = computed(():any => {
	let list =  ["button"]
	if(!props.title) list.push("noTitle");
	if(props.white !== false) list.push("white");
	if(props.big !== false) list.push("big");
	if(props.highlight !== false) list.push("highlight");
	if(props.selected !== false) list.push("selected");
	if(props.loading !== false) list.push("disabled");
	if(props.disabled !== false) list.push("disabled");
	if(props.type == "checkbox") list.push("checkbox");
	return list;
});

onMounted(() => {
	checked.value = props.modelValue;
});

function resetBrowse():void {
	browse.value.value = null;
}

function onClick(event:MouseEvent):void {
	if(props.disabled !== false || props.loading) return;
	emit('click', event);//bubble up event to avoid having to listen for @click.native everytime
}

function onFileChange(event:Event):void {
	emit('change', event);
}

watch(checked, () => {
	emit('update:modelValue', checked.value);
});

watch(() => props.modelValue, () => {
	checked.value = props.modelValue;
});

watch(() => props.percent, () => {
	let duration = props.percent < pInterpolated.value? 0 : .35;
	gsap.killTweensOf(pInterpolated);
	gsap.to(pInterpolated, {duration, value:props.percent, ease:"sine.inout"});
});

defineExpose({ resetBrowse });
</script>

<style lang="less" scoped>

.button {
	position: relative;//Necessary for loader spinning absolute placement
	display: inline-flex;
	justify-content: center;
	align-items: center;
	flex-direction: row;
	white-space: nowrap;
	// transition: all .25s;
	overflow: hidden;
	// touch-action: none;
	user-select: none;
	color: @mainColor_light;

	&>*:not(.browse) {
		pointer-events: none;
	}

	&.noTitle {
		margin: 0;
		padding: 7px;
		.icon {
			height: 100%;
			max-height: 26px;
			margin: 0;
			padding: 0;
		}

		&.big {
			padding: 19px;
			.icon {
				min-width: 40px;
				max-height: 40px;
			}
		}
	}

	&.checkbox {
		background: none;
		padding: 0px;
		border-radius: 0;
		margin: 0;
		display: inline-block;

		.checkboxInput {
			pointer-events: all;
			opacity: .001;
			position: absolute;
			padding: 0;
			margin: 0;
			width: 100%;
			height: 100%;
			left: 0;
			top: 0;
			z-index: 1000;
			cursor: pointer;
		}
	}

	.checkboxContent {
		cursor: pointer;
		display: flex;
		flex-direction: row;
		width: 100%;
		height: 100%;
		align-items: center;

		.checkmark {
			border: 1px solid @mainColor_normal;
			border-radius: 4px;
			padding: 0;
			width: 15px;
			height: 15px;
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: center;
			.img {
				width: 80%;
				margin: 0;
				padding: 0;
			}
		}

		.label {
			flex-grow: 1;
			margin-left: 7px;
			justify-self: flex-start;
			text-align: left;
			width: max-content;
			color: @mainColor_light;
			// overflow: visible;
		}

		&:hover {
			background: none;
			.checkmark {
				background-color: fade(@mainColor_normal; 30%);
			}
		}
	}

	.icon {
		max-height: 20px;
		height: 20px;
		margin-right: 10px;
		vertical-align: middle;
	}

	.spinner {
		.center;
		position: absolute;
		vertical-align: middle;
		height: 25px;
		width: 25px;
	}

	.label {
		flex-grow: 1;
		white-space: nowrap;
		// overflow: hidden;
	}

	.label, .icon {
		opacity: 1;
		transition: opacity .2s;
		&.hide {
			opacity: .25;
		}
	}

	.browse {
		opacity: 0;
		position: absolute;
		z-index: 0;
		left: 0;
		width: 100%;
		height: 200%;//Hack to avoid browse button from locking cursor:pointer by putting it out of button's bounds
		cursor: pointer;
		font-size: 0px;
	}

	&.white {
		color: @mainColor_normal;
		background-color: #fff;
		.label, .icon {
			&.hide {
				opacity: .4;
			}
		}
		&:not(.loading):hover {
			background-color: @mainColor_normal_extralight;
		}
		&.loading {
			background-color: fade(#ffffff, 50%);
		}
		.checkboxContent {
			.checkmark {
				border-color: #fff;
			}
			.label {
				color: #fff;
			}
		}
	}

	&.big {
		padding: 20px;
		.label {
			font-size: 33px;
		}
		.icon {
			min-width: 30px;
			min-height: 30px;
		}
		&.checkbox {
			padding: 0;
			.checkboxContent {
				.checkmark {
					border-radius: 13px;
					width: 40px;
					height: 40px;
				}
			}
		}
	}

	&.highlight {
		color: #ffffff;
		background-color: @mainColor_warn;
		&.disabled {
			background-color: fade(@mainColor_warn,50%);
		}
		.label, .icon {
			&.hide {
				opacity: .4;
			}
		}
		&:not(.loading):hover {
			background-color: @mainColor_warn_light;
		}
		&.loading {
			background-color: fade(@mainColor_warn, 50%);
		}
		&.selected {
			background-color: @mainColor_warn_extralight;
		}
	}

	&.selected:not(.highlight) {
		background-color: @mainColor_warn;
		color: #fff;
		&.disabled {
			background-color: fade(@mainColor_warn,50%);
		}
		&:hover {
			background-color: @mainColor_warn_light;
		}
	}

	&.disabled {
		color: fade(@mainColor_light, 30%);
		background-color: fade(@mainColor_normal, 30%);
		&:hover {
			background-color: fade(@mainColor_normal, 30%);
		}
		.icon {
			opacity: .4;
		}
	}
}

@media only screen and (max-width: 500px) {
	.button {
		&.noTitle.big, &.big {
			padding: 12px;
			.label {
				font-size: 25px;
			}
			.icon {
				min-width: 25px;
				min-height: 25px;
			}
		}
		&:not(.big) {
			.label {
				font-size: 15px;
			}
			.icon {
				max-height: 18px;
			}
		}
	}
}
</style>