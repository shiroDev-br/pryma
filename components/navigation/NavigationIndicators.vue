<template>
  <div
    class="flex items-center justify-center gap-2"
    role="tablist"
    :aria-label="label"
  >
    <button
      v-for="(dot, index) in dots"
      :key="dot"
      type="button"
      role="tab"
      class="rounded-full transition-all duration-normal"
      :class="
        index === activeIndex
          ? 'h-1.5 w-6 bg-blue shadow-[0_0_10px_rgba(11,92,255,0.5)]'
          : 'h-1.5 w-1.5 bg-ink-muted/30 hover:bg-blue-dark/70'
      "
      :aria-selected="index === activeIndex"
      :aria-label="`Ir para o item ${index + 1}`"
      @click="emit('select', index)"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    count: number;
    activeIndex: number;
    label?: string;
  }>(),
  { label: 'Itens' },
);

const emit = defineEmits<{
  select: [index: number];
}>();

const dots = computed(() => Array.from({ length: props.count }, (_, index) => index));
</script>
