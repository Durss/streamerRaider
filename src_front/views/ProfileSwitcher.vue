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
	public profiles:{domains:string[], profile:string}[] = null;

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
		if(res.profiles) {
			this.profiles = res.profiles;
			this.hasProfile = true;
			let dns = document.location.hostname;
			// dns = "protopotes.durss.fr";
			// dns = "pogscience.durss.fr";
			let currentIndex = -1;
			let list:Profile[] = [];
			let tld = null;
			//Search for current domain on available profiles
			// for (const p in this.profiles) {
			// 	//Remove "localhost" profile if not testing locally
			// 	if(dns.indexOf("localhost") == -1 && p.indexOf("localhost") > -1) continue;
			// 	let reg = p.replace(/(\.|\/|\?)/gi, "\\$1").replace(/\*/gi, "(.*)");
			// 	if(!tld && RegExp(reg, "gi").test(dns)) {
			// 		tld = dns.replace(RegExp(reg, "gi"), "$1");;
			// 	}
			// 	list.push({
			// 		dns:p,
			// 		url: "",
			// 		name:this.profiles[p],
			// 		icon: require("@/assets/logos/"+this.profiles[p]+".png")
			// 	});
			// 	if(RegExp(p.replace(/(\.|\/|\?)/gi, "\\$1"), "gi").test(dns)) {
			// 		currentIndex = list.length - 1;
			// 	}
			// }
			for (let i = 0; i < this.profiles.length; i++) {
				const p = this.profiles[i];
				let minDist:number = 99999;
				let closestDNS:string = null;
				//Remove "localhost" profile if not testing locally
				if(dns.indexOf("localhost") == -1 && p.domains.indexOf("localhost") > -1) continue;

				list.push({
					dns:p.domains[0],
					url: "",
					name:p.profile,
					icon: require("@/assets/logos/"+p.profile+".png")
				});
				if(p.domains.indexOf(dns) > -1) {
					currentIndex = list.length - 1;
				}
			}

			let route = this.$route.path;
			list.forEach((p, i) => {
				p.url = "https://"+p.dns.replace("*", tld) + route;
			});

			// currentIndex = 1;//Local debug

			//Get prev profile
			if(currentIndex > 0) this.prevProfile = list[currentIndex-1];
			//Get next profile
			if(currentIndex < list.length-1) this.nextProfile = list[currentIndex+1];
		}
	}
}

export interface Profile {
	dns:string;
	url:string;
	name:string;
	icon:string;
}
</script>

<style scoped lang="less">
.profileswitcher{
}
</style>