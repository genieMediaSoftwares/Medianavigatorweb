# Mobile and shared-backend launch work — 23 October 2026

## Status

Local code and configuration preparation only. **Do not describe this as a production deployment or approved Android/iOS release.** The owner explicitly requires approval before any push or deployment. No credentials have been invented, printed, rotated or configured in a hosted account. Credits, purchases and subscriptions remain on hold; the existing no-charging regression tests remain applicable.

The repository already contains substantial uncommitted work from the earlier pilot audit. This work preserves it. The previous dashboard-only branch on GitHub is separate from these launch changes.

## Changes in this pass

- Password reset supports Resend over HTTPS, or the existing fully configured SMTP provider. Partial/ambiguous email settings fail configuration validation. Delivery requests time out and require a receipt; SMTP requires TLS. Provider error bodies, reset links and recipient addresses are excluded from delivery logs.
- Password-reset requests are throttled by a digest of the address in the shared MongoDB rate-limit store. Failed deliveries remove their unused reset token and produce metadata-only errors visible in admin. Known and unknown addresses receive the same public response when a provider is configured, including provider delivery failures. Missing provider configuration remains a truthful 503. Actual email delivery is not verified by these code tests.
- Successful resets use an expiring single-use token and revoke all existing sessions. Disabled/deleted accounts cannot reset. A public native `reset-password` route handles the app scheme and validates password confirmation; the existing HTTPS website remains the email destination and works for mobile users in a browser. Universal/app links are not configured without a verified domain.
- One active Media Navigator owner per social account, enforced both in the service and by a named partial unique index. Concurrent claims have one winner. Disconnect permits a subsequent transfer. No existing user's connection or data is automatically removed.
- Website, admin and mobile share request timeout rules; synchronous media analysis gets a longer budget. Ordinary mobile API calls now time out with a useful retry message. Mobile refreshes account/profile data on foreground, and server authorization remains authoritative on every request.
- A shared UTF-8 password-length policy prevents new passwords from exceeding bcrypt's 72-byte input limit. Existing sign-in behaviour is preserved. Website password guidance now matches the API's required letter-and-number rule.
- Admin shows the actual configured email provider and backend configuration checks. Configuration is distinguished from verified delivery or provider connectivity. Cross-client tests verify shared profiles, preferences, admin counts and immediate suspension across separate website/Android/iOS sessions.
- Added iOS bundle identifier matching the established Android identifier, explicit Android production AAB profile, production EAS environment and launcher assets adapted from the owner-approved existing mark. Android excludes unused storage/overlay permissions and disables backups. Generated native projects remain excluded from EAS upload.
- CI now checks mobile lint, types, tests and both platform bundles. Website CI has explicit non-secret legal-page build values. No app store submission or signed native build has been performed.
- Patched website/admin from Next.js 16.4.0 to 16.4.2 after the build surfaced a critical advisory; the website lint configuration is also updated. The [maintainer security notice](https://nextjs.org/blog/nextjs-security-update-october-14-2026) identifies patched releases from 16.4.1 onward. Both 16.4.2 production builds pass. Added the monorepo root/tracing configuration needed to bundle shared policies.
- Updated Expo notifications to its SDK-recommended 57.0.24 patch. Native incoming links are bounded and validated with the built-in decoder before permissive query decoding. This does not remove the upstream dependency advisories or constitute a complete exploitability review.
- `npm run release:check` reports backend configuration blockers without printing credentials. `npm run release:check -- --database` additionally performs a read-only duplicate-ownership check; it never drops indexes or chooses which user keeps an account.

## Password reset: exact owner setup

Local inspection found **none** of `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, or `RESEND_API_KEY` configured. Local backend configuration is development/localhost; this does not prove what is set in Render. The screenshot demonstrates the deployed endpoint's unconfigured-email response.

1. Create/access the Resend account and add a sending domain you control. Add the DNS records Resend supplies, then wait for its verified status. A test sender is not sufficient for delivery to arbitrary launch customers.
2. Create a sending API key in Resend. Store it directly in the Render API service environment as `RESEND_API_KEY`. Do not paste it in chat or commit it.
3. Set `EMAIL_FROM` to a sender on that verified domain, optionally `Media Navigator <reset@your-verified-domain>`.
4. Set `WEB_APP_URL` to the real HTTPS website origin. Its `/reset-password` page must be reachable. Do not set it to localhost, the API origin, a guessed domain or the custom app scheme. The same password then works in website and mobile sign-in.
5. Leave all `SMTP_*` fields unset when using Resend. If an existing verified SMTP configuration is retained instead, configure the complete SMTP group plus `EMAIL_FROM` and leave `RESEND_API_KEY` unset.
6. After the owner approves deployment, submit a reset request for a controlled test account, verify inbox/spam delivery, use the link once, verify the old password and old website/mobile sessions no longer work, and verify a second use/expired link is rejected. Test provider failure too. No real reset email has been sent in this session.

Resend setup documentation: https://resend.com/docs/dashboard/domains/introduction and https://resend.com/docs/api-reference/emails/send-email. Render free services restrict outbound SMTP ports; HTTPS avoids that transport dependency: https://render.com/docs/free.

## One global backend/admin

Set **the same production API origin** in web `API_BASE_URL`, admin `API_BASE_URL` and EAS/mobile `EXPO_PUBLIC_API_BASE_URL`. API and worker must use the same MongoDB database, credential encryption keys and provider settings. Browser tokens stay in the existing server cookie/proxy flow; mobile tokens stay in device secure storage. Neither client maintains a separate account database. Private proxy requests retain `cache: no-store`.

Build contexts must include the repository's `shared/` directory as well as the relevant application directory. In hosting platforms with a project-root isolation setting, explicitly include the shared directory or build from the repository root; do not upload only web/, admin/ or backend/ in isolation.

The admin controls shared accounts, suspension, roles, connections and background work through that API. The backend enforces permission changes on subsequent requests from every client. API configuration switches are deployment configuration, not an invented editable global CMS. Real website/mobile cross-device testing against the deployed candidate remains required.

## Ownership rollout

Before deployment, run the read-only database preflight on the intended environment. If duplicate active `(platform, providerAccountId)` groups exist, the new unique index cannot be created. The owner must resolve them intentionally; do not delete accounts, disconnect arbitrary users, drop data or auto-select a winner. MongoDB 5+ supports the named unique index alongside the previous non-unique lookup index. Back up first and test the migration on an isolated restore. The API must finish index creation before accepting traffic.

## Remaining external release blockers

- **Previously exposed credentials:** follow `docs/platform-audit/SECRET_ROTATION_RUNBOOK.md`. Verify and rotate affected Atlas/JWT/encryption credentials in every affected deployment. Preserve dual-key migration for encrypted data; do not simply replace the encryption key. No rotation or shared-history rewrite is authorized/performed here.
- **Render/services:** verify production mode/HTTPS/CORS, Resend domain and delivery, private R2 storage, always-on API plus dedicated worker (`npm run worker`), successful worker heartbeats, restart recovery, alerts, database backups/restore and rollback. The local preflight currently reports missing production mode, HTTPS origins, email, private storage and enforced staff MFA. Local AI configuration is present. Hosted settings are unverified.
- **Admin:** enrol real staff in MFA before setting `STAFF_MFA_REQUIRED=true`; verify recovery and least-privilege access. Confirm real operator/support details in the website environment.
- **Provider access:** test every advertised integration with an approved external customer, including consent denial, reconnect/revocation, missing permissions, sync and cross-user isolation. Owner/tester tokens do not establish public approval.
- **Stores:** confirm ownership/availability of `com.kuramsneha.medianavigator` in the Apple and Google accounts, supply signing credentials through EAS, create release AAB and iOS archive/TestFlight builds, inspect the branded icons and layouts on physical devices, complete privacy/data-safety/export-compliance forms and reviewer access. Verify the existing public `/data-deletion` website URL and in-app deletion. These account actions have not been performed. iOS encryption exemption declaration needs owner verification against the shipped app.
- **Dependencies:** mobile audit currently reports 28 affected entries (21 high, 7 moderate), representing four underlying advisory families, not 28 independent demonstrated runtime exploits. `braces` and `node-forge` currently have no newer published fixes in the inspected registry. `decode-uri-component` and `postcss-selector-parser` require changes outside their callers' current declared ranges. The patched decoder 0.5.0 is ESM-only while query-string 7 requires the CommonJS decoder API, so a blind override can break routing. Incoming native links now reject malformed encoded input before routing; other decoder call paths still require assessment. Most other paths belong to Expo/Metro/Tailwind tooling; this is not an exploitability certification. Do not use `npm audit fix --force` to downgrade Expo/React Native or replace NativeWind's Tailwind major. Resolve or obtain a documented owner disposition before launch; do not claim a clean mobile audit.

## Verification evidence

Mocked browser/test fixtures are not production customer data or evidence of live email/provider access. A successful Expo bundle is not a signed native install or an App Store approval.

| Check | Result |
| --- | --- |
| Backend full suite | 437 passed across 40 files; isolated temporary MongoDB databases, outside sandbox |
| Final auth/reset/security regression | 48 passed after the shared password policy; includes rejecting an overlong password before token consumption |
| Backend typecheck / production build | Passed; API and dedicated worker bundles generated |
| Mobile unit tests | 51 passed across 12 files |
| Mobile typecheck / lint | Passed |
| Expo dependency compatibility | `npx expo install --check`: dependencies up to date after notifications 57.0.24 |
| Expo Doctor | Earlier 20/21 passed; after the patch, the online config-schema check could not connect to Expo's API. Do not record 21/21 as verified. Local `expo config --type public` succeeds and resolves the intended identifiers, icons and blocked permissions. |
| Android/iOS Hermes export | Both passed again after the final notification patch and native-link guard. Each bundle contains the intended production API origin and none of the checked private backend environment variable names. No signed native archive was generated. |
| Reset form browser checks | Passed at widths 320, 390, 430 and 768; confirmation, single submission, success, URL token removal, missing/expired token, unavailable email and accepted request; no page errors |
| Website tests / lint / production build | 45 tests passed; lint passed; Next.js 16.4.2 production build passed |
| Admin tests / production build | 22 tests passed; Next.js 16.4.2 production build passed |
| Production dependency audits | Backend 0; website 0 after patch; admin install audit reports 0 across all dependencies; mobile 28 remain as described above |
| Read-only production health | Could not be verified by browser or bounded CLI fetch from this environment; this does not establish an outage |
| Production configuration preflight | Correctly exits nonzero for the current development-only local setup. No database preflight was run against a live customer database. |
| Push / deployment / live email / signed device build | Not performed |

Build-time HTTPS/operator/support overrides used for validation were temporary, non-secret process settings. They did not edit the owner's environment files. Do not publish those local Next.js validation artifacts with placeholder operator details; build on the host with the actual operator/support configuration.

## Launcher asset provenance

See `Frontend/assets/brand/ICON_NOTES.md` for saved paths, dimensions, original brand reference and the built-in image-editing prompt set. Raster adaptations require final device/brand review; the in-app wordmark is unchanged.
