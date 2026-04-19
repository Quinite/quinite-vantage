# Triggers & Functions Cleanup Notes

## Migration: 20260419_full_revamp_cleanup.sql

### Dropped Functions
- `calculate_lead_score(UUID)` — read `total_calls` and `last_sentiment_score` from leads, both removed
- `update_lead_score_after_insight()` — referenced `conversation_insights` table (dropped)

### Dropped Triggers
- `update_score_on_insight ON conversation_insights` — table dropped

### Kept (Active)

| Name | Type | Purpose |
|---|---|---|
| `update_campaign_sentiment` | RPC | Called by sentimentService.js to update campaign avg sentiment |
| `deduct_call_credits(org_id, amount)` | RPC | Called by callLifecycle.js after each call |
| `increment_campaign_credit_spent(campaign_id, amount)` | RPC | Called by callLifecycle.js |
| `increment_campaign_stat(campaign_id, stat_name, delta)` | RPC | Called by callLifecycle.js for answered/transferred counters |
| `fn_check_campaign_completion()` | Trigger fn | Auto-completes campaign when all leads are called |
| All `set_updated_at()` triggers | Triggers | Auto-update `updated_at` on all tables |
| All RLS policies | Policies | Row-level security (policies for dropped tables are auto-removed) |

### Dropped Tables (and their RLS policies auto-dropped)
- `follow_up_tasks` — use `lead_tasks` instead
- `lead_activities` — use `lead_interactions` instead  
- `lead_tags` — unused
- `conversation_insights` — unused in production
- `organization_addons` — use `subscription_addons` instead
- `organization_subscriptions` — use `subscriptions` instead

### Field Ownership (post-revamp)

| Field | Table | Writer |
|---|---|---|
| `call_status` | call_logs | webserver only |
| `ai_metadata` | call_logs | webserver (logIntent + sentimentService) |
| `sentiment_score` | call_logs | webserver (sentimentService) |
| `interest_level` | call_logs | webserver (sentimentService) |
| `interest_level` | leads | webserver (logIntent) |
| `transferred` | call_logs | webserver (transfer.js) |
| `recording_url` | call_logs | webserver (/recording webhook from Plivo) |
| `total_calls` | — | computed: COUNT(call_logs WHERE lead_id) |
| `last_contacted_at` | — | computed: MAX(call_logs.ended_at WHERE lead_id) |
| `last_sentiment_score` | — | computed: latest call_logs.sentiment_score |
