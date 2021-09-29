<template>
	<div class="viewersrating">
		<Button type="checkbox" title="Activer" class="toggle" v-model="enabled" />


		<div :class="formClasses">
			<div class="description">Cet outil permet de vous alerter si une personne considérée comme toxique se trouve dans votre chat.</div>

		</div>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import Button from "../Button.vue";

@Component({
	components:{
		Button,
	}
})
export default class ViewersRating extends Vue {

	public enabled:boolean = false;

	public get formClasses():string[] {
		let res = ["form"]
		if(!this.enabled) res.push("disabled");
		return res;
	}

	public mounted():void {
		if(this.$store.state.botToxicEnabled) {
			this.enabled = true;
		}
		
	}

	public beforeDestroy():void {
		
	}

	@Watch("enabled")
	public onToggle():void {
		this.$store.dispatch("setBotToxicEnabled", this.enabled);
	}

}
</script>

<style scoped lang="less">
.viewersrating{
	.toggle {
		margin: 10px 0;
	}

	.description {
		font-size: 16px;
		text-align: left;
	}

	.form {
		transition: opacity 0.2s;
		&.disabled {
			pointer-events: none;
			opacity: .25;
		}
	}
}
</style>