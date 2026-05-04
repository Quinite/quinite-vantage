# Database Setup Guide

## Overview

Quinite Vantage uses **Supabase** (PostgreSQL) as its database. The schema includes 20+ tables organized into modules for CRM, Inventory, Billing, and AI Calling.

---

## Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and region
4. Set database password (save this!)

### 2. Run Schema

1. Open Supabase SQL Editor
2. Copy contents of `database/schema.sql`
3. Click "Run"
4. Wait for completion (should take ~10 seconds)

### 3. Run Seed Data

1. Copy contents of `database/seed.sql`
2. Click "Run"
3. This creates default subscription plans

### 4. Get Credentials

1. Go to Project Settings → API
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon/Public Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## Database Schema

### Core Tables

#### `organizations`

Multi-tenant root table. Each organization is completely isolated.

**Key Fields**:

- `id` - UUID primary key
- `name` - Organization name
- `tier` - Subscription tier (free/pro/enterprise)
- `caller_id` - Phone number for outbound calls
- `settings` - JSONB for custom configuration

#### `profiles`

User accounts linked to `auth.users`.

**Key Fields**:

- `id` - References `auth.users(id)`
- `organization_id` - References `organizations(id)`
- `role_id` - Custom functional role
- `system_role` - System-level role (owner/admin/member)

#### `roles`

Custom roles per organization with JSONB permissions.

**Example Permissions**:

```json
["project.create", "lead.view", "campaign.run"]
```

---

### CRM Tables

#### `projects`

Development projects (e.g., "Sunset Villas", "Downtown Tower").

#### `pipelines`

Sales pipelines (usually one default per organization).

#### `pipeline_stages`

Kanban columns (e.g., "New Lead", "Qualified", "Negotiation", "Won").

**Key Fields**:

- `project_id` - Stages are project-specific
- `order_index` / `position` - Display order
- `color` - Hex color for UI

#### `leads`

Customer leads with contact info and status.

**Key Fields**:

- `stage_id` - Current pipeline stage
- `assigned_to` - Sales rep
- `call_status` - Last call outcome
- `abuse_flag` - Marked as abusive

#### `lead_activities`

Timeline of interactions (calls, notes, emails).

#### `campaigns`

AI calling campaigns targeting specific lead lists.

---

### Calling Tables

#### `call_logs`

Complete call history with transcripts and AI analysis.

**Key Fields**:

- `call_sid` - Plivo call UUID
- `conversation_transcript` - Full conversation
- `ai_analysis` - JSONB with qualification data
- `transferred` - Whether call was transferred to human
- `disconnect_reason` - Why AI ended call

#### `call_queue`

Asynchronous call processing with retry logic.

**Status Flow**: `queued` → `processing` → `completed`/`failed`

---

### Inventory Tables

#### `properties`

Real estate listings.

**Key Fields**:

- `type` - apartment/villa/plot/commercial
- `status` - available/sold/reserved/rented
- `price`, `size_sqft`, `bedrooms`, `bathrooms`

#### `property_images`

Multiple images per property with featured flag.

#### `property_features`

Tags like "Pool", "Gym", "Parking".

---

### Billing Tables

#### `subscription_plans`

Available plans (Free, Pro, Enterprise).

**Features JSONB**:

```json
{
  "max_users": 10,
  "max_projects": 10,
  "ai_calls_per_month": 5000,
  "max_leads": 10000
}
```

#### `subscriptions`

Active subscriptions per organization.

**Key Fields**:

- `status` - active/trialing/cancelled/past_due
- `current_period_end` - Renewal date
- `trial_ends_at` - Trial expiration

#### `invoices`

Auto-generated invoices with unique numbers.

#### `payment_methods`

Saved payment methods (cards, UPI).

#### `usage_logs`

Track feature usage for quota enforcement.

---

### System Tables

#### `audit_logs`

Complete audit trail of all actions.

#### `impersonation_sessions`

Admin support mode tracking.


---

## Row Level Security (RLS)

All tables have RLS enabled with organization-scoped policies:

```sql
-- Example: Leads are scoped to organization
CREATE POLICY "View org leads" ON public.leads
  FOR SELECT USING (organization_id = get_auth_org_id());
```

**Helper Functions**:

- `get_auth_org_id()` - Current user's organization
- `get_auth_system_role()` - Current user's system role
- `auth_has_permission(perm)` - Check custom permission

---

## Indexes

Critical indexes for performance:

- `idx_call_logs_organization_id` - Fast org filtering
- `idx_call_queue_poll` - Efficient queue polling
- `idx_subscriptions_org_id` - Billing lookups
- `idx_usage_logs_org_period` - Usage tracking

---

## Triggers

### Auto-Update Timestamps

`update_modified_column()` trigger on all tables with `updated_at`.

### Auto-Create Profile

`handle_new_user()` creates profile on user signup.

### Auto-Generate Invoice Numbers

`set_invoice_number()` creates unique invoice numbers (e.g., `INV-202601-00042`).

---

## Migrations

The `database/migrations/archive/` folder contains historical migrations for reference. **Do not run these** - they are superseded by `schema.sql`.

---

## Troubleshooting

### "relation does not exist"

- Ensure you ran `schema.sql` in the correct Supabase project
- Check you're using the right database credentials

### "permission denied for table"

- RLS policies may be blocking access
- Verify user has `organization_id` set in `profiles`

### "duplicate key value violates unique constraint"

- Check for existing data (e.g., subscription plans already seeded)
- Use `ON CONFLICT DO NOTHING` in seed scripts

---

## Backup & Restore

### Backup

```bash
# From Supabase dashboard
Settings → Database → Backups → Create Backup
```

### Restore

```bash
# Upload backup file in Supabase dashboard
Settings → Database → Backups → Restore
```

---

## Next Steps

- [Installation Guide](./INSTALLATION.md) - Complete setup walkthrough
- [Environment Variables](./ENVIRONMENT.md) - Configuration reference
- [API Documentation](../development/API.md) - Using the API
