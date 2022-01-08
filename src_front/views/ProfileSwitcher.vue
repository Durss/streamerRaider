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
import Utils from "@/utils/Utils";
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";

@Component({
	components:{
		Button,
		ProfileNavButton,
	}
})
export default class ProfileSwitcher extends Vue {

	@Prop()
	public lightMode:boolean;

	public nextProfile:Profile = null;
	public prevProfile:Profile = null;
	public hasProfile:boolean = false;
	public profiles:ServerProfile[] = null;

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
			console.log(this.profiles);
			let route = this.$route.path;
			for (let i = 0; i < this.profiles.length; i++) {
				const p = this.profiles[i];
				if(p.domains.indexOf(dns) > -1) {
					if(p.nextProfile) {
						let sideProfile:ServerProfile = this.profiles.find(v => v.profile === p.nextProfile);
						console.log(sideProfile);
						this.nextProfile = {
							dns:sideProfile.domains[0],
							url: "https://"+sideProfile.domains[0] + route,
							name:sideProfile.profile,
							icon: "/logos/"+sideProfile.profile+".png"
						};
					}
					if(p.prevProfile) {
						let sideProfile:ServerProfile = this.profiles.find(v => v.profile === p.prevProfile);
						this.prevProfile = {
							dns:sideProfile.domains[0],
							url: "https://"+sideProfile.domains[0] + route,
							name:sideProfile.profile,
							icon: "/logos/"+sideProfile.profile+".png"
						};
					}
				}
			}
		}
	}
}

export interface Profile {
	dns:string;
	url:string;
	name:string;
	icon:string;
}

export interface ServerProfile {
	domains:string[];
	profile:string;
	prevProfile?:string;
	nextProfile?:string;
}
</script>

<style scoped lang="less">
.profileswitcher{
}
</style>