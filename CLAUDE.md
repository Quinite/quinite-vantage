# Quinite Vantage — Frontend (Next.js)

## Project Overview

**Quinite Vantage** is a multi-tenant SaaS platform for AI-powered real estate sales automation. It enables organizations to manage leads, run automated AI voice call campaigns, track property inventory, and handle billing — all targeted at the Indian real estate market.

**Companion service:** `../quinite-vantage-webserver` handles the actual AI voice call WebSocket bridging (Plivo ↔ OpenAI Realtime).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase / PostgreSQL with RLS |
| Auth | Supabase Auth (email/password) |
| Styling | TailwindCSS + Radix UI |
| State | TanStack React Query v5 + React Context |
| Payments | Razorpay (INR, India-only) |
| Voice/Calling | Plivo + OpenAI Voice API |
| Forms | React Hook Form + Zod |
| Testing | Vitest |
| Icons | Lucide React |

---

## Feature Flows

### 1. Authentication & Onboarding
- **Entry:** `/` — signin/signup tabs
- **Signup:** `POST /api/auth/signup` → email confirmation → `/onboarding`
- **Onboarding:** 5-step wizard (Sector → Business Type → Company Details → Address → Review)
  - Creates `organizations` + `organization_profiles` rows
- **Auth Context:** `contexts/AuthContext.js` — manages `user`, `profile`, `loading`
- **Middleware:** `middleware.js` — rate limits (500/min), validates Supabase token, sets `x-user-id`/`x-user-email` headers
- **API protection:** `lib/middleware/withAuth.js` wraps handlers; `withPermission()` for RBAC

### 2. CRM — Leads
- **Pages:** `/dashboard/admin/crm/leads` (list), `/dashboard/admin/crm/leads/[id]` (profile)
- **Lead profile:** full interaction history, tasks, call logs, AI metadata, pipeline stage, deals, site visits
- **Bulk ops:** `POST /api/leads/bulk-update`
- **Upload:** `POST /api/leads/upload` (CSV via papaparse)
- **Call initiation:** `POST /api/leads/[id]/call`

### 3. CRM — Deals
- **API:** `POST /api/deals`, `PATCH /api/deals/[id]`, `DELETE /api/deals/[id]`
- **Per-unit deals:** `GET /api/inventory/units/[id]/deals`
- **Per-lead deals:** `GET /api/leads/[id]/deals`
- **Statuses:** `interested` → `negotiation` → `reserved` → `won` | `lost`
- **Unit sync:** deal status changes automatically update unit status:
  - `reserved` → unit becomes `reserved`
  - `won` → unit becomes `sold`
  - `lost` → unit reverts to `available` (if no other active deals)
- **Constraints:** only one `reserved` and one `won` deal per unit (DB unique partial indexes); making a new deal `reserved` demotes the existing one to `negotiation`
- **Auto-creation:** booking a site visit with a `unit_id` auto-creates a deal with `status: 'interested'` and `interest_source: 'site_visit'`
- **Amount tracking:** `deal.amount` = negotiated price; separate from unit's listed `total_price`; `UnitDealsPanel` shows sold vs. listed price comparison on won deals
- **Permissions:** `view_deals`, `manage_deals`, `delete_deals`
- **Service:** `services/deal.service.js` — CRUD, stats, auto-create from site visit
- **Components:** `components/crm/AddDealDialog.jsx`, `components/inventory/unit-dialog/UnitDealsPanel.jsx`, `components/crm/leads/tabs/LeadDealsTab.jsx`

### 4. CRM — Site Visits
- **API:** `POST /api/leads/[id]/site-visits`, `GET /api/leads/[id]/site-visits`, `GET /api/crm/site-visits`
- **Statuses:** `scheduled`, `completed`, `cancelled`, `no_show`
- **Booking a visit with `unit_id`** auto-creates a deal for that lead+unit pair (idempotent)
- **Pipeline stage gates:** `lib/site-visit-stages.js` matches stage names by pattern (e.g. "Site Visit Scheduled", "Site Visit Done") to auto-advance the lead's pipeline stage
- **Outcomes:** completing a visit records `outcome` (interested | not_interested | follow_up_needed)
- **Components:** `components/crm/site-visits/` — SiteVisitCard, BookSiteVisitDialog, SiteVisitOutcomeDialog; `components/inventory/unit-dialog/SiteVisitsPanel.jsx`
- **Hooks:** `hooks/useSiteVisits.js` — `useSiteVisits(leadId)`, `useUnitSiteVisits(unitId)`, `useAllSiteVisits(filters)`

