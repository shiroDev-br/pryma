<template>
  <div class="yt-feed">
    <form class="yt-feed__search" role="search" @submit.prevent="submitSearch">
      <Icon name="material-symbols:search-rounded" class="yt-feed__search-icon" aria-hidden="true" />
      <input
        v-model="draft"
        type="search"
        class="yt-feed__search-input"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
        enterkeyhint="search"
        maxlength="100"
        data-nav="yt-search"
      />
      <button
        v-if="query"
        type="button"
        class="yt-feed__search-clear"
        aria-label="Limpar busca"
        data-nav="yt-search-clear"
        @click="clearSearch"
      >
        <Icon name="material-symbols:close-rounded" class="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="submit" class="yt-feed__search-go" data-nav="yt-search-go">Buscar</button>
    </form>

    <div v-if="!query && showCategories" class="yt-feed__chips" role="tablist" aria-label="Categorias" @keydown="onChipsKeydown">
      <button
        v-for="cat in categories"
        :key="cat.id ?? 'all'"
        type="button"
        role="tab"
        class="yt-feed__chip"
        :class="{ 'yt-feed__chip--active': cat.id === category }"
        :aria-selected="cat.id === category"
        :data-nav="`yt-cat-${cat.id ?? 'all'}`"
        @click="emit('update:category', cat.id)"
      >
        {{ cat.label }}
      </button>
    </div>
    <p v-else-if="query" class="yt-feed__results">Resultados para “{{ query }}”</p>

    <!-- Primeira página -->
    <div v-if="isPending" class="yt-feed__status" role="status">
      <Icon name="svg-spinners:ring-resize" class="h-10 w-10" aria-hidden="true" />
    </div>

    <div v-else-if="error && !items.length" class="yt-feed__status yt-feed__status--error" role="alert">
      <Icon name="material-symbols:error-outline-rounded" class="h-10 w-10" aria-hidden="true" />
      <p>{{ error.message }}</p>
      <button type="button" class="yt-feed__retry" data-nav="yt-feed-retry" @click="refresh">Tentar novamente</button>
    </div>

    <div v-else-if="status === 'success' && !items.length" class="yt-feed__status" role="status">
      <Icon name="material-symbols:search-off-rounded" class="h-10 w-10" aria-hidden="true" />
      <p>Nenhum vídeo encontrado.</p>
    </div>

    <template v-else>
      <div class="yt-feed__grid" role="list" @keydown="stopAtRowEdge">
        <button
          v-for="video in items"
          :key="video.videoId"
          type="button"
          class="yt-card"
          role="listitem"
          :data-nav="`yt-video-${video.videoId}`"
          @click="play(video)"
        >
          <span class="yt-card__thumb">
            <img :src="youtubeCardThumb(video.thumbnailUrl)" alt="" loading="lazy" decoding="async" />
            <span v-if="video.durationSec" class="yt-card__kind tabular-nums">{{ formatDuration(video.durationSec) }}</span>
          </span>
          <span class="yt-card__title">{{ video.title }}</span>
          <span class="yt-card__channel">
            {{ video.channelTitle }}
            <template v-if="video.viewCount !== null"> · {{ formatViews(video.viewCount) }}</template>
            <template v-if="video.publishedAt"> · {{ formatAge(video.publishedAt) }}</template>
          </span>
        </button>
      </div>

      <!-- Em alta: rolagem infinita. Busca: botão (cada página gasta 100 de cota). -->
      <div v-if="hasNext && !error && !query" ref="sentinelEl" class="yt-feed__sentinel" aria-hidden="true" />
      <div v-if="isLoading" class="yt-feed__more" role="status">
        <Icon name="svg-spinners:ring-resize" class="h-6 w-6" aria-hidden="true" />
      </div>
      <div v-else-if="error" class="yt-feed__more" role="alert">
        <span>{{ error.message }}</span>
        <button type="button" class="yt-feed__retry" data-nav="yt-feed-more-retry" @click="loadMore">
          Tentar novamente
        </button>
      </div>
      <div v-else-if="hasNext && query" class="yt-feed__more">
        <button type="button" class="yt-feed__retry" data-nav="yt-feed-more" @click="loadMore">Mais resultados</button>
      </div>
    </template>
  </div>
</template>

<script lang="ts" src="./YoutubeFeed.ts"></script>

<style scoped src="./YoutubeFeed.css"></style>
