<template>
  <div class="mtv-opening fixed inset-0 z-50 flex items-center justify-center bg-black">
    <video
      ref="videoEl"
      class="mtv-opening__video"
      :src="openingSrc"
      playsinline
      autoplay
      @ended="finish"
    />


    <div class="mtv-opening__actions">
      <button
        type="button"
        class="mtv-btn mtv-btn--ghost"
        data-nav="opening-sound"
        @click="toggleSound"
      >
        <Icon
          :name="muted ? 'material-symbols:volume-off-rounded' : 'material-symbols:volume-up-rounded'"
          class="h-5 w-5"
          aria-hidden="true"
        />
        <span>{{ muted ? 'Som' : 'Mudo' }}</span>
      </button>
      <button type="button" class="mtv-btn mtv-btn--primary" data-nav="opening-skip" @click="finish">
        Pular
        <Icon name="material-symbols:skip-next-rounded" class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script lang="ts" src="./MtvOpening.ts"></script>

<style scoped src="./MtvOpening.css"></style>
