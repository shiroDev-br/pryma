<template>
  <div class="yt-player">
    <div class="yt-player__frame-wrap">
      <div ref="frameEl" class="yt-player__frame" :aria-label="`Player: ${entry.title}`" />

      <div v-if="loading && !apiError" class="yt-player__overlay" role="status">
        <Icon name="svg-spinners:ring-resize" class="h-10 w-10" aria-hidden="true" />
      </div>

      <div v-if="apiError" class="yt-player__overlay yt-player__overlay--error" role="alert">
        <Icon name="material-symbols:error-outline-rounded" class="h-10 w-10" aria-hidden="true" />
        <p>{{ apiError }}</p>
        <button type="button" class="yt-player__pill" data-nav="yt-retry" @click="start">Tentar novamente</button>
      </div>

      <div v-else-if="playerError" class="yt-player__toast" role="alert">
        <Icon name="material-symbols:error-outline-rounded" class="h-5 w-5" aria-hidden="true" />
        {{ playerError }}
      </div>
    </div>

    <div class="yt-player__bar">
      <div class="yt-player__meta">
        <p class="yt-player__title">{{ videoTitle || entry.title }}</p>
        <p class="yt-player__sub">
          {{ subtitle }}
          <span v-if="position.total" class="tabular-nums"> · {{ position.index + 1 }} / {{ position.total }}</span>
        </p>
      </div>

      <div class="yt-player__controls">
        <button
          v-if="isPlaylist"
          type="button"
          class="yt-player__ctl"
          aria-label="Anterior"
          data-nav="yt-prev"
          @click="player.previous()"
        >
          <Icon name="material-symbols:skip-previous-rounded" class="h-6 w-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="yt-player__ctl yt-player__ctl--main"
          :aria-label="isPlaying ? 'Pausar' : 'Tocar'"
          data-nav="yt-toggle"
          @click="togglePlay"
        >
          <Icon
            :name="isPlaying ? 'material-symbols:pause-rounded' : 'material-symbols:play-arrow-rounded'"
            class="h-8 w-8"
            aria-hidden="true"
          />
        </button>
        <button
          v-if="isPlaylist"
          type="button"
          class="yt-player__ctl"
          aria-label="Próximo"
          data-nav="yt-next"
          @click="player.next()"
        >
          <Icon name="material-symbols:skip-next-rounded" class="h-6 w-6" aria-hidden="true" />
        </button>
        <button type="button" class="yt-player__ctl" aria-label="Tela cheia" data-fullscreen @click="toggleFullscreen">
          <Icon name="material-symbols:fullscreen-rounded" class="h-6 w-6" aria-hidden="true" />
        </button>
        <button type="button" class="yt-player__pill" data-nav="yt-back" @click="emit('back')">
          <Icon name="material-symbols:arrow-back-rounded" class="h-5 w-5" aria-hidden="true" />
          Voltar
        </button>
      </div>
    </div>

    <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" class="yt-player__credit" tabindex="-1">
      Conteúdo hospedado no YouTube
    </a>
  </div>
</template>

<script lang="ts" src="./YoutubePlayer.ts"></script>

<style scoped src="./YoutubePlayer.css"></style>
