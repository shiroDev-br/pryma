<template>
  <div class="mtv-screen relative min-h-dvh bg-black text-ink">
    <!-- Scanlines decorativas (fundo) -->
    <div class="mtv-screen__scanlines" aria-hidden="true" />

    <!-- Header (após abertura) — só logo + voltar pra home -->
    <header v-if="phase !== 'opening'" class="mtv-screen__header">
      <div class="mtv-screen__logo">MTV</div>
      <NuxtLink to="/" class="mtv-screen__home" data-nav="mtv-home" aria-label="Voltar pra home">
        <Icon name="material-symbols:home-rounded" class="h-5 w-5" aria-hidden="true" />
        <span>Home</span>
      </NuxtLink>
    </header>

    <!-- Fase 1: abertura -->
    <MtvOpening v-if="phase === 'opening'" @done="finishOpening" />

    <!-- Fase 2: escolha de playlist -->
    <MtvPlaylistPicker
      v-else-if="phase === 'picker'"
      :playlists="playlists"
      :loading="isLoading"
      :error="pickerError"
      @select="selectPlaylist"
      @retry="refresh"
    />

    <!-- Fase 3: player + tracklist -->
    <MtvPlayer
      v-else-if="phase === 'playing' && selected"
      :key="selected.id"
      :playlist="selected"
      @back="backToPicker"
    />
  </div>
</template>

<script lang="ts" src="./MtvScreen.ts"></script>

<style scoped src="./MtvScreen.css"></style>
