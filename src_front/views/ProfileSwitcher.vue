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
export interface ProfileData {
	domains:string[];
	id:string;
	title?:string;
	prevProfile?:string;
	nextProfile?:string;
}
</script>

<script setup lang="ts">
import ProfileNavButton from "@/components/ProfileNavButton.vue";
import Api from "@/utils/Api";
import { onMounted, ref, watch } from "vue";
import { useMainStore } from "@/store";

defineProps<{
	lightMode?:boolean;
}>();

const store = useMainStore();

const nextProfile = ref<ProfileData>(null);
const prevProfile = ref<ProfileData>(null);
const hasProfile = ref(false);
const profiles = ref<ProfileData[]>(null);

onMounted(() => {
	if(store.initComplete) {
		loadProfiles();
	}
});

watch(() => store.initComplete, () => loadProfiles());

async function loadProfiles():Promise<void> {
	let res;
	try {
		res = await Api.get("private/profile/list");
	}catch(e) {
		return;
	}
	if(res.profiles && res.profiles.length > 1) {
		profiles.value = res.profiles;
		hasProfile.value = true;
		let dns = document.location.hostname;
		// dns = "protopotes.durss.fr";
		// dns = "pogscience.durss.fr";
		// console.log(profiles.value);
		for (let i = 0; i < profiles.value.length; i++) {
			const p = profiles.value[i];
			if(p.domains.indexOf(dns) > -1) {
				if(p.nextProfile) {
					let sideProfile:ProfileData = profiles.value.find(v => v.id === p.nextProfile);
					// console.log(sideProfile);
					nextProfile.value = sideProfile;
				}
				if(p.prevProfile) {
					let sideProfile:ProfileData = profiles.value.find(v => v.id === p.prevProfile);
					prevProfile.value = sideProfile;
				}
			}
		}
	}
}
</script>

<style scoped lang="less">
.profileswitcher{
}
</style>