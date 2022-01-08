<template>
	<div :class="classes" @mouseenter="over=true" @mouseleave="over=false">
		<a :href="data.url" class="link">
			<img class="icon" :src="logo" :alt="data.name" @error="onLogoError()">
			<div class="label">{{data.name}}</div>
		</a>
	</div>
</template>

<script lang="ts">
import { Profile } from "@/views/ProfileSwitcher.vue";
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";

@Component({
	components:{}
})
export default class ProfileNavButton extends Vue {

	@Prop()
	public data:Profile;

	@Prop()
	public position:"left"|"right";

	@Prop()
	public lightMode:boolean;

	public over:boolean = false;
	public forceDefaultLogo:boolean = false;
	public get logo():string {
		if(this.forceDefaultLogo) {
			return "/logos/default.png";
		}else{
			return this.data.icon;
		}
	}

	public get classes():string[] {
		let res = ["profilenavbutton"];
		res.push(this.position);
		if(this.over) res.push("open");
		if(this.lightMode) res.push("lightMode");
		return res;
	}

	public mounted():void {
		
	}

	public beforeDestroy():void {
		
	}

	/**
	 * Called if logo loading failed
	 */
	public onLogoError():void {
		console.warn("No logo specified for profile \""+this.data.name+"\" on folder \"public/logos\". Fallback to default logo. Add a \""+this.data.name+".png\" on \"public/logos\" folder to change it !");
		this.forceDefaultLogo = true;
	}

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