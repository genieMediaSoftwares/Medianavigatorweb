# Database Architecture & Relational Schema

Media Navigator uses a relational schema designed for multi-tenant SaaS workloads.

## Tables
1. **`users`**
   - `id` (UUID PK), `email` (VARCHAR Unique), `password_hash` (VARCHAR), `name` (VARCHAR), `created_at` (TIMESTAMP)
2. **`workspaces`**
   - `id` (UUID PK), `name` (VARCHAR), `slug` (VARCHAR Unique), `plan` (VARCHAR), `created_at` (TIMESTAMP)
3. **`workspace_members`**
   - `workspace_id` (UUID FK), `user_id` (UUID FK), `role` (VARCHAR: admin/member/viewer)
4. **`platform_connections`**
   - `id` (UUID PK), `workspace_id` (UUID FK), `platform` (VARCHAR), `account_handle` (VARCHAR), `encrypted_access_token` (TEXT), `token_expires_at` (TIMESTAMP), `last_synced_at` (TIMESTAMP), `status` (VARCHAR)
5. **`media_content`**
   - `id` (UUID PK), `workspace_id` (UUID FK), `platform` (VARCHAR), `platform_content_id` (VARCHAR), `content_type` (VARCHAR), `title` (TEXT), `caption` (TEXT), `thumbnail_url` (TEXT), `published_at` (TIMESTAMP)
6. **`media_metrics`**
   - `id` (UUID PK), `media_id` (UUID FK), `views` (BIGINT), `reach` (BIGINT), `likes` (INT), `comments` (INT), `shares` (INT), `watch_time_minutes` (FLOAT), `engagement_rate` (FLOAT), `recorded_at` (TIMESTAMP)
7. **`insights`**
   - `id` (UUID PK), `workspace_id` (UUID FK), `category` (VARCHAR), `title` (VARCHAR), `description` (TEXT), `why_it_matters` (TEXT), `confidence` (VARCHAR), `detected_at` (TIMESTAMP)
8. **`recommendations`**
   - `id` (UUID PK), `workspace_id` (UUID FK), `type` (VARCHAR: CREATE/TEST/REPURPOSE), `title` (VARCHAR), `reason` (TEXT), `supporting_signal` (TEXT), `status` (VARCHAR)
9. **`content_plans`**
   - `id` (UUID PK), `workspace_id` (UUID FK), `day` (VARCHAR), `time` (VARCHAR), `platform` (VARCHAR), `content_type` (VARCHAR), `title` (TEXT), `status` (VARCHAR)
10. **`alerts`**
    - `id` (UUID PK), `workspace_id` (UUID FK), `type` (VARCHAR), `title` (VARCHAR), `description` (TEXT), `severity` (VARCHAR), `created_at` (TIMESTAMP), `read` (BOOLEAN)
11. **`sync_jobs`**
    - `id` (UUID PK), `workspace_id` (UUID FK), `platform` (VARCHAR), `status` (VARCHAR), `items_synced` (INT), `started_at` (TIMESTAMP), `completed_at` (TIMESTAMP)
