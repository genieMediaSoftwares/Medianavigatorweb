// Retired: fabricated connections and analytics must never be shown to new users.
// Start the real backend with `cd backend && npm run dev`, then run `cd web && npm run dev`.
console.error('The mock API has been retired. Start the real backend configured in backend/.env. New accounts must connect a social channel before analytics are available.');
process.exitCode = 1;
