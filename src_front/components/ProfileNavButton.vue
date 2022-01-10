<template>
	<div :class="classes" @mouseenter="over=true" @mouseleave="over=false">
		<a :href="url" class="link">
			<img class="icon" :src="logo" :alt="data.id" @error="onLogoError()">
			<div class="label">{{title}}</div>
		</a>
	</div>
</template>

<script lang="ts">
import { ProfileData } from "@/views/ProfileSwitcher.vue";
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
	components:{}
})
export default class ProfileNavButton extends Vue {

	@Prop()
	public data:ProfileData;

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
			return "/logos/"+this.data.id+".png";
		}
	}

	public get classes():string[] {
		let res = ["profilenavbutton"];
		res.push(this.position);
		if(this.over) res.push("open");
		if(this.lightMode) res.push("lightMode");
		return res;
	}

	public get title():string {
		if(this.data?.title) return this.data?.title;
		return "";
	}

	public get url():string {
		let route = this.$route.path;
		return "https://"+this.data.domains[0] + route;
	}

	public mounted():void {
		
	}

	public beforeDestroy():void {
		
	}

	/**
	 * Called if logo loading failed
	 */
	public onLogoError():void {
		console.warn("No logo specified for profile \""+this.data.id+"\" on folder \"public/logos\". Fallback to default logo. Add a \""+this.data.id+".png\" on \"public/logos\" folder to change it !");
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