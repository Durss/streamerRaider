<template>
	<div class="viewersrating">
		<Button type="checkbox" title="Activer" class="toggle" v-model="enabled" />


		<div :class="formClasses">
			<div class="description">Cet outil permet de vous alerter si une personne considérée comme toxique se trouve dans votre chat.</div>

		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useMainStore } from "@/store";
import Button from "../Button.vue";

const store = useMainStore();
const enabled = ref(false);

const formClasses = computed(() => {
	let res = ["form"];
	if(!enabled.value) res.push("disabled");
	return res;
});

onMounted(() => {
	if(store.botToxicEnabled) {
		enabled.value = true;
	}
});

watch(enabled, () => {
	store.setBotToxicEnabled(enabled.value);
});
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