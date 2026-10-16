<template>
  <div class="flex min-h-[100svh] items-center justify-center px-6 py-12">
    <div class="flex w-full flex-col items-center">
      <!-- Marca — o momento "marquee". -->
      <div class="brand-mark relative mb-7 flex flex-col items-center">
        <div class="relative flex items-center justify-center">
          <div class="mark-glow" aria-hidden="true" />
          <img
            src="/prysma-mark.svg"
            alt=""
            width="60"
            height="60"
            aria-hidden="true"
            class="relative h-[3.75rem] w-[3.75rem]"
          />
        </div>
        <h1 class="wordmark">PRYMA</h1>
      </div>

      <p class="mb-9 text-center text-sm text-ink-muted">Sua experiência em outro nível.</p>

      <!-- Credenciais. -->
      <div class="panel w-[500px] mt-4">
        <p class="kicker">Bem-vindo de volta</p>
        <h2 class="mt-3 text-[1.5rem] font-bold leading-none tracking-tight text-ink">Entrar</h2>

        <form class="mt-7 space-y-4" @submit.prevent="submit">
          <label class="block space-y-2">
            <span class="field-label">Usuário</span>
            <input
              v-model="username"
              type="text"
              required
              autocomplete="username"
              autofocus
              placeholder="seu usuário"
              class="field"
            />
          </label>

          <label class="block space-y-2">
            <span class="field-label">Senha</span>
            <input
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="field"
            />
          </label>

          <p
            v-if="auth.error.value"
            class="rounded-sm border border-danger/40 bg-danger/10 px-3.5 py-3 text-sm text-danger"
            role="alert"
          >
            {{ auth.error.value.message }}
          </p>

          <button type="submit" class="cta" :disabled="auth.status.value === 'pending'">
            <span v-if="auth.status.value === 'pending'" class="cta-spinner" aria-hidden="true" />
            {{ auth.status.value === 'pending' ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="mt-6 text-center text-[0.75rem] text-ink-muted/80">
          Acesso concedido pelo administrador.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' });

useHead({ title: 'Prysma — Entrar' });

const auth = useAuth();

const username = ref('');
const password = ref('');

async function submit(): Promise<void> {
  auth.clearError();
  const ok = await auth.login({ username: username.value, password: password.value });
  if (ok) await navigateTo('/');
}
</script>

<style scoped>
/* Entrada única — marca e painel revelam juntos (o design system zera a
   animação quando o usuário pede menos movimento). */
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.brand-mark,
.panel {
  animation: rise 0.45s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.panel {
  animation-delay: 0.07s;
}

/* Wordmark centrado — compensa o espaço fantasma do letter-spacing final. */
.wordmark {
  margin-top: 1.5rem;
  font-size: clamp(2.25rem, 8vw, 2.75rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.28em;
  margin-right: -0.28em;
  color: var(--color-text);
  text-shadow: 0 0 48px rgba(22, 136, 255, 0.3);
}

/* Marquee: halo azul atrás da marca. */
.mark-glow {
  position: absolute;
  inset: -1.75rem;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(22, 136, 255, 0.35) 0%,
    rgba(22, 136, 255, 0.08) 48%,
    transparent 72%
  );
  filter: blur(4px);
  pointer-events: none;
}

/* Painel de vidro — deixa a montanha cinematográfica transparecer por trás. */
.panel {
  position: relative;
  padding: clamp(1.5rem, 5vw, 2rem);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: linear-gradient(
    165deg,
    rgba(10, 31, 69, 0.55) 0%,
    rgba(6, 20, 45, 0.62) 100%
  );
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Brilho sutil no topo do painel (mesma linguagem do card-sheen). */
.panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 42%);
  pointer-events: none;
}

.field-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-muted, #a9b9d6);
}

.field {
  width: 100%;
  padding: 0.7rem 0.9rem;
  font-size: 0.9rem;
  color: var(--color-text);
  background: rgba(2, 8, 23, 0.55);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.field::placeholder {
  color: rgba(169, 185, 214, 0.45);
}

/* Chrome/Safari autofill pinta de amarelo — força o fundo escuro de volta. */
.field:-webkit-autofill,
.field:-webkit-autofill:hover,
.field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--color-text);
  caret-color: var(--color-text);
  box-shadow: 0 0 0 1000px rgba(2, 8, 23, 0.95) inset;
  transition: background-color 9999s ease-in-out 0s;
}

.field:focus {
  outline: none;
  border-color: var(--color-blue-dark);
  box-shadow: var(--focus-ring);
}

.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.8rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #fff;
  background: linear-gradient(180deg, var(--color-blue) 0%, var(--color-blue-dark) 100%);
  border: 1px solid rgba(77, 157, 255, 0.35);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
  box-shadow: 0 8px 24px rgba(11, 92, 255, 0.28);
}

.cta:hover:not(:disabled) {
  filter: brightness(1.08);
  box-shadow: 0 10px 32px rgba(11, 92, 255, 0.4);
}

.cta:active:not(:disabled) {
  transform: translateY(1px);
}

.cta:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.cta:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring), 0 8px 24px rgba(11, 92, 255, 0.28);
}

.cta-spinner {
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
