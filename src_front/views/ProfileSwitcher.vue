<template>
	<div class="profileswitcher" v-if="hasProfile">
		<ProfileNavButton v-if="prevProfile" :lightMode="lightMode" :data="prevProfile" position="left" class="navBt prev" />
		<ProfileNavButton v-if="nextProfile" :lightMode="lightMode" :data="nextProfile" position="right" class="navBt next" />
		<!-- <Button
			:icon="prevProfile.icon"
			:href="prevProfile.url"
			v-if="prevProfile"
			white
			type="link"
			target="_self"
			class="navBt prev"
		/>
		<Button
			:icon="nextProfile.icon"
			:href="nextProfile.url"
			v-if="nextProfile"
			white
			type="link"
			target="_self"
			class="navBt next"
		/> -->
	</div>
</template>

<script lang="ts">
import Button from "@/components/Button.vue";
import ProfileNavButton from "@/components/ProfileNavButton.vue";
import Api from "@/utils/Api";
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

@Component({
	components:{
		Button,
		ProfileNavButton,
	}
})
export default class ProfileSwitcher extends Vue {

	@Prop()
	public lightMode:boolean;

	public nextProfile:ProfileData = null;
	public prevProfile:ProfileData = null;
	public hasProfile:boolean = false;
	public profiles:ProfileData[] = null;

	public mounted():void {
		if(this.$store.state.initComplete) {
			this.loadProfiles();
		}
	}

	public beforeDestroy():void {
		
	}

	@Watch("$store.state.initComplete")
	public async loadProfiles():Promise<void> {
		let res;
		try {
			res = await Api.get("private/profile/list");
		}catch(e) {
			return;
		}
		if(res.profiles && res.profiles.length > 1) {
			this.profiles = res.profiles;
			this.hasProfile = true;
			let dns = document.location.hostname;
			// dns = "protopotes.durss.fr";
			// dns = "pogscience.durss.fr";
			// console.log(this.profiles);
			for (let i = 0; i < this.profiles.length; i++) {
				const p = this.profiles[i];
				if(p.domains.indexOf(dns) > -1) {
					if(p.nextProfile) {
						let sideProfile:ProfileData = this.profiles.find(v => v.id === p.nextProfile);
						// console.log(sideProfile);
						this.nextProfile = sideProfile;
					}
					if(p.prevProfile) {
						let sideProfile:ProfileData = this.profiles.find(v => v.id === p.prevProfile);
						this.prevProfile = sideProfile;
					}
				}
			}
		}
	}
}

export interface ProfileData {
	domains:string[];
	id:string;
	title?:string;
	prevProfile?:string;
	nextProfile?:string;
}
</script>

<style scoped lang="less">
.profileswitcher{
}
</style>