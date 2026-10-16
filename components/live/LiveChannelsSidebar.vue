<template>
  <!-- Coluna 1: busca + atalhos -->
  <aside class="live-panel hidden min-h-0 flex-col p-4 xl:flex" aria-label="Atalhos de canais">
    <label class="search-box flex h-12 shrink-0 items-center gap-3 px-4 focus-within:shadow-focus">
      <Icon name="material-symbols:search-rounded" class="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
      <input
        :value="query"
        type="search"
        inputmode="search"
        autocomplete="off"
        maxlength="100"
        placeholder="Buscar canais…"
        aria-label="Buscar canais"
        class="min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        data-nav="search"
        @input="onQueryInput"
      />
      <button
        v-if="query"
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:text-ink focus:outline-none focus-visible:shadow-focus"
        aria-label="Limpar busca"
        tabindex="-1"
        @click="emit('clear')"
      >
        <Icon name="material-symbols:close-rounded" class="h-4 w-4" aria-hidden="true" />
      </button>
    </label>

    <!-- Grupo atual (reflete a aba ativa) -->
    <button
      type="button"
      class="group-row mt-4 flex h-[3.4rem] w-full shrink-0 items-center gap-3.5 px-4 text-left text-ink focus:outline-none focus-visible:shadow-focus"
      data-nav="sidebar"
      @click="emit('focus-first')"
    >
      <Icon name="material-symbols:tv-gen-outline-rounded" class="h-6 w-6 shrink-0" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate text-[1rem] font-semibold">{{ label }}</span>
      <span class="shrink-0 text-[0.95rem] font-medium tabular-nums">{{ countFormatter.format(count) }}</span>
      <Icon name="material-symbols:chevron-right-rounded" class="h-6 w-6 shrink-0" aria-hidden="true" />
    </button>

    <div ref="sideEl" class="rail-scroll mt-1 min-h-0 flex-1 overflow-y-auto pr-1" role="list">
      <!-- Categorias expansíveis -->
      <div v-for="group in groups" :key="group.name" class="space-y-1">
        <button
          type="button"
          class="w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-fast border-line bg-surface/70 hover:border-blue-dark/60 hover:bg-elevated/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/50"
          :class="{ 'bg-blue/15 border-blue/50': activeSlug === group.slug }"
          @click="selectGroup(group)"
          :aria-expanded="isExpanded(group.name)"
          data-nav="sidebar"
        >
          <Icon
            :name="isExpanded(group.name) ? 'material-symbols:keyboard-arrow-up' : 'material-symbols:keyboard-arrow-down'"
            class="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-fast"
            aria-hidden="true"
          />
          <Icon name="material-symbols:live-tv" class="h-5 w-5 shrink-0" :class="activeSlug === group.slug ? 'text-blue-light' : 'text-blue'" aria-hidden="true" />
          <span class="min-w-0 truncate text-sm font-semibold" :class="activeSlug === group.slug ? 'text-blue-light' : ''">{{ group.name }}</span>
          <span class="shrink-0 text-[0.7rem] text-ink-muted/70 flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-full text-[0.65rem] font-medium" :class="activeSlug === group.slug ? 'bg-blue/25 text-blue-light' : 'bg-blue/10 text-blue'">
              {{ group.channels.length }}
            </span>
          </span>
        </button>

        <Transition name="slide">
          <div v-show="isExpanded(group.name)" class="space-y-1 pl-4 border-l border-white/5 ml-2">
            <div v-for="channel in group.channels" :key="channel.id" class="space-y-1">
              <!-- Canal -->
              <button
                type="button"
                class="w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-fast border-line bg-surface/50 hover:border-blue-dark/60 hover:bg-elevated/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/50"
                @click="toggleGuide(channel.id)"
                :class="{ 'bg-blue/10 border-blue/60': selectedId === channel.id }"
                :aria-expanded="isGuideExpanded(channel.id)"
                data-nav="sidebar"
                :data-channel-id="channel.id"
              >
                <Icon
                  :name="isGuideExpanded(channel.id) ? 'material-symbols:keyboard-arrow-up' : 'material-symbols:keyboard-arrow-down'"
                  class="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-fast"
                  aria-hidden="true"
                />
                <img
                  v-if="channel.logoUrl"
                  :src="channel.logoUrl"
                  alt=""
                  class="h-7 w-7 shrink-0 object-contain rounded-sm bg-elevated"
                  loading="lazy"
                  aria-hidden="true"
                />
                <div v-else class="h-7 w-7 shrink-0 flex items-center justify-center rounded-sm bg-elevated" aria-hidden="true">
                  <Icon name="material-symbols:live-tv" class="h-4 w-4 text-blue-dark" />
                </div>
                <span class="min-w-0 truncate text-sm font-medium">{{ channel.title }}</span>
                <Icon name="material-symbols:play-arrow-rounded" class="h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
              </button>

              <!-- Guia/Programação do canal (expande pra baixo) -->
              <Transition name="slide">
                <div v-show="isGuideExpanded(channel.id)" class="space-y-1 pl-4 border-l border-white/5 ml-1">
                  <ChannelGuide
                    :channel-id="channel.id"
                    :channel="channel"
                    @pick-channel="emit('pick', $event)"
                  />
                </div>
              </Transition>
            </div>
          </div>
        </Transition>
      </div>

      <div ref="sideSentinel" class="h-16" aria-hidden="true" />
    </div>
  </aside>
</template>

<script lang="ts" src="./LiveChannelsSidebar.ts"></script>

<style scoped src="./LiveChannelsSidebar.css"></style>
