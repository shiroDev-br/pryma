<template>
  <!-- Coluna 1: voltar + busca + grupos -->
  <aside
    ref="rootEl"
    class="live-panel flex min-h-0 flex-col p-3 xl:p-4"
    aria-label="Grupos de canais"
  >
    <div class="flex shrink-0 items-center gap-3">
    <button
      type="button"
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface/70 text-ink-muted transition-colors duration-fast hover:border-blue/50 hover:text-ink focus:outline-none focus-visible:shadow-focus"
      aria-label="Voltar"
      data-nav="back"
      @click="emit('back')"
    >
      <Icon name="material-symbols:arrow-back-rounded" class="h-5 w-5" aria-hidden="true" />
    </button>

    <label class="search-box flex h-12 min-w-0 flex-1 items-center gap-2 px-3 focus-within:shadow-focus xl:gap-3 xl:px-4">
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
    </div>

    <!-- Grupos — abrir um grupo leva os canais dele pra coluna do meio. -->
    <div ref="sideEl" class="rail-scroll mt-4 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1" role="list">
      <button
        v-for="group in groups"
        :key="group.slug"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/50"
        :class="
          activeSlug === group.slug
            ? 'border-blue/50 bg-blue/15'
            : 'border-line bg-surface/70 hover:border-blue-dark/60 hover:bg-elevated/60'
        "
        :aria-current="activeSlug === group.slug ? 'true' : undefined"
        data-nav="sidebar"
        :data-group="group.slug"
        role="listitem"
        @click="emit('select', group.slug)"
      >
        <Icon
          :name="group.icon"
          class="h-5 w-5 shrink-0"
          :class="group.slug === FAVORITES_SLUG ? 'text-[#ffc94d]' : activeSlug === group.slug ? 'text-blue-light' : 'text-blue'"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-1 truncate text-sm font-semibold" :class="activeSlug === group.slug ? 'text-blue-light' : 'text-ink'">
          {{ group.name }}
        </span>
        <span
          v-if="group.total !== null"
          class="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium tabular-nums"
          :class="activeSlug === group.slug ? 'bg-blue/25 text-blue-light' : 'bg-blue/10 text-blue'"
        >
          {{ countFormatter.format(group.total) }}
        </span>
        <Icon name="material-symbols:chevron-right-rounded" class="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
      </button>
    </div>
  </aside>
</template>

<script lang="ts" src="./LiveChannelsSidebar.ts"></script>

<style scoped src="./LiveChannelsSidebar.css"></style>
