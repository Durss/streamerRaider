<template>
	<div class="mainloader">
		<div class="loader">
			<img src="@/assets/loader/loader.svg">
			<div class="label">...chargement des chaînes...</div>
		</div>
	</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="less">
.mainloader{
	.center();
	position: absolute;
	img {
		width: 100px;
		height: 100px;
	}
	.label {
		color: @mainColor_light;
		font-family: "Nunito light";
		font-size: 16px;
		margin-top: 15px;
	}
}
</style>