<template>
  <div class="yt-screen">
    <header class="yt-screen__header" data-spatial-chrome>
      <div class="yt-screen__brand">
        <Icon :name="section.brand.icon" class="yt-screen__brand-icon" aria-hidden="true" />
        <span>{{ section.brand.label }}</span>
      </div>

      <nav class="yt-screen__tabs" :aria-label="`Sub-abas de ${section.brand.label}`">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="yt-screen__tab"
          :class="{ 'yt-screen__tab--active': tab.id === activeTab.id }"
          :aria-current="tab.id === activeTab.id ? 'page' : undefined"
          :data-nav="`yt-tab-${tab.id}`"
          @click="selectTab(tab.id)"
        >
          <Icon :name="tab.icon" class="h-5 w-5" aria-hidden="true" />
          {{ tab.label }}
        </button>
      </nav>

      <NuxtLink to="/" class="yt-screen__home" data-nav="yt-home" aria-label="Voltar pra home">
        <Icon name="material-symbols:home-rounded" class="h-5 w-5" aria-hidden="true" />
        <span>Home</span>
      </NuxtLink>
    </header>

    <!-- Player (playlist da grade ou vídeo do feed) -->
    <YoutubePlayer v-if="selected" :key="selected.id" :entry="selected" @back="backToList" />

    <!-- O feed fica montado (escondido) enquanto o vídeo toca: voltar não
         recarrega a lista nem perde a rolagem. -->
    <main v-show="!selected" class="yt-screen__body" data-yt-scroll>
      <ClientOnly v-if="activeTab.kind === 'feed'">
        <YoutubeFeed
          :query="feedQuery"
          :category="feedCategory"
          :fixed-category="section.feed.fixedCategory"
          :search-placeholder="section.feed.searchPlaceholder"
          @update:query="setFeedQuery"
          @update:category="setFeedCategory"
          @play="playVideo"
        />
      </ClientOnly>

      <template v-else>
        <section v-for="group in entryGroups" :key="group.label" class="yt-screen__group">
          <h2 class="yt-screen__title">{{ group.label }}</h2>
          <div class="yt-screen__grid" role="list" @keydown="stopAtRowEdge">
            <button
              v-for="entry in group.entries"
              :key="entry.id"
              type="button"
              class="yt-card"
              role="listitem"
              :data-nav="`yt-entry-${entry.id}`"
              @click="openEntry(entry)"
            >
              <span class="yt-card__thumb">
                <img :src="coverUrl(entry)" alt="" loading="lazy" />
                <span class="yt-card__kind">
                  <Icon
                    :name="entry.kind === 'playlist' ? 'material-symbols:playlist-play-rounded' : 'material-symbols:smart-display-rounded'"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                  {{ entry.kind === 'playlist' ? 'Playlist' : 'Vídeo' }}
                </span>
                <span v-if="!entry.embeddable" class="yt-card__external">
                  <Icon name="material-symbols:open-in-new-rounded" class="h-4 w-4" aria-hidden="true" />
                  Abre no YouTube
                </span>
              </span>
              <span class="yt-card__title">{{ entry.title }}</span>
              <span class="yt-card__channel">{{ entry.channel }}</span>
            </button>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script lang="ts" src="./YoutubeScreen.ts"></script>

<style scoped src="./YoutubeScreen.css"></style>
