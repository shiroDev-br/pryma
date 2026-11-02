<template>
  <div
    class="pv-card pv-thumb relative block aspect-video min-h-[6rem] w-full shrink overflow-hidden"
    aria-hidden="true"
  >
    <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon name="material-symbols:live-tv-outline-rounded" class="h-10 w-10 text-ink-muted/60" />
      <span class="text-sm font-medium text-ink-muted">
        Aperte OK em um canal para ver a prévia
      </span>
    </div>
  </div>

  <section class="pv-card shrink-0 p-4 lg:p-5" aria-hidden="true">
    <div class="flex items-center gap-4">
      <span class="pv-blank hidden h-12 w-[4.5rem] shrink-0 rounded-lg lg:block" />
      <span class="hidden h-9 w-px shrink-0 bg-white/12 lg:block" />
      <div class="min-w-0 flex-1">
        <span class="pv-blank block h-4 w-3/5 rounded" />
        <span class="pv-blank mt-2 block h-3 w-2/5 rounded" />
      </div>
    </div>

    <div class="mt-4 flex items-center gap-4">
      <span class="h-1.5 flex-1 rounded-full bg-white/10" />
      <span class="pv-blank block h-3 w-20 rounded" />
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <span class="inline-flex h-11 items-center gap-2 rounded-full bg-blue-dark/25 px-3 text-sm font-semibold text-ink/40 lg:px-6">
        <Icon name="material-symbols:play-arrow-rounded" class="h-5 w-5" />
        Assistir agora
      </span>
      <span class="inline-flex h-11 items-center gap-2 rounded-full border border-line/60 bg-elevated/40 px-5 text-sm font-medium text-ink/40">
        <Icon name="material-symbols:star-outline-rounded" class="h-5 w-5" />
        Favoritar
      </span>
    </div>
  </section>

  <section class="pv-card flex min-h-[8rem] flex-1 shrink-0 flex-col p-4 lg:p-5" aria-hidden="true">
    <div class="flex shrink-0 items-center gap-3">
      <Icon name="material-symbols:calendar-month-outline-rounded" class="h-6 w-6 text-ink-muted" />
      <h2 class="flex-1 text-[1.05rem] font-medium text-ink">Programação</h2>
      <Icon name="material-symbols:chevron-right-rounded" class="h-6 w-6 text-ink-muted" />
    </div>
    <ul class="mt-3">
      <li
        v-for="row in 4"
        :key="row"
        class="flex items-center gap-4 border-t border-white/[0.06] px-3 py-3 first:border-t-0"
      >
        <span class="pv-blank block h-3 w-12 shrink-0 rounded" />
        <span class="pv-blank block h-3 rounded" :style="{ width: `${[55, 40, 62, 48][row - 1]}%` }" />
      </li>
    </ul>
  </section>
</template>
