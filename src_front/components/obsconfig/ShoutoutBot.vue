<template>
	<div class="shoutoutbot">
		<Button type="checkbox" title="Activer" class="toggle" v-model="enabled" />

		<div :class="formClasses">
			<div class="row">
				<label for="command">Commande :</label>
				<input type="text" id="command" v-model="command">
			</div>

			<div class="row">
				<label for="text">Message :</label>
				<textarea id="text" v-model="text" rows="4"></textarea>

				<div class="fallback">
					<Button type="checkbox" class="toggle" v-model="botDescriptionFallback" name="botDescriptionFallback" />
					<label for="botDescriptionFallback">Si la personne n'a pas renseigné de description sur le Raider, afficher la description de sa chaîne twitch à la place.</label>
				</div>
			</div>

			<div class="row roles">
				<label for="text">Rôles autorisés :</label>
				<div class="role">
					<Button type="checkbox" class="toggle" v-model="botRoleModerators" name="botRoleModerators" />
					<label for="botRoleModerators">Modérateurs/trices</label>
				</div>
				<div class="role">
					<Button type="checkbox" class="toggle" v-model="botRoleVIP" name="botRoleVIP" />
					<label for="botRoleVIP">VIPs</label>
				</div>
				<div class="role">
					<Button type="checkbox" class="toggle" v-model="botRoleViewers" name="botRoleViewers" />
					<label for="botRoleViewers">Viewers</label>
				</div>
			</div>

			<Button title="Reset" highlight @click="reset()" />
		</div>

		<div class="infos"><sup>*</sup> : Le bot ne peut fonctionner que si cette page est présente dans un panneau OBS ou ouverte dans un onglet de navigateur !</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useMainStore } from "@/store";
import Button from "../Button.vue";

const store = useMainStore();

const enabled = ref(false);
const botDescriptionFallback = ref(false);
const command = ref("");
const text = ref("");
const botRoleModerators = ref(false);
const botRoleVIP = ref(false);
const botRoleViewers = ref(false);

const formClasses = computed(():string[] => {
	let res = ["form"]
	if(!enabled.value) res.push("disabled");
	return res;
});

onMounted(() => {
	if(store.botShoutoutEnabled) {
		enabled.value = true;
	}

	//Prefill form from store
	command.value = store.botCommand;
	text.value = store.botText;
	botDescriptionFallback.value = store.botDescriptionFallback;
	let roles = store.botRoles;
	botRoleModerators.value = roles.includes("moderator");
	botRoleVIP.value = roles.includes("vip");
	botRoleViewers.value = roles.includes("viewer");
});

watch(enabled, () => store.setBotShoutoutEnabled(enabled.value));
watch(command, () => store.setBotCommand(command.value));
watch(text, () => store.setBotText(text.value));
watch(botDescriptionFallback, () => store.setBotDescriptionFallback(botDescriptionFallback.value));
watch(botRoleModerators, () => updateRolesList());
watch(botRoleVIP, () => updateRolesList());
watch(botRoleViewers, () => updateRolesList());

function reset():void {
	store.resetBotConfig();
	command.value = store.botCommand;
	text.value = store.botText;
	botDescriptionFallback.value = store.botDescriptionFallback;
	let roles = store.botRoles;
	botRoleModerators.value = roles.includes("moderator");
	botRoleVIP.value = roles.includes("vip");
	botRoleViewers.value = roles.includes("viewer");
}

/**
 * Called anytime a role is checked or unchecked
 */
function updateRolesList():void {
	let roles = [];
	if(botRoleModerators.value) roles.push("moderator");
	if(botRoleVIP.value) roles.push("vip");
	if(botRoleViewers.value) roles.push("viewer");
	store.setBotRoles(roles);
}
</script>

<style scoped lang="less">
.shoutoutbot{
	font-size: 16px;
	.toggle {
		margin: 10px 0;
	}

	.form {
		transition: opacity 0.2s;
		&.disabled {
			pointer-events: none;
			opacity: .25;
		}
		.row {
			display: flex;
			flex-direction: column;
			margin-bottom: 15px;
			width: 100%;
			label {
				text-align: left;
				font-size: 16px;
				margin-right: 10px;
				display: inline-block;
			}
			input {
				margin-left: 10px;
			}
			textarea {
				margin-left: 10px;
				min-width: calc(100% - 10px);
				max-width: calc(100% - 10px);
				max-height: 300px;
				box-sizing: border-box;
				font-size: 16px;
				font-family: "Futura";
			}

			.fallback {
				display: flex;
				flex-direction: row;
				align-items: flex-start;
				justify-content: flex-start;
				margin-left: 10px;
				margin-top: 10px;
				label {
					font-size: 13px;
					cursor: pointer;
				}
				.button {
					min-width: 30px;
					margin: 0;
				}
			}

			&.roles {
				.role {
					display: flex;
					flex-direction: row;
					align-items: center;
					justify-content: flex-start;
					label {
						margin: 0;
						font-size: 13px;
						cursor: pointer;
					}
					.button {
						margin: 0;
						margin-left: 10px;
					}
				}
			}
		}
	}

	.infos {
		text-align: left;
		font-size: 13px;
		margin-top: 10px;
		color: @mainColor_warn;
	}

}
</style>