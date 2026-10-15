<template>
  <div
    class="relative flex flex-col rounded-lg border p-8 transition-colors duration-normal"
    :class="
      isPopular
        ? 'border-blue-dark bg-elevated shadow-card'
        : 'border-line/70 bg-surface hover:border-blue-dark/60'
    "
  >
    <div v-if="isPopular" class="absolute -top-3 left-1/2 -translate-x-1/2">
      <span class="rounded-full bg-blue px-3 py-1 text-xs font-semibold text-bg">
        Mais popular
      </span>
    </div>

    <div>
      <h3 class="mb-4 text-2xl font-bold text-ink">{{ plan.name }}</h3>
      <div class="mb-6 text-3xl font-bold text-ink">
        ${{ plan.price }}
        <span class="text-base font-normal text-ink-muted">/mês</span>
      </div>
      <ul class="mb-8 space-y-4">
        <li v-for="(feature, index) in plan.features" :key="index" class="flex items-center">
          <Icon name="material-symbols:check-circle-outline" class="mr-2 h-5 w-5 text-blue" />
          <span class="text-sm text-ink-muted">{{ feature }}</span>
        </li>
      </ul>
    </div>

    <div class="mt-auto">
      <button
        type="button"
        class="w-full rounded-sm px-6 py-3 font-semibold transition-colors duration-fast"
        :class="
          isPopular
            ? 'bg-blue text-bg hover:bg-blue-light'
            : 'border border-blue-dark bg-transparent text-blue hover:bg-elevated'
        "
      >
        Começar agora
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Plan {
  name: string;
  price: number;
  features: string[];
}

defineProps<{
  plan: Plan;
  isPopular?: boolean;
}>();
</script>
