/** Retry one transient provider rejection within the original request budget. Never retry auth/validation errors. */
export async function retryTransient<T>(call: (remainingMs: number) => Promise<T>, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  const bounded = (remainingMs: number): Promise<T> => {
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([
      Promise.resolve().then(() => call(remainingMs)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('Analysis request timed out'), { name: 'TimeoutError', status: 504 })), remainingMs);
      }),
    ]).finally(() => clearTimeout(timer));
  };
  try { return await bounded(timeoutMs); }
  catch (error) {
    const status = Number((error as { status?: number; code?: number })?.status ?? (error as { code?: number })?.code);
    if (![408, 429, 500, 502, 503, 504].includes(status) || deadline - Date.now() < 2000) throw error;
    await new Promise((resolve) => setTimeout(resolve, 750));
    return bounded(Math.max(1, deadline - Date.now()));
  }
}