### 5. CRM — Tasks
- **Pages:** `/dashboard/admin/crm/tasks`
- **API:** `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/[id]`
- **Lead-scoped tasks:** `GET/POST /api/leads/[id]/tasks`
- **Visibility is permission-scoped:**
  - `view_all_tasks` — all org tasks
  - `view_team_tasks` — tasks on leads assigned to user + tasks assigned to user
  - `view_own_tasks` — tasks created_by or assigned_to current user
- **Fields:** title, description, due_date, due_time, priority, status, assigned_to, lead_id, project_id, completed_at

### 6. CRM — Campaigns (AI Call Automation)
- **Pages:** `/dashboard/admin/crm/campaigns`
- **Create campaign:** select project, leads, AI script, language, time window, voice
- **Start:** `POST /api/campaigns/[id]/start` → enqueues leads into `call_queue` in webserver DB
- **Progress tracking:** `GET /api/campaigns/[id]/progress` (polled)
- **Cancel:** `POST /api/campaigns/[id]/cancel`
- **Call logs:** `GET /api/campaigns/[id]/logs`
- **AI script:** stored in `campaigns.ai_script`, multilingual (English, Hindi, Gujarati)

### 7. CRM — Calls
- **Live calls:** `/dashboard/admin/crm/calls/live` — real-time monitoring
- **Call history:** `/dashboard/admin/crm/calls/history` — full call log with transcript, sentiment, AI metadata
- **Webhooks from Plivo:** `POST /api/webhooks/plivo/answer|hangup|status|recording|transfer`

### 8. Inventory (Projects & Units)
- **Pages:** `/dashboard/inventory`
- **Projects:** create/edit/archive/restore; tied to `organization_id`
  - `public_visibility: true` + org `public_profile_enabled: true` = visible in public API
- **Units:** per project, with tower/floor/config/price/amenities
- **Unit configs:** `category` field = `residential` | `commercial` | `land` — controls which fields show in the dialog and how the visual grid renders
- **Generate inventory:** `POST /api/projects/[id]/generate-inventory` (bulk create from config)
- **Visual grid** (`components/inventory/VisualUnitGrid.js`):
  - Tower tabs → floor rows (top to bottom) → unit slots
  - Config palette on left; select config then click slot to "paint" a unit
  - **Plots section:** if project has any `land` category config, a "Plots / Land" section appears below the floor grid; plots are stored with `tower_id = null, floor_number = null` and survive tower deletion
  - Selecting a land config activates the plots section slot (amber); floor slots are inactive
- **Unit Dialog** (`components/inventory/UnitDialog.js`): 3 tabs — Unit Details (form) · Deals · Site Visits
  - Land units: show only `plot_area`; residential: carpet/built-up/super + bedrooms/bathrooms/balconies
  - Pricing: `base_price + floor_rise_price + plc_price = total_price`
- **Unit Detail Sheet** (`components/inventory/UnitDetailSheet.jsx`): read-only side sheet, triggered from deal cards and other non-edit contexts; always fetches full unit data by ID regardless of prop data
- **API:** `GET/POST /api/inventory/units`, `GET/PATCH/DELETE /api/inventory/units/[id]`, `PATCH /api/inventory/units/[id]/status`
- **Hooks:** `hooks/useInventory.js` — towers + units grouped by tower_id, full CRUD mutations; `hooks/useUnitDeals.js` — `useUnitDeals(unitId)`, `useUnitDealsInvalidate()`

### 9. Public Website API
- **Route:** `GET /api/projects/public?slug=<org_slug>&limit=<n>`
- **Requirements:** org must have `public_profile_enabled: true`; project must have `public_visibility: true`
- **Returns:** `id, name, description, address, status, image_url, total_units, available_units, min_price, max_price, project_status, city, locality, possession_date, rera_number, amenities`
- **CORS:** uses `corsJSON()` from `lib/cors.js`
- **Public project page:** `/p/[slug]/project/[projectId]` — server-rendered, 404 if `public_visibility` is false
- **Website settings:** `Settings → Website` configures `slug`, `public_profile_enabled`, SEO meta

