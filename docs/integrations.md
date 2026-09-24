# Platform Integration Architecture

Media Navigator decouples platform-specific API models via standard adapters:

```text
┌─────────────────┐       ┌────────────────────────┐
│ Instagram Graph ├──────►│ InstagramAdapter       │
└─────────────────┘       └───────────┬────────────┘
                                      │
┌─────────────────┐       ┌───────────▼────────────┐
│ Facebook Pages  ├──────►│ FacebookAdapter        │
└─────────────────┘       └───────────┬────────────┘
                                      │
┌─────────────────┐       ┌───────────▼────────────┐       ┌──────────────────────┐
│ YouTube Data    ├──────►│ YouTubeAdapter         ├──────►│ NormalizedMedia Model│
└─────────────────┘       └───────────┬────────────┘       └──────────┬───────────┘
                                      │                               │
┌─────────────────┐       ┌───────────▼────────────┐                  ▼
│ LinkedIn Org    ├──────►│ LinkedInAdapter        │       ┌──────────────────────┐
└─────────────────┘       └────────────────────────┘       │ Intelligence Engine  │
                                                           └──────────────────────┘
```

## Normalization Guarantees
- Every post has a computed `primarySignal` representing its strongest outcome.
- Missing platform metrics (such as watch time for photos) are gracefully set to null or omitted.
- Raw payloads are sanitized; user credentials are encrypted.
