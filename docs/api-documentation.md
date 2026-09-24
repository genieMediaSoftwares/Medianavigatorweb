# Media Navigator REST API Documentation

All endpoints return JSON responses with standardized envelopment:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

## Endpoints

### Workspace & Sessions
- `GET /api/v1/workspaces`: Retrieve active and accessible workspaces.
- `POST /api/v1/workspaces/select`: Select active workspace context.

### Connections
- `GET /api/v1/connections`: List all 4 platform connections with status and primary strength.
- `POST /api/v1/connections/:platform/sync`: Trigger on-demand sync job.
- `POST /api/v1/connections/:platform/toggle`: Toggle active/disconnected state for demo & sandbox.

### Media & Content Intelligence
- `GET /api/v1/media`: Fetch normalized media feed (supports `platform` and `timeframe` query params).
- `GET /api/v1/media/:id`: Fetch single media item with AI explainability and metrics.

### Intelligence & Signals
- `GET /api/v1/analytics/overview`: Hero insight, 3 key signal cards, and "What happened?" observations.
- `GET /api/v1/intelligence/signals`: Vertical feed of pattern detections, timing signals, and growth signals.
- `POST /api/v1/intelligence/ask`: Ask natural language media queries answered by Gemini 3.8 Flash.
- `GET /api/v1/timing`: Day x Time heatmap matrix and strongest publishing window.
- `GET /api/v1/trends`: Topics, formats, and audience behaviour split by Rising, Stable, and Losing momentum.

### Recommendations & Planner
- `GET /api/v1/recommendations`: Actionable CREATE, TEST, and REPURPOSE cards.
- `POST /api/v1/recommendations/:id/plan`: Automatically push recommendation to Content Planner.
- `GET /api/v1/planner`: Weekly calendar schedule with AI-recommended slots.
- `POST /api/v1/planner`: Add custom scheduled content.
- `DELETE /api/v1/planner/:id`: Remove planned item.

### Alerts
- `GET /api/v1/alerts`: List intelligent alerts (Performance spike, Engagement change, New pattern).
- `POST /api/v1/alerts/:id/dismiss`: Dismiss or acknowledge alert.
