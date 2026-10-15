<template>
  <div class="py-32 px-4">
    <div class="container mx-auto">
      <!-- Header Section -->
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h1 class="mb-6 text-4xl font-bold md:text-5xl">Escolha o plano ideal</h1>
        <p class="mb-8 text-xl text-ink-muted">
          Selecione o plano que melhor atende à sua casa. Troque ou cancele quando quiser.
        </p>

        <!-- Billing Toggle -->
        <div class="flex items-center justify-center gap-4 mb-12">
          <span :class="!isAnnual ? 'text-blue' : 'text-ink-muted'">Mensal</span>
          <button
            type="button"
            class="relative h-8 w-16 rounded-full transition-colors duration-normal"
            :class="isAnnual ? 'bg-blue-dark' : 'bg-elevated'"
            :aria-pressed="isAnnual"
            aria-label="Alternar ciclo de cobrança"
            @click="toggleBilling"
          >
            <div
              class="absolute top-1 h-6 w-6 rounded-full bg-ink transition-transform duration-normal"
              :class="isAnnual ? 'left-9' : 'left-1'"
            ></div>
          </button>
          <span :class="isAnnual ? 'text-blue' : 'text-ink-muted'">
            Anual
            <span class="ml-1 text-sm text-blue-dark">economize 20%</span>
          </span>
        </div>
      </div>

      <!-- Pricing Cards -->
      <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
        <PricingCard
          v-for="plan in currentPlans"
          :key="plan.name"
          :plan="plan"
          :is-popular="plan.popular"
        />
      </div>

      <!-- Comparison Table -->
      <div
        class="mx-auto max-w-6xl rounded-lg border border-line/70 bg-surface/60 p-8"
      >
        <h2 class="mb-8 text-center text-2xl font-bold">Compare os recursos</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-line">
                <th class="py-4 px-4 text-left">Recurso</th>
                <th
                  v-for="plan in plans.monthly"
                  :key="plan.name"
                  class="text-center py-4 px-4"
                >
                  {{ plan.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="feature in comparisonFeatures"
                :key="feature.name"
                class="border-b border-line/50"
              >
                <td class="py-4 px-4">{{ feature.name }}</td>
                <td
                  v-for="plan in plans.monthly"
                  :key="`${plan.name}-${feature.name}`"
                  class="text-center py-4 px-4"
                >
                  <Icon
                    v-if="feature.plans.includes(plan.name.toLowerCase())"
                    name="material-symbols:check-circle"
                    class="inline-block h-5 w-5 text-blue"
                  />
                  <Icon
                    v-else
                    name="material-symbols:circle"
                    class="inline-block h-5 w-5 text-ink-muted/50"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const isAnnual = ref(true);

const plans = {
  monthly: [
    {
      name: 'Basic',
      price: 9.99,
      features: [
        'HD Streaming',
        '2 Devices',
        '1000+ Channels',
        '7 Days Replay',
        'Basic Support',
      ],
      popular: false,
    },
    {
      name: 'Premium',
      price: 19.99,
      features: [
        '4K Ultra HD Streaming',
        '4 Devices',
        '2000+ Channels',
        '14 Days Replay',
        'Priority Support',
        'Cloud DVR',
      ],
      popular: true,
    },
    {
      name: 'Family',
      price: 29.99,
      features: [
        '4K Ultra HD Streaming',
        '6 Devices',
        '3000+ Channels',
        '30 Days Replay',
        '24/7 Premium Support',
        'Unlimited Cloud DVR',
      ],
      popular: false,
    },
  ],
  annual: [
    {
      name: 'Basic',
      price: 7.99,
      monthlyPrice: 9.99,
      features: [
        'HD Streaming',
        '2 Devices',
        '1000+ Channels',
        '7 Days Replay',
        'Basic Support',
      ],
      popular: false,
    },
    {
      name: 'Premium',
      price: 15.99,
      monthlyPrice: 19.99,
      features: [
        '4K Ultra HD Streaming',
        '4 Devices',
        '2000+ Channels',
        '14 Days Replay',
        'Priority Support',
        'Cloud DVR',
      ],
      popular: true,
    },
    {
      name: 'Family',
      price: 23.99,
      monthlyPrice: 29.99,
      features: [
        '4K Ultra HD Streaming',
        '6 Devices',
        '3000+ Channels',
        '30 Days Replay',
        '24/7 Premium Support',
        'Unlimited Cloud DVR',
      ],
      popular: false,
    },
  ],
};

const comparisonFeatures = [
  { name: 'HD Streaming', plans: ['basic', 'premium', 'family'] },
  { name: '4K Ultra HD', plans: ['premium', 'family'] },
  { name: 'Multiple Devices', plans: ['basic', 'premium', 'family'] },
  { name: 'Cloud DVR', plans: ['premium', 'family'] },
  { name: 'Unlimited Cloud DVR', plans: ['family'] },
  { name: 'Live TV', plans: ['basic', 'premium', 'family'] },
  { name: 'Video on Demand', plans: ['premium', 'family'] },
  { name: 'Mobile App Access', plans: ['basic', 'premium', 'family'] },
  { name: 'No Contract Required', plans: ['basic', 'premium', 'family'] },
  { name: 'Priority Support', plans: ['premium', 'family'] },
  { name: '24/7 Premium Support', plans: ['family'] },
  { name: 'Parental Controls', plans: ['premium', 'family'] },
];

const currentPlans = computed(() =>
  isAnnual.value ? plans.annual : plans.monthly
);

const toggleBilling = () => {
  isAnnual.value = !isAnnual.value;
};
</script>
