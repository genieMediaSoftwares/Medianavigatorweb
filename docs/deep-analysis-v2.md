# Deep Analysis V2

The Expo app uses the authenticated `/api/v1/intelligence/deep-report-v2` API. Existing website reports, Why Top/Bottom, rankings, All Posts and platform connections retain their existing routes.

## Mobile experience

- Exactly three fixed horizontal tabs: Overview, Audience, Next Move.
- Compact post identity (platform, title/caption and date); no player, thumbnail gallery or repeated metrics dashboard.
- Overview shows a short review, a creative timeline or format-specific assessment, up to five ranked findings and one takeaway. Findings start collapsed and expand inline into Finding, Evidence, Likely Impact and Recommended Action. Expansion persists across tab switches.
- Audience has up to four source-backed sections. Actual returned comment snippets remain separate from AI theme interpretations and measured synced counts. Unsupported metrics are omitted, rather than substituted with zero. No opinions are inferred from counts.
- Audience now always presents four inline dropdowns: What connected with people, Questions people asked, Why people might save or share, and Unanswered content demand. Missing evidence opens an explicit insufficient-data state. Save/share interpretations require an exact comment quote expressing that intent; counts are shown separately and never treated as reasons. Requested topics are not presented as proof that the creator has never answered them.
- `POST /api/v1/intelligence/deep-report-v2/:jobId/audience` refreshes only the owned post’s permitted feedback and audience interpretation. It preserves creative findings, the creative report timestamp, saved actions and dropdown state. This avoids retaining an old empty audience result or re-uploading media just to check new comments. The UI exposes **Refresh audience feedback**.
- Next Move has at most three supported, distinct future actions. Users can save/unsave actions in MongoDB, copy findings/actions and export the report. Saved ideas can be retrieved when reopening that report. Adding to a dated content plan and marking experiments as tried are not exposed because those flows have not been implemented here.
- Native export opens the platform share sheet; web export downloads a UTF-8 text file. Expo Clipboard supports the Copy controls. No report is automatically published or sent to anyone.

## Processing and persistence

1. Resolve the post under the authenticated user and its original connected-account ID.
2. Reuse authorized media loaders, with additional Facebook text and LinkedIn PDF support. Media credentials stay on the server.
3. Create/reuse a MongoDB job keyed by user, post, account/media identity, synced version, creator goal, configured model and prompt version.
4. Process original images and accessible carousel assets in slide order. Supply the entire available post text for text observations, checking cited quotes against the original text.
5. Upload video once, then assess contiguous windows (45 seconds, or 120 seconds for long content). Use provider video clipping and adaptive frame sampling (denser opening sampling). Validate absolute timestamps within the requested window. Preserve unknown/failed portions as grey segments.
6. Generate source-linked observations first. Reject invalid timestamps, media-type-inapplicable sources, unvalidated document page numbers and quotes that do not occur in supplied post text. The configured multimodal model supplies visual, speech and visible-text observations where it can process them.
7. Evaluate the twelve internal dimensions, select relevant grounded findings, rank by evidence/confidence/importance/actionability, and merge overlaps. There is no mandatory twelve-card output, numeric creative score or virality score.
8. Retrieve audience feedback separately through permitted platform endpoints. Review a bounded sample of up to 100 recent comments and accessible replies, without author profile data. Generated recurring themes need at least two distinct returned comment IDs. The sample does not prove unique people or represent the whole audience.
9. Generate up to three future-focused recommendations with valid source IDs. Omit unsupported, duplicate or generic actions and automatic repost/re-edit suggestions.
10. Validate the final report schema and selected-post identity before saving. Polling returns real queue/progress states; a partial report is never labelled complete.

`DeepAnalysisJob` persists queue state, progress, leases, errors and validated reports. The API process starts a serial worker; no Redis or separate queue dependency is required. Leases and heartbeats support recovery after a process interruption, with a bounded number of attempts. Cancellation stops future steps and prevents the worker from saving over a cancelled job; an already-running external model request cannot be immediately recalled. Retrying can repeat processing; there is no per-window resumable checkpoint cache.

Disconnecting an account cancels its queued/running analyses. Account deletion removes reports and saved recommendations; authoritative post removal during sync removes related stored reports/actions as well.

## Coverage and remaining limitations

- All configured accessible video windows are supplied for assessment, but Gemini samples frames. There is no independent local frame decoder, scene detector, ASR engine or OCR service installed/configured. Video reports therefore conservatively remain **partial**, even when grounded segment ranges span the entire known duration. They do not certify that every frame, spoken word or visible character was examined. There is no invented “100%” badge.
- Original still images and text can be marked complete only after successful processing/validation with no material coverage limitations. Mixed or missing carousel slides retain partial status.
- Authorized LinkedIn image, video, multi-image, text and accessible PDF document retrieval is supported. PDF page count/exhaustive page coverage is not independently verified, so PDF reports remain partial and unvalidated page-number citations are discarded. Non-PDF document formats and unsupported article/link attachments are reported unavailable rather than replaced with previews.
- Facebook text is assessed when the authorized post lookup returns text without media attachments. Instagram/Facebook media remain subject to account ownership, granted scopes, API version and provider download/size restrictions. YouTube URL processing depends on the model provider being able to access that video; private/restricted videos can be partial or unavailable.
- Audience comments may be disabled, permission-restricted, deleted or unavailable. Only returned comments/replies are used. Long comments are bounded to 2,000 characters. Measured signals are the latest known platform sync, labelled with that timestamp, not a live retention feed. Retention, demographics, follower/non-follower breakdown and conversion attribution are not newly fetched by V2; these are explicitly unavailable here.
- When Meta rejects expanded replies, the collector retries the same authenticated comment endpoint with basic comment fields. This does not grant new permissions or bypass access restrictions; replies remain marked unavailable when the basic request succeeds. A token without comment-reading access still yields unavailable feedback.
- V2 does not fetch competitor posts or current trend research. Those dimensions remain internal and do not produce unsupported findings.
- Source IDs, ranges, exact post-text quotations, category applicability and JSON structure are checked deterministically. Visual/speech observations and semantic interpretations still depend on the AI and can be mistaken; they are not independently corroborated by a second media-processing service.

## Verification

Automated suites cover job identity/ownership, queue deduplication, cancellation, cache separation, saved actions, text/image/carousel/video applicability, long video windows, missing windows, timestamp rejection, multilingual/no-speech fixtures, comment permissions, source grounding, known zero versus unavailable metrics, ranking/deduplication and tab/expansion state.

An isolated temporary MongoDB and synthetic UI report were used for browser verification of the real Expo screen, inline expansion, three-tab navigation, save/copy controls and downloadable export. No real connected post was sent to AI during that check. Native-device interaction and real-provider/model results were not exercised; live AI testing remains skipped at the user's request.
