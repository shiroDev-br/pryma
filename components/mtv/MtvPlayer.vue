<template>
  <div class="mtv-player">
    <!-- Coluna esquerda: player + controles -->
    <section class="mtv-player__stage">
      <div class="mtv-player__frame-box">
        <div class="mtv-player__frame-wrap">
          <div ref="frameEl" class="mtv-player__frame" aria-label="Player MTV" />

          <!-- Aviso de erro do player -->
          <div v-if="playerError" class="mtv-player__error" role="alert">
            <Icon name="material-symbols:error-outline-rounded" class="h-6 w-6" aria-hidden="true" />
            <span>{{ playerError }}</span>
          </div>

          <!-- Badge de atribuição YouTube (obrigatória — ToS) -->
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            class="mtv-player__yt-badge"
            data-nav="yt-badge"
          >
            <Icon name="logos:youtube" class="h-4 w-4" aria-hidden="true" />
            Conteúdo hospedado no YouTube
          </a>
        </div>
      </div>

      <!-- Erro da API do YouTube (falha ao carregar o script) -->
      <div v-if="!apiReady && apiError" class="mtv-player__api-error" role="alert">
        <Icon name="material-symbols:wifi-off-rounded" class="h-8 w-8" aria-hidden="true" />
        <p>{{ apiError }}</p>
        <button type="button" class="mtv-player__retry" data-nav="api-retry" @click="startPlayback(currentClip)">
          Tentar novamente
        </button>
      </div>

      <!-- Faixa de info + controles -->
      <div class="mtv-player__bar">
        <div class="mtv-player__now">
          <span class="mtv-player__badge-random">
            <Icon name="material-symbols:shuffle-rounded" class="h-3.5 w-3.5" aria-hidden="true" />
            Aleatório
          </span>
          <div class="mtv-player__meta">
            <p class="mtv-player__track-title">{{ currentClip?.title ?? '—' }}</p>
            <p class="mtv-player__track-artist">{{ currentClip?.artist ?? '' }}</p>
          </div>
          <span class="mtv-player__position tabular-nums">
            {{ currentIndex + 1 }} / {{ queue.length || total }}
          </span>
        </div>

        <div class="mtv-player__controls">
          <button type="button" class="mtv-player__ctl" aria-label="Anterior" data-nav="prev" @click="playPrev">
            <Icon name="material-symbols:skip-previous-rounded" class="h-6 w-6" aria-hidden="true" />
          </button>
          <button type="button" class="mtv-player__ctl mtv-player__ctl--main" :aria-label="isPlaying ? 'Pausar' : 'Tocar'" data-nav="toggle" @click="togglePlay">
            <Icon :name="isPlaying ? 'material-symbols:pause-rounded' : 'material-symbols:play-arrow-rounded'" class="h-8 w-8" aria-hidden="true" />
          </button>
          <button type="button" class="mtv-player__ctl" aria-label="Próximo" data-nav="next" @click="playNext">
            <Icon name="material-symbols:skip-next-rounded" class="h-6 w-6" aria-hidden="true" />
          </button>
          <button type="button" class="mtv-player__ctl mtv-player__ctl--accent" aria-label="Reembaralhar" data-nav="reshuffle" @click="reshuffle">
            <Icon name="material-symbols:shuffle-rounded" class="h-5 w-5" aria-hidden="true" />
          </button>
<button type="button" class="mtv-player__ctl mtv-player__ctl--fullscreen" aria-label="Tela cheia" data-fullscreen @click="toggleFullscreen">
  <Icon name="material-symbols:fullscreen-rounded" class="h-5 w-5" aria-hidden="true" />
</button>
<button type="button" class="mtv-player__ctl mtv-player__ctl--back" data-nav="back" @click="emit('back')">
  <Icon name="material-symbols:arrow-back-rounded" class="h-5 w-5" aria-hidden="true" />
  <span class="mtv-player__ctl-label">Trocar playlist</span>
</button>
        </div>
      </div>
    </section>

    <!-- Coluna direita: tracklist -->
    <aside class="mtv-player__list" aria-label="Faixas da playlist">
      <header class="mtv-player__list-header">
        <h3 class="mtv-player__list-title">{{ playlist.name }}</h3>
        <span class="mtv-player__list-count tabular-nums">{{ total }} faixas</span>
      </header>

      <!-- Carregando -->
      <div v-if="isPending" class="mtv-player__list-status" role="status">
        <Icon name="material-symbols:progress-activity-rounded" class="mtv-player__spinner" aria-hidden="true" />
        Carregando clipes…
      </div>

      <!-- Erro -->
      <div v-else-if="error" class="mtv-player__list-status mtv-player__list-status--error" role="alert">
        <Icon name="material-symbols:error-outline-rounded" class="h-6 w-6" aria-hidden="true" />
        <p>{{ error.message }}</p>
        <button type="button" class="mtv-player__retry" data-nav="clips-retry" @click="refresh">Tentar novamente</button>
      </div>

      <!-- Faixas (fila embaralhada) -->
      <ul v-else class="mtv-player__tracks" role="list">
        <li v-for="(clip, index) in queue" :key="clip.id">
          <button
            type="button"
            class="mtv-player__track"
            :class="{ 'mtv-player__track--active': index === currentIndex }"
            :data-nav="`track-${clip.id}`"
            :aria-current="index === currentIndex ? 'true' : undefined"
            @click="playAt(index)"
          >
            <img
              v-if="clip.thumbnailUrl"
              :src="clip.thumbnailUrl"
              alt=""
              loading="lazy"
              class="mtv-player__track-thumb"
              aria-hidden="true"
            />
            <div v-else class="mtv-player__track-thumb mtv-player__track-thumb--fallback" aria-hidden="true">
              <Icon name="material-symbols:music-note-rounded" class="h-4 w-4" />
            </div>
            <div class="mtv-player__track-info">
              <span class="mtv-player__track-name">{{ clip.title }}</span>
              <span class="mtv-player__track-sub">{{ clip.artist }}</span>
            </div>
            <span class="mtv-player__track-duration tabular-nums">{{ formatDuration(clip.durationSec) }}</span>
          </button>
        </li>
      </ul>

      <!-- Sentinela do infinite scroll -->
      <div v-if="hasNext && !error" ref="sentinelEl" class="mtv-player__sentinel" aria-hidden="true" />
      <p v-if="isLoading && !isPending" class="mtv-player__list-more">Carregando mais…</p>
    </aside>
  </div>
</template>

<script lang="ts" src="./MtvPlayer.ts"></script>

<style scoped src="./MtvPlayer.css"></style>