### 10. Pipeline (CRM)
- **Pages:** `/dashboard/admin/crm/pipelines`
- **Kanban board:** `components/crm/PipelineBoard.js` (drag-drop via @dnd-kit)
- **Stages:** configurable per pipeline, leads move between stages

### 11. Billing & Subscriptions
- **Pages:** `/dashboard/admin/billing`
- **Plans:** Starter / Professional / Enterprise
- **Credits:** call credit balance, purchased separately
- **Payment:** Razorpay order → verify → webhook confirms
  - `POST /api/billing/payment/razorpay/create-order`
  - `POST /api/billing/payment/razorpay/verify`
  - `POST /api/billing/payment/razorpay/webhook`
- **Invoices:** auto-generated on payment

### 12. Permissions & Roles
- **Context:** `contexts/PermissionContext.js` — `hasPermission()`, `hasAnyPermission()`
- **API:** `GET /api/permissions/my-permissions`
- **Role hierarchy:** Owner > Admin > Member
- **User-level overrides** stored in `user_permissions`
- **Deal permissions:** `view_deals`, `manage_deals`, `delete_deals`
- **Task permissions:** `view_tasks`, `view_all_tasks`, `view_team_tasks`, `view_own_tasks`

### 13. Admin (Platform-level)
- **User management:** invite, update, deactivate
- **Impersonation:** `POST /api/platform/impersonate` — audit-logged
- **Audit logs:** `/dashboard/admin/audit` — full action trail
- **Organization management**

### 14. Analytics
- **Pages:** `/dashboard/admin/analytics`
- **Campaign performance:** call stats, sentiment trends, interest levels
- **Charts:** Recharts library

---

## Directory Structure

```
app/
├── page.js                    # Auth page
├── layout.js                  # Root layout (providers)
├── onboarding/page.js         # Org setup wizard
├── p/[slug]/                  # Public website pages
│   └── project/[projectId]/   # Public project detail page
├── dashboard/
│   ├── layout.js              # Dashboard shell (PermissionProvider)
│   └── admin/
│       ├── crm/               # CRM module
│       │   ├── leads/         # Lead list + [id] profile
│       │   ├── campaigns/     # Campaign management
│       │   ├── calls/live|history
│       │   ├── pipelines/
│       │   ├── tasks/
│       │   └── insights/
│       ├── inventory/         # Property inventory
│       ├── analytics/
│       ├── audit/
│       ├── settings/website/  # Public profile + SEO settings
│       └── billing/
├── api/
│   ├── auth/
│   ├── leads/
│   │   └── [id]/
│   │       ├── deals/
│   │       ├── site-visits/
│   │       └── tasks/
│   ├── deals/                 # POST + [id] PATCH/DELETE
│   ├── campaigns/
│   ├── billing/
│   ├── crm/
│   │   └── site-visits/       # Org-wide site visits
│   ├── projects/
│   │   └── public/            # Public projects API (CORS)
│   ├── inventory/
│   │   └── units/[id]/
│   │       ├── deals/
│   │       ├── status/
│   │       └── site-visits/
│   ├── tasks/
│   ├── admin/
│   ├── permissions/
│   ├── organization/settings/
│   ├── webhooks/plivo/
│   └── webhooks/payment/
components/
├── admin/                     # AdminHeader, AdminSidebar, CrmSidebar
├── crm/
│   ├── site-visits/           # SiteVisitCard, BookSiteVisitDialog, etc.
│   ├── leads/tabs/            # LeadDealsTab, LeadTasksTab, etc.
│   ├── AddDealDialog.jsx
│   └── PipelineBoard.js
├── inventory/
│   ├── unit-dialog/           # IdentitySection, PricingSection, UnitDealsPanel, SiteVisitsPanel
│   ├── UnitDialog.js          # Tabbed unit edit dialog (Details · Deals · Site Visits)
│   ├── UnitDetailSheet.jsx    # Read-only unit viewer (Sheet)
│   ├── VisualUnitGrid.js      # Tower/floor grid + plots section
│   └── FloorPlanLand.js       # Standalone land-only view (legacy)
├── billing/                   # BillingPlansManagement
├── ui/                        # Radix UI wrappers (button, dialog, sheet, drawer, etc.)
└── providers/ReactQueryProvider.js
contexts/
├── AuthContext.js             # User + profile state
└── PermissionContext.js       # Feature permissions
lib/
├── middleware/withAuth.js     # API auth wrapper
├── site-visit-stages.js       # Pipeline stage name pattern matching
├── inventory.js               # formatINR, getInventoryStats, buildEmptyFloorSlots, etc.
├── cors.js                    # corsJSON() helper
├── supabase/                  # Server vs. client Supabase helpers
└── utils/
    └── currency.js            # formatCurrency()
hooks/
├── useInventory.js            # Towers + units CRUD, grouped by tower_id
├── useUnitDeals.js            # useUnitDeals(unitId), useUnitDealsInvalidate()
├── useSiteVisits.js           # Lead + unit + org-wide site visit hooks
└── ...                        # useCRMDashboard, useLeads, useProjects, etc.
services/
├── deal.service.js            # Deal CRUD, stats, auto-create from site visit
└── unit.service.js            # Unit CRUD + config management
supabase/
├── migrations/                # All DB migrations including 20260426_deals_revamp.sql
└── schema_latest.sql          # Current full schema reference
```

