# Vantage Database Schema

## 1. agent_calls

```sql
create table public.agent_calls (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  lead_id uuid null,
  campaign_id uuid null,
  ai_call_log_id uuid null,
  agent_id uuid null,
  agent_name text null,
  call_sid text null,
  started_at timestamp with time zone null default now(),
  ended_at timestamp with time zone null,
  duration integer null,
  recording_url text null,
  transcript text null,
  outcome text null,
  next_action text null,
  next_action_date timestamp with time zone null,
  agent_notes text null,
  sentiment_score numeric(3, 2) null,
  interest_level text null,
  objections jsonb null default '[]'::jsonb,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint agent_calls_pkey primary key (id),
  constraint agent_calls_agent_id_fkey foreign KEY (agent_id) references profiles (id) on delete set null,
  constraint agent_calls_ai_call_log_id_fkey foreign KEY (ai_call_log_id) references call_logs (id) on delete set null,
  constraint agent_calls_campaign_id_fkey foreign KEY (campaign_id) references campaigns (id) on delete set null,
  constraint agent_calls_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint agent_calls_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 2. audit_logs

```sql
create table public.audit_logs (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  user_id uuid null,
  user_name text null,
  action text not null,
  entity_type text null,
  entity_id uuid null,
  metadata jsonb null,
  impersonator_user_id uuid null,
  is_impersonated boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint audit_logs_pkey primary key (id),
  constraint audit_logs_organization_id_fkey foreign KEY (organization_id) references organizations (id),
  constraint audit_logs_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;
```

## 3. call_attempts

```sql
create table public.call_attempts (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  lead_id uuid null,
  campaign_id uuid null,
  call_log_id uuid null,
  attempt_number integer not null,
  channel text not null,
  attempted_at timestamp with time zone null default now(),
  outcome text not null,
  duration integer null default 0,
  will_retry boolean null default false,
  next_retry_at timestamp with time zone null,
  retry_reason text null,
  voicemail_detected boolean null default false,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint call_attempts_pkey primary key (id),
  constraint call_attempts_call_log_id_fkey foreign KEY (call_log_id) references call_logs (id) on delete set null,
  constraint call_attempts_campaign_id_fkey foreign KEY (campaign_id) references campaigns (id) on delete set null,
  constraint call_attempts_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint call_attempts_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 4. call_logs

```sql
create table public.call_logs (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  lead_id uuid null,
  campaign_id uuid null,
  caller_id uuid null,
  status text null,
  duration integer null default 0,
  recording_url text null,
  ai_analysis jsonb null,
  created_at timestamp with time zone null default now(),
  call_sid text null,
  project_id uuid null,
  direction text null default 'outbound'::text,
  caller_number text null,
  callee_number text null,
  metadata jsonb null,
  call_status text null,
  notes text null,
  transferred boolean null default false,
  transferred_at timestamp with time zone null,
  transfer_reason text null,
  transfer_department text null,
  disconnect_reason text null,
  disconnect_notes text null,
  ended_at timestamp with time zone null,
  conversation_transcript text null,
  sentiment_score numeric(3, 2) null,
  interest_level text null,
  conversation_summary text null,
  constraint call_logs_pkey primary key (id),
  constraint call_logs_call_sid_key unique (call_sid),
  constraint call_logs_campaign_id_fkey foreign KEY (campaign_id) references campaigns (id),
  constraint call_logs_organization_id_fkey foreign KEY (organization_id) references organizations (id),
  constraint call_logs_project_id_fkey foreign KEY (project_id) references projects (id) on delete set null,
  constraint call_logs_lead_id_fkey foreign KEY (lead_id) references leads (id),
  constraint call_logs_caller_id_fkey foreign KEY (caller_id) references auth.users (id)
) TABLESPACE pg_default;
```

## 5. call_queue

```sql
create table public.call_queue (
  id uuid not null default gen_random_uuid (),
  campaign_id uuid null,
  lead_id uuid null,
  organization_id uuid null,
  status public.queue_status null default 'queued'::queue_status,
  attempt_count integer null default 0,
  max_attempts integer null default 3,
  next_retry_at timestamp with time zone null default now(),
  last_error text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint call_queue_pkey primary key (id),
  constraint call_queue_campaign_id_lead_id_key unique (campaign_id, lead_id),
  constraint call_queue_campaign_id_fkey foreign KEY (campaign_id) references campaigns (id) on delete CASCADE,
  constraint call_queue_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint call_queue_organization_id_fkey foreign KEY (organization_id) references organizations (id)
) TABLESPACE pg_default;
```

## 6. campaigns

```sql
create table public.campaigns (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  project_id uuid null,
  name text not null,
  description text null,
  status text null default 'draft'::text,
  start_date date null,
  end_date date null,
  time_start time without time zone null,
  time_end time without time zone null,
  metadata jsonb null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  total_calls integer null default 0,
  answered_calls integer null default 0,
  transferred_calls integer null default 0,
  avg_sentiment_score numeric(3, 2) null,
  constraint campaigns_pkey primary key (id),
  constraint campaigns_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint campaigns_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint campaigns_project_id_fkey foreign KEY (project_id) references projects (id) on delete set null
) TABLESPACE pg_default;
```

## 7. conversation_insights

```sql
create table public.conversation_insights (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  call_log_id uuid null,
  lead_id uuid null,
  overall_sentiment numeric(3, 2) null,
  sentiment_label text null,
  primary_emotion text null,
  intent text null,
  interest_level text null,
  objections jsonb null default '[]'::jsonb,
  budget_mentioned boolean null default false,
  budget_range text null,
  timeline_mentioned boolean null default false,
  timeline text null,
  key_phrases jsonb null default '[]'::jsonb,
  recommended_action text null,
  priority_score integer null,
  analyzed_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  constraint conversation_insights_pkey primary key (id),
  constraint conversation_insights_call_log_id_fkey foreign KEY (call_log_id) references call_logs (id) on delete CASCADE,
  constraint conversation_insights_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint conversation_insights_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 8. deals

```sql
create table public.deals (
  id uuid not null default extensions.uuid_generate_v4 (),
  lead_id uuid not null,
  property_id uuid null,
  organization_id uuid not null,
  name text not null,
  amount numeric(12, 2) null,
  stage text null,
  probability integer null,
  status text null default 'active'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint deals_pkey primary key (id),
  constraint deals_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint deals_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint deals_property_id_fkey foreign KEY (property_id) references properties (id) on delete set null,
  constraint deals_probability_check check (
    (
      (probability >= 0)
      and (probability <= 100)
    )
  )
) TABLESPACE pg_default;
```

## 9. follow_up_tasks

```sql
create table public.follow_up_tasks (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  lead_id uuid null,
  campaign_id uuid null,
  assigned_to uuid null,
  created_by uuid null,
  task_type text not null,
  title text not null,
  description text null,
  priority text not null default 'medium'::text,
  due_date timestamp with time zone not null,
  status text not null default 'pending'::text,
  completed_at timestamp with time zone null,
  context text null,
  ai_suggestion text null,
  source text null default 'manual'::text,
  outcome text null,
  outcome_notes text null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint follow_up_tasks_pkey primary key (id),
  constraint follow_up_tasks_assigned_to_fkey foreign KEY (assigned_to) references profiles (id) on delete set null,
  constraint follow_up_tasks_campaign_id_fkey foreign KEY (campaign_id) references campaigns (id) on delete set null,
  constraint follow_up_tasks_created_by_fkey foreign KEY (created_by) references profiles (id) on delete set null,
  constraint follow_up_tasks_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint follow_up_tasks_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 10. impersonation_sessions

```sql
create table public.impersonation_sessions (
  id uuid not null default gen_random_uuid (),
  admin_id uuid null,
  target_user_id uuid null,
  reason text null,
  active boolean null default true,
  created_at timestamp with time zone null default now(),
  ended_at timestamp with time zone null,
  constraint impersonation_sessions_pkey primary key (id),
  constraint impersonation_sessions_admin_id_fkey foreign KEY (admin_id) references auth.users (id),
  constraint impersonation_sessions_target_user_id_fkey foreign KEY (target_user_id) references auth.users (id)
) TABLESPACE pg_default;
```

## 11. invoices

```sql
create table public.invoices (
  id uuid not null default gen_random_uuid (),
  subscription_id uuid null,
  organization_id uuid not null,
  amount numeric(10, 2) not null,
  currency text null default 'INR'::text,
  status public.invoice_status null default 'draft'::invoice_status,
  invoice_number text null,
  invoice_date date null default CURRENT_DATE,
  due_date date null,
  paid_at timestamp with time zone null,
  payment_method_id uuid null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint invoices_pkey primary key (id),
  constraint invoices_invoice_number_key unique (invoice_number),
  constraint invoices_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint invoices_payment_method_id_fkey foreign KEY (payment_method_id) references payment_methods (id) on delete set null,
  constraint invoices_subscription_id_fkey foreign KEY (subscription_id) references subscriptions (id) on delete set null
) TABLESPACE pg_default;
```

## 12. lead_activities

```sql
create table public.lead_activities (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  lead_id uuid null,
  type text not null,
  content jsonb null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint lead_activities_pkey primary key (id),
  constraint lead_activities_created_by_fkey foreign KEY (created_by) references profiles (id) on delete set null,
  constraint lead_activities_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint lead_activities_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 13. lead_documents

```sql
create table public.lead_documents (
  id uuid not null default extensions.uuid_generate_v4 (),
  lead_id uuid not null,
  organization_id uuid not null,
  file_name text not null,
  file_url text not null,
  file_type text null,
  file_size integer null,
  document_type text null,
  uploaded_by uuid null,
  uploaded_at timestamp with time zone null default now(),
  constraint lead_documents_pkey primary key (id),
  constraint lead_documents_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint lead_documents_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint lead_documents_uploaded_by_fkey foreign KEY (uploaded_by) references auth.users (id),
  constraint lead_documents_document_type_check check (
    (
      document_type = any (
        array[
          'proposal'::text,
          'contract'::text,
          'brochure'::text,
          'presentation'::text,
          'other'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;
```

## 14. lead_forms

```sql
create table public.lead_forms (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid null,
  project_id uuid null,
  campaign_id uuid null,
  name text not null,
  schema jsonb not null default '[]'::jsonb,
  is_active boolean null default true,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint lead_forms_pkey primary key (id),
  constraint lead_forms_campaign_id_fkey foreign KEY (campaign_id) references campaigns (id),
  constraint lead_forms_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint lead_forms_organization_id_fkey foreign KEY (organization_id) references organizations (id),
  constraint lead_forms_project_id_fkey foreign KEY (project_id) references projects (id)
) TABLESPACE pg_default;
```

## 15. lead_interactions

```sql
create table public.lead_interactions (
  id uuid not null default extensions.uuid_generate_v4 (),
  lead_id uuid not null,
  organization_id uuid not null,
  type text not null,
  direction text null,
  subject text null,
  content text null,
  duration integer null,
  outcome text null,
  email_opened boolean null default false,
  email_clicked boolean null default false,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint lead_interactions_pkey primary key (id),
  constraint lead_interactions_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint lead_interactions_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint lead_interactions_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint lead_interactions_direction_check check (
    (
      direction = any (array['inbound'::text, 'outbound'::text])
    )
  ),
  constraint lead_interactions_type_check check (
    (
      type = any (
        array[
          'email'::text,
          'call'::text,
          'meeting'::text,
          'note'::text,
          'sms'::text,
          'whatsapp'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;
```

## 16. lead_profiles

```sql
create table public.lead_profiles (
  id uuid not null default extensions.uuid_generate_v4 (),
  lead_id uuid not null,
  organization_id uuid not null,
  company text null,
  job_title text null,
  location text null,
  industry text null,
  lead_score integer null default 0,
  engagement_level text null default 'cold'::text,
  budget_range text null,
  timeline text null,
  pain_points text[] null,
  competitor_mentions text[] null,
  preferred_contact_method text null,
  best_contact_time text null,
  preferences jsonb null default '{}'::jsonb,
  custom_fields jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  min_budget numeric(12, 2) null,
  max_budget numeric(12, 2) null,
  property_type_interest text null,
  sub_category_interest text null,
  mailing_street text null,
  mailing_city text null,
  mailing_state text null,
  mailing_zip text null,
  mailing_country text null,
  constraint lead_profiles_pkey primary key (id),
  constraint lead_profiles_lead_id_key unique (lead_id),
  constraint lead_profiles_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint lead_profiles_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint lead_profiles_engagement_level_check check (
    (
      engagement_level = any (array['hot'::text, 'warm'::text, 'cold'::text])
    )
  ),
  constraint lead_profiles_lead_score_check check (
    (
      (lead_score >= 0)
      and (lead_score <= 100)
    )
  )
) TABLESPACE pg_default;
```

## 17. lead_tags

```sql
create table public.lead_tags (
  id uuid not null default extensions.uuid_generate_v4 (),
  lead_id uuid not null,
  organization_id uuid not null,
  tag text not null,
  color text null default '#6B7280'::text,
  created_at timestamp with time zone null default now(),
  constraint lead_tags_pkey primary key (id),
  constraint lead_tags_lead_id_tag_key unique (lead_id, tag),
  constraint lead_tags_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint lead_tags_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 18. tasks

```sql
create table public.tasks (
  id uuid not null default extensions.uuid_generate_v4 (),
  lead_id uuid null,
  project_id uuid null,
  organization_id uuid not null,
  title text not null,
  description text null,
  due_date timestamp with time zone null,
  due_time text null,
  priority text null default 'medium'::text,
  status text null default 'pending'::text,
  assigned_to uuid null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  completed_at timestamp with time zone null,
  constraint tasks_pkey primary key (id),
  constraint tasks_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint tasks_updated_by_fkey foreign KEY (updated_by) references auth.users (id),
  constraint tasks_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint tasks_project_id_fkey foreign KEY (project_id) references projects (id) on delete SET NULL,
  constraint tasks_assigned_to_fkey foreign KEY (assigned_to) references auth.users (id),
  constraint tasks_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint tasks_priority_check check (
    (
      priority = any (array['low'::text, 'medium'::text, 'high'::text])
    )
  ),
  constraint tasks_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'completed'::text,
          'overdue'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;
```

## 19. leads

```sql
create table public.leads (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  project_id uuid null,
  name text not null,
  email text null,
  phone text null,
  source text null default 'manual'::text,
  status text null default 'new'::text,
  notes text null,
  call_log_id uuid null,
  call_status text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  metadata jsonb null,
  transferred_to_human boolean null default false,
  rejection_reason text null,
  abuse_flag boolean null default false,
  abuse_details text null,
  waiting_status text null,
  callback_time timestamp with time zone null,
  lead_source text null default 'Manual'::text,
  external_lead_id text null,
  raw_data jsonb null default '{}'::jsonb,
  stage_id uuid null,
  assigned_to uuid null,
  score integer null default 0,
  last_contacted_at timestamp with time zone null,
  interest_level text null,
  purchase_readiness text null,
  budget_range text null,
  total_calls integer null default 0,
  last_sentiment_score numeric(3, 2) null,
  engagement_score integer null default 0,
  mobile text null,
  title text null,
  department text null,
  avatar_url text null,
  constraint leads_pkey primary key (id),
  constraint leads_phone_project_unique unique (phone, project_id),
  constraint leads_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint leads_assigned_to_fkey foreign KEY (assigned_to) references profiles (id) on delete set null,
  constraint leads_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint leads_project_id_fkey foreign KEY (project_id) references projects (id) on delete set null,
  constraint leads_stage_id_fkey foreign KEY (stage_id) references pipeline_stages (id) on delete set null
) TABLESPACE pg_default;
```

## 20. notifications

```sql
create table public.notifications (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  type text not null,
  title text not null,
  message text not null,
  link text null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  metadata jsonb null default '{}'::jsonb,
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint notifications_type_check check (
    (
      type = any (
        array[
          'info'::text,
          'warning'::text,
          'success'::text,
          'error'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;
```

## 21. organizations

```sql
create table public.organizations (
  id uuid not null default gen_random_uuid (),
  name text not null,
  slug text null,
  tier public.org_tier null default 'free'::org_tier,
  settings jsonb null default '{}'::jsonb,
  sector text null default 'real_estate'::text,
  business_type text null,
  company_name text null,
  gstin text null,
  address_line_1 text null,
  address_line_2 text null,
  city text null,
  state text null,
  country text null default 'India'::text,
  pincode text null,
  contact_number text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  onboarding_status public.onboarding_status_enum not null default 'pending'::onboarding_status_enum,
  caller_id text null,
  currency text null,
  currency_symbol text null,
  constraint organizations_pkey primary key (id),
  constraint organizations_slug_key unique (slug)
) TABLESPACE pg_default;
```

## 22. payment_methods

```sql
create table public.payment_methods (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  type public.payment_method_type null default 'card'::payment_method_type,
  last4 text null,
  brand text null,
  expiry_month integer null,
  expiry_year integer null,
  is_default boolean null default false,
  gateway_customer_id text null,
  gateway_payment_method_id text null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint payment_methods_pkey primary key (id),
  constraint payment_methods_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 23. pipeline_stages

```sql
create table public.pipeline_stages (
  id uuid not null default gen_random_uuid (),
  pipeline_id uuid null,
  name text not null,
  order_index integer not null default 0,
  color text null default '#cbd5e1'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint pipeline_stages_pkey primary key (id),
  constraint pipeline_stages_pipeline_id_fkey foreign KEY (pipeline_id) references pipelines (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 24. pipelines

```sql
create table public.pipelines (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  name text not null,
  is_default boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint pipelines_pkey primary key (id),
  constraint pipelines_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 25. profiles

```sql
create table public.profiles (
  id uuid not null,
  organization_id uuid null,
  full_name text null,
  email text null,
  phone text null,
  avatar_url text null,
  metadata jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  role public.user_role null default 'employee'::user_role,
  manager_id uuid null,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint profiles_manager_id_fkey foreign KEY (manager_id) references profiles (id),
  constraint profiles_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete set null
) TABLESPACE pg_default;
```

## 26. projects

```sql
create table public.projects (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  name text not null,
  description text null,
  address text null,
  project_type text null,
  status text null default 'active'::text,
  metadata jsonb null,
  image_url text null,
  image_path text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint projects_pkey primary key (id),
  constraint projects_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint projects_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 27. properties

```sql
create table public.properties (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  project_id uuid null,
  title text not null,
  description text null,
  address text null,
  price numeric(12, 2) not null,
  size_sqft integer null,
  bedrooms integer null,
  bathrooms integer null,
  type text not null,
  status text not null default 'available'::text,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint properties_pkey primary key (id),
  constraint properties_created_by_fkey foreign KEY (created_by) references profiles (id) on delete set null,
  constraint properties_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint properties_project_id_fkey foreign KEY (project_id) references projects (id) on delete set null
) TABLESPACE pg_default;
```

## 28. property_features

```sql
create table public.property_features (
  id uuid not null default gen_random_uuid (),
  property_id uuid null,
  feature_name text not null,
  created_at timestamp with time zone null default now(),
  constraint property_features_pkey primary key (id),
  constraint property_features_property_id_fkey foreign KEY (property_id) references properties (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 29. property_images

```sql
create table public.property_images (
  id uuid not null default gen_random_uuid (),
  property_id uuid null,
  url text not null,
  is_featured boolean null default false,
  order_index integer null default 0,
  created_at timestamp with time zone null default now(),
  constraint property_images_pkey primary key (id),
  constraint property_images_property_id_fkey foreign KEY (property_id) references properties (id) on delete CASCADE
) TABLESPACE pg_default;
```

## 30. subscription_plans

```sql
create table public.subscription_plans (
  id uuid not null default gen_random_uuid (),
  name text not null,
  slug text not null,
  description text null,
  price_monthly numeric(10, 2) null default 0,
  price_yearly numeric(10, 2) null default 0,
  features jsonb not null default '{}'::jsonb,
  is_active boolean null default true,
  sort_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint subscription_plans_pkey primary key (id),
  constraint subscription_plans_slug_key unique (slug)
) TABLESPACE pg_default;
```

## 31. subscriptions

```sql
create table public.subscriptions (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  plan_id uuid not null,
  status public.subscription_status null default 'active'::subscription_status,
  billing_cycle public.billing_cycle null default 'monthly'::billing_cycle,
  current_period_start timestamp with time zone null default now(),
  current_period_end timestamp with time zone null default (now() + '1 mon'::interval),
  cancel_at_period_end boolean null default false,
  cancelled_at timestamp with time zone null,
  trial_ends_at timestamp with time zone null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint subscriptions_plan_id_fkey foreign KEY (plan_id) references subscription_plans (id)
) TABLESPACE pg_default;
```

## 32. usage_logs

```sql
create table public.usage_logs (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  feature_key text not null,
  usage_count integer null default 0,
  period_start date not null,
  period_end date not null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint usage_logs_pkey primary key (id),
  constraint usage_logs_organization_id_feature_key_period_start_period__key unique (
    organization_id,
    feature_key,
    period_start,
    period_end
  ),
  constraint usage_logs_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;
```


