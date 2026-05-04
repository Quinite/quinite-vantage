# Quinite Vantage Database Documentation

> **Last Updated**: February 7, 2026  
> **Database**: PostgreSQL 17.6.1  
> **Environment**: Supabase

## Overview

This database powers the Quinite Vantage CRM and Real Estate Management platform. It's designed as a multi-tenant system with Row Level Security (RLS) for data isolation between organizations.

## Quick Links

- [Schema Documentation](./schema/) - Detailed table documentation
- [RLS Policies](./rls-policies.md) - Security policies
- [Triggers](./triggers.md) - Automated behaviors
- [Functions](./functions.md) - Database functions
- [Relationships](./relationships.md) - Entity relationships

## Database Structure

### Core Domains

| Domain | Tables | Purpose |
|--------|--------|---------|
| **Core** | `organizations`, `profiles` | Multi-tenancy and user management |
| **CRM** | `leads`, `pipelines`, `pipeline_stages`, `lead_*` | Customer relationship management |
| **Inventory** | `projects`, `properties`, `property_*` | Real estate inventory management |
| **Calling** | `call_logs`, `campaigns`, `call_*`, `conversation_insights` | AI calling and campaign management |
| **Billing** | `subscriptions`, `invoices`, `payment_methods`, `subscription_plans` | Subscription and billing |
| **System** | `audit_logs`, `notifications` | System operations |

## Key Features

### Multi-Tenancy

- Organization-based data isolation
- RLS policies on all tables
- Helper function `get_auth_org_id()` for policy enforcement

### Security

- 60+ RLS policies
- Role-based access control (platform_admin, super_admin, manager, employee)
- Audit logging for sensitive operations

### Automation

- 13 triggers for:
  - Auto-updating `updated_at` timestamps
  - Syncing project unit counts
  - Calculating lead scores
  - Generating invoice numbers

### Data Integrity

- Foreign key constraints with CASCADE DELETE where appropriate
- Check constraints for data validation
- Unique constraints for business rules

## Custom Types (Enums)

| Enum Type | Values | Used In |
|-----------|--------|---------|
| `user_role` | platform_admin, super_admin, manager, employee | `profiles.role` |
| `user_status` | invited, active, suspended, archived | User management |
| `org_tier` | free, pro, enterprise | `organizations.tier` |
| `onboarding_status_enum` | pending, completed | `organizations.onboarding_status` |
| `subscription_status` | active, cancelled, past_due, trialing, inactive | `subscriptions.status` |
| `billing_cycle` | monthly, yearly | `subscriptions.billing_cycle` |
| `invoice_status` | draft, open, paid, void, uncollectible | `invoices.status` |
| `payment_method_type` | card, upi, bank_transfer, razorpay, stripe | `payment_methods.type` |
| `queue_status` | queued, processing, completed, failed | `call_queue.status` |

## Database Statistics

- **Total Tables**: 30+
- **Total RLS Policies**: 60+
- **Total Triggers**: 13
- **Total Functions**: 10+
- **Total Enums**: 9

## Getting Started

### For Developers

1. **Read the schema docs**: Start with [Core Tables](./schema/01-core-tables.md)
2. **Understand RLS**: Review [RLS Policies](./rls-policies.md)
3. **Check relationships**: See [Relationships](./relationships.md)

### For Database Administrators

1. **Review migrations**: Check [migrations/README.md](../migrations/README.md)
2. **Run diagnostics**: Use `SYSTEM_DIAGNOSTIC.sql`
3. **Export schema**: Use `export_complete_schema.sql`

## Important Notes

> [!WARNING]
>
> - Always use the admin client for server-side operations to avoid RLS recursion
> - Never hardcode organization IDs - always use `get_auth_org_id()`
> - Test RLS policies thoroughly before deploying

> [!IMPORTANT]
>
> - The `properties` table uses CASCADE DELETE on `project_id` foreign key
> - Lead scoring is automatically updated via triggers
> - Project unit counts are synced automatically when properties change

## Support

For questions or issues:

- Check [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md)
- Check [SETUP_GUIDE.md](../SETUP_GUIDE.md)
- Run [SYSTEM_DIAGNOSTIC.sql](../SYSTEM_DIAGNOSTIC.sql) for troubleshooting
