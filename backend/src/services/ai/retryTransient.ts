/** Retry one transient provider rejection within the original request budget. Never retry auth/validation errors. */
export async function retryTransient<T>(call: (remainingMs: number) => Promise<T>, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  try { return await call(timeoutMs); }
  catch (error) {
    const status = Number((error as { status?: number; code?: number })?.status ?? (error as { code?: number })?.code);
    if (![408, 429, 500, 502, 503, 504].includes(status) || deadline - Date.now() < 2000) throw error;
    await new Promise((resolve) => setTimeout(resolve, 750));
    return call(Math.max(1, deadline - Date.now()));
  }
}
