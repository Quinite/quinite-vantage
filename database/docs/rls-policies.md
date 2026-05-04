# Row Level Security (RLS) Policies

## Overview

RLS policies enforce multi-tenant data isolation, ensuring users can only access data from their organization.

## Helper Functions

### `get_auth_org_id()`

Returns the organization_id for the currently authenticated user.

```sql
CREATE OR REPLACE FUNCTION get_auth_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;
```

**Usage**: Used in most RLS policies to check organization membership

---

## Common Policy Patterns

### Pattern 1: Organization-based Access

**Used by**: Most tables

```sql
-- View policy
CREATE POLICY "view_org_[table]" ON [table]
FOR SELECT USING (organization_id = get_auth_org_id());

-- Manage policy  
CREATE POLICY "manage_org_[table]" ON [table]
FOR ALL USING (organization_id = get_auth_org_id());
```

**Tables**: `leads`, `projects`, `properties`, `campaigns`, `call_logs`, etc.

---

### Pattern 2: Self-access Only

**Used by**: `profiles`, `notifications`

```sql
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (id = auth.uid());
```

---

### Pattern 3: Nested Organization Check

**Used by**: Related tables (e.g., `pipeline_stages`, `property_images`)

```sql
CREATE POLICY "manage_org_stages" ON pipeline_stages
FOR ALL USING (
  pipeline_id IN (
    SELECT id FROM pipelines 
    WHERE organization_id = get_auth_org_id()
  )
);
```

---

### Pattern 4: Service Role Bypass

**Used by**: `organizations`, `profiles`

```sql
CREATE POLICY "organizations_service_role_all" ON organizations
FOR ALL TO service_role USING (true);
```

**Purpose**: Allows backend services to bypass RLS

---

## Policy Summary by Table

### Core Tables

| Table | Policies | Pattern |
|-------|----------|---------|
| `organizations` | service_role_all | Service role bypass |
| `profiles` | select_own, insert_own, update_own, service_role_all | Self-access + service role |
| `projects` | view_org_projects, manage_org_projects | Organization-based |

### CRM Tables

| Table | Policies | Pattern |
|-------|----------|---------|
| `leads` | view_org_leads, manage_org_leads | Organization-based |
| `pipelines` | view_org_pipelines, manage_org_pipelines | Organization-based |
| `pipeline_stages` | view_org_stages, manage_org_stages | Nested org check |
| `lead_profiles` | view/insert/update in org | Organization-based |
| `lead_interactions` | view/insert in org | Organization-based |
| `tasks` | view/insert/update in org | Organization-based + RBAC scope (view_all/team/own_tasks) |
| `lead_documents` | view/insert/delete in org | Organization-based |
| `lead_tags` | view/insert/delete in org | Organization-based |
| `deals` | view_org_deals, manage_org_deals | Organization-based |

### Inventory Tables

| Table | Policies | Pattern |
|-------|----------|---------|
| `properties` | view_org_properties, manage_org_properties | Organization-based |
| `property_images` | view/manage property images | Nested org check |
| `property_features` | view/manage property features | Nested org check |

### Calling Tables

| Table | Policies | Pattern |
|-------|----------|---------|
| `call_logs` | view_org_call_logs, manage_org_call_logs + legacy | Organization-based |
| `campaigns` | view_org_campaigns, manage_org_campaigns | Organization-based |
| `agent_calls` | view/manage org agent calls | Organization-based |
| `call_attempts` | view/manage org call attempts | Organization-based |
| `conversation_insights` | view/manage org insights | Organization-based |
| `follow_up_tasks` | view/manage org tasks | Organization-based |

### Billing Tables

| Table | Policies | Pattern |
|-------|----------|---------|
| `subscription_plans` | View active plans | Public read for active plans |
| `subscriptions` | (via organization_id) | Organization-based |
| `invoices` | (via organization_id) | Organization-based |
| `payment_methods` | (via organization_id) | Organization-based |

### System Tables

| Table | Policies | Pattern |
|-------|----------|---------|
| `notifications` | view/update/delete own | Self-access |
| `audit_logs` | (via organization_id) | Organization-based |
| `lead_forms` | view/insert/update in org | Organization-based |

---

## Important Notes

> [!IMPORTANT]
>
> - **Always use admin client** for server-side operations to avoid RLS recursion
> - **Never hardcode organization IDs** - always use `get_auth_org_id()`
> - **Test policies thoroughly** before deploying to production

> [!WARNING]
>
> - RLS recursion can occur when policies query the same table
> - Use admin client with manual org_id checks to avoid recursion
> - Service role bypasses ALL RLS - use carefully

## Best Practices

1. **Use helper functions**: `get_auth_org_id()` for consistency
2. **Separate view and manage**: Different policies for SELECT vs INSERT/UPDATE/DELETE
3. **Test with different roles**: Ensure policies work for all user roles
4. **Document exceptions**: Note any tables without RLS and why
5. **Monitor performance**: Complex policies can impact query performance

## RLS-Free Tables

| Table | Reason |
|-------|--------|
| `impersonation_sessions` | Admin-only, managed via application logic |
