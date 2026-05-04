# Quinite Vantage

**Next.js Business Operating System** - A comprehensive SaaS platform for CRM, Project Management, Property Inventory, and AI-Powered Telephony.

---

## 🚀 Quick Start

Get up and running in 3 simple steps:

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the schema in Supabase SQL Editor:
   - Execute `database/schema.sql`
   - Execute `database/seed.sql`
3. Copy your Supabase credentials to `.env`

### 3. Configure Environment

```bash
cp .env.example .env
```

Fill in your credentials:

- **Supabase**: URL and Anon Key
- **OpenAI**: API Key (for AI calling)
- **Plivo**: Auth ID and Token (for telephony)

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentation

Comprehensive guides are available in the [`docs/`](./docs/) folder:

- 📖 [**Database Setup**](./docs/setup/DATABASE.md) - Complete database schema documentation
- 🛠️ [**Installation Guide**](./docs/setup/INSTALLATION.md) - Step-by-step setup instructions
- 🔧 [**Environment Variables**](./docs/setup/ENVIRONMENT.md) - Configuration reference
- 📡 [**API Documentation**](./docs/development/API.md) - API endpoints and usage
- 🚨 [**Troubleshooting**](./docs/development/TROUBLESHOOTING.md) - Common issues and solutions

---

## 🌟 Key Features

### CRM & Lead Management

- **Pipeline Management**: Kanban-style deal tracking with customizable stages
- **Lead Activities**: Complete timeline of interactions and notes
- **Smart Sync**: Automatic synchronization between list view and Kanban board
- **Form Builder**: Create custom lead capture forms

### AI-Powered Calling

- **Conversational AI**: OpenAI Realtime API for natural phone conversations
- **Auto-Qualification**: AI qualifies leads and transfers to humans
- **Call Queue**: Asynchronous processing with retry logic
- **Transcription & Analysis**: Full call transcripts with AI insights

### Property Inventory

- **Listings Management**: Track properties with images, features, and pricing
- **Multi-Project Support**: Organize properties by development projects
- **Status Tracking**: Available, Sold, Reserved, Rented

### Billing & Subscriptions

- **Flexible Plans**: Free, Pro, and Enterprise tiers
- **Usage Tracking**: Monitor AI calls, projects, and user limits
- **Payment Integration**: Razorpay and Stripe support
- **Invoice Generation**: Automatic invoice numbering and tracking

### Enterprise Features

- **Multi-Tenancy**: Complete organization isolation
- **Role-Based Access**: Granular permissions system
- **Audit Logs**: Track all user actions
- **Impersonation**: Admin support mode

---

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI Realtime API
- **Telephony**: Plivo
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Hooks
- **Real-time**: WebSockets (Plivo Media Streams)

---

## 📊 Database Schema

The database consists of 20+ tables organized into modules:

- **Core**: `organizations`, `profiles`, `roles`
- **CRM**: `leads`, `pipelines`, `pipeline_stages`, `campaigns`, `lead_activities`
- **Calling**: `call_logs`, `call_queue`
- **Inventory**: `properties`, `property_images`, `property_features`
- **Billing**: `subscriptions`, `subscription_plans`, `invoices`, `payment_methods`
- **System**: `audit_logs`, `usage_logs`

See [Database Schema Documentation](./docs/setup/DATABASE.md) for complete details.

---

## 🔐 Security

- **Row Level Security (RLS)**: All tables protected with Supabase RLS
- **Organization Isolation**: Complete data separation between tenants
- **Secure Functions**: SECURITY DEFINER functions for safe operations
- **Audit Trail**: All actions logged for compliance

---

## 🚢 Deployment

See [Deployment Guide](./docs/deployment/PRODUCTION.md) for production setup instructions.

---

## 📝 License

Proprietary - Quinite Technologies

---

## 🤝 Support

For issues and questions:

- Check [Troubleshooting Guide](./docs/development/TROUBLESHOOTING.md)
- Review [API Documentation](./docs/development/API.md)
- Contact: <support@quinite.co>

---

**Built with ❤️ by Quinite Technologies**
