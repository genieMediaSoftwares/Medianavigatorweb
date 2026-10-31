# Staging workload verification

This is a read-only API probe, not proof of 100,000-user capacity. It does not create accounts, trigger provider syncs or call paid AI. It checks user/account/media/overview reads using staging-only access tokens.

1. Create isolated staging with a separate database, queues, provider test accounts and storage. Seed 100,000 synthetic registered users and representative post volumes; use many active-user tokens, not just one user repeatedly.
2. Keep the token JSON array outside the repository in a mode-600 file. No token appears in results. Ensure token lifetimes cover the test; 401 is a failure, not throughput success.
3. Validate without traffic:

```sh
node scripts/load/read-workload.mjs --url=https://your-staging-api.example --staging-confirmed --rps=10 --seconds=60 --dry-run
```

4. Run 10, 50, 100 and 200 requests/second, one stage at a time. Stop if latency or errors rise; do not overload a shared/live environment.

```sh
node scripts/load/read-workload.mjs --url=https://your-staging-api.example --staging-confirmed --tokens-file=/secure/staging-tokens.json --rps=50 --seconds=300 --concurrency=100
```

The script reports p50/p95/p99, status counts, network failures and dropped requests caused by the concurrency cap. Exit status fails if p95 exceeds 1 second, p99 exceeds 2.5 seconds, or errors/drops exceed 1%. These provisional SLOs must match the product SLA. Redirects are rejected to avoid sending authorization to another origin. Known production domains are blocked. `--staging-confirmed` is an operator assertion, not automatic environment detection.

Capture CPU, memory, event-loop lag, database pool use/slow queries, and queue age alongside results. A single generator can itself saturate; watch dropped requests and use dedicated generators for larger tests. Direct API throughput does not test the Next.js proxy, login cookies, browser rendering or external providers. Test these separately.

For a 24-hour soak, use a proper sustained-load runner with token renewal, per-route histograms and a defined workload mix. Include isolated worker-kill, provider throttling and database-failover drills. Do not mark launch ready based on this script's dry run or a laptop benchmark.