---

## Database Tables (Key)

| Table | Purpose |
|---|---|
| `organizations` | Tenant root record; `public_profile_enabled` controls public website |
| `profiles` | User profiles (extends auth.users) |
| `roles` / `role_permissions` / `user_permissions` | RBAC |
| `audit_logs` | Action trail (includes impersonation) |
| `projects` | Real estate projects; `public_visibility` controls public API inclusion |
| `towers` | Tower structure per project (name, total_floors, units_per_floor) |
| `units` | Property units; `tower_id=null` = plot/land unit |
| `unit_configs` | Unit type templates; `category` = residential\|commercial\|land |
| `deals` | Lead-unit relationships; status drives unit status sync |
| `site_visits` | Scheduled/completed property viewings for leads |
| `campaigns` | AI call campaigns (script, schedule, settings) |
| `leads` | Lead records (name, phone, stage, assigned_to) |
| `call_logs` | Full call records (transcript, sentiment, AI metadata) |
| `lead_interactions` | Interaction history (calls, notes) |
| `tasks` | Tasks (standalone, lead-linked, or project-linked) |
| `pipelines` / `pipeline_stages` | Kanban configuration |
| `subscriptions` / `invoices` / `payments` | Billing |
| `call_credits` | Credit balance per org |
| `notifications` | User notifications |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
PLIVO_AUTH_ID=
PLIVO_AUTH_TOKEN=
NEXT_PUBLIC_SITE_URL=
OPENAI_API_KEY=
```

---

## Coding Conventions

- **API routes:** Use `withAuth(handler)` for protected endpoints; `withPermission(featureKey)` for RBAC
- **Client data fetching:** Use TanStack React Query hooks from `hooks/`; default `staleTime: 30s`
- **Forms:** React Hook Form + Zod schema validation
- **Permissions check:** `usePermission('feature.key')` from `contexts/PermissionContext.js`
- **Toasts:** `import { toast } from 'react-hot-toast'` — used throughout (not sonner)
- **Components:** Radix UI primitives from `components/ui/`; Tailwind for styling
- **Side sheets:** Use `Sheet` from `components/ui/sheet` (Radix-based, slides from right) — see `TowerDrawer.js` as pattern
- **Currency formatting:** Use `formatINR()` from `lib/inventory.js` for INR display (Cr/L); use `formatCurrency()` from `lib/utils/currency.js` for full formatted strings
- **Supabase client:** `lib/supabase/` — separate server vs. client helpers; API routes use `createAdminClient()` for service-role operations
- **No MongoDB** — the `mongodb` package is a legacy dependency, all data is in Supabase/PostgreSQL

---

## Key Commands

```bash
# Development
yarn dev

# Build
yarn build

# Start production
yarn start

# Run tests
yarn test
```
