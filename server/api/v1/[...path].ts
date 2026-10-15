/** Catch-all /api/v1/* -> FastAPI (usado apenas em DATA_MODE=live). */
export default defineEventHandler(async (event) => {
  const body = await proxyToFastapi(event);
  if (body) return body;
});
