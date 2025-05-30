<template>
  <main class="app">
    <player-test />
  </main>
</template>

<script setup lang="ts">
  import PlayerTest from '@/components/PlayerTest.vue';
</script>

<style>
  .app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
