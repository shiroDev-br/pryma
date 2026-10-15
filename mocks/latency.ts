/** Atraso simulado — único ponto de fake latency dos mocks. */
export function simulateLatency(min = 60, max = 220): Promise<void> {
  const delay = Math.floor(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, delay));
}
