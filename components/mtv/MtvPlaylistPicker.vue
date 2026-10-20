<template>
  <div class="mtv-picker">
    <div class="mtv-picker__inner">
      <header class="mtv-picker__header">
        <h2 class="mtv-picker__title">Escolha sua playlist</h2>
        <p class="mtv-picker__subtitle">O modo aleatório está ativo — os clipes tocam em ordem embaralhada.</p>
      </header>

      <!-- Carregando -->
      <div v-if="loading" class="mtv-picker__status" role="status">
        <Icon name="material-symbols:progress-activity-rounded" class="mtv-picker__spinner" aria-hidden="true" />
        Carregando playlists…
      </div>

      <!-- Erro -->
      <div v-else-if="error" class="mtv-picker__status mtv-picker__status--error" role="alert">
        <Icon name="material-symbols:error-outline-rounded" class="h-8 w-8" aria-hidden="true" />
        <p>{{ error }}</p>
        <button type="button" class="mtv-picker__retry" data-nav="picker-retry" @click="emit('retry')">
          Tentar novamente
        </button>
      </div>

      <!-- Lista de playlists -->
      <div v-else class="mtv-picker__grid" role="list">
        <button
          v-for="playlist in playlists"
          :key="playlist.id"
          type="button"
          class="mtv-picker__card"
          role="listitem"
          :data-nav="`picker-${playlist.id}`"
          @click="emit('select', playlist)"
        >
          <span class="mtv-picker__card-era" aria-hidden="true">{{ eraLabel(playlist.name) }}</span>
          <span class="mtv-picker__card-name">{{ playlist.name }}</span>
          <span class="mtv-picker__card-desc">{{ playlist.description }}</span>
          <span class="mtv-picker__card-count">
            <Icon name="material-symbols:music-note-rounded" class="h-4 w-4" aria-hidden="true" />
            {{ playlist.clipCount }} clipes
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" src="./MtvPlaylistPicker.ts"></script>

<style scoped src="./MtvPlaylistPicker.css"></style>
