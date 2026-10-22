/** Serial polling with an awaitable stop: no new work starts during shutdown. */
export function startPollLoop(run: () => Promise<unknown>, intervalMs: number, onError: (error: unknown) => void): () => Promise<void> {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: Promise<void> = Promise.resolve();
  const tick = () => {
    if (stopped) return;
    active = (async () => {
      try { await run(); } catch (error) { onError(error); }
      finally { if (!stopped) { timer = setTimeout(tick, intervalMs); timer.unref(); } }
    })();
  };
  tick();
  return async () => { stopped = true; clearTimeout(timer); await active; };
}
