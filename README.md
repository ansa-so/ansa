# ansa

A fair-source AI chatbot platform with RAG (Retrieval-Augmented Generation) capabilities. Build, customize, and deploy AI agents with your own knowledge base.

Read the source, self-host it, modify it, send patches. You cannot offer it as a competing commercial service. Each release becomes Apache 2.0 two years after publication — see [LICENSE](LICENSE).

![License](https://img.shields.io/badge/license-FSL--1.1--Apache--2.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)

## ✨ Features

- **Multiple AI Agents** - Create and manage multiple AI assistants with different configurations
- **Knowledge Base** - Upload documents (PDF, DOCX, TXT), add text content, or create Q&A pairs
- **RAG Pipeline** - Automatic chunking, embedding generation, and vector search for context-aware responses
- **Customizable Widget** - Embed a chat widget on any website with customizable appearance
- **Multi-Model Support** - Works with OpenAI, Anthropic Claude, and local models via Ollama
- **Team Collaboration** - Invite team members to collaborate on your agents
- **Usage Tracking** - Built-in usage metering with plan-based limits
- **Self-Hosted Ready** - Deploy on your own infrastructure with Docker

## 🏗️ Architecture

```
ansa/
├── apps/
│   ├── api/          # Hono.js API server
│   ├── dashboard/    # Next.js admin dashboard
│   └── widget/       # Embeddable chat widget (Vite)
├── packages/
│   ├── db/           # Drizzle ORM schema & migrations
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components
```

## 🚀 Quick Start

### Option 1: Docker (Recommended for Self-Hosting)

```bash
# Clone the repository
git clone https://github.com/ansa-so/ansa.git
cd ansa

# Copy environment file and configure
cp .env.example .env

# IMPORTANT: Generate secure secrets (hex avoids special characters that break URLs)
echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" >> .env

# Start all services
docker compose up -d

# Wait for postgres to be ready, then set up database
docker compose exec postgres psql -U ansa -d ansa -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run database migrations (from inside the API container)
docker compose exec api pnpm db:push

# Seed the marketplace tools (optional but recommended)
docker compose exec api npx tsx apps/api/scripts/seed-marketplace.ts

# Restart the API to apply changes
docker compose restart api
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### Option 2: Local Development

**Prerequisites:**
- Node.js >= 20
- pnpm >= 9
- PostgreSQL with pgvector extension (or use Docker for just Postgres)
- Ollama (optional, for local LLM)

```bash
# Clone the repository
git clone https://github.com/ansa-so/ansa.git
cd ansa

# Install dependencies
pnpm install

# Start PostgreSQL with pgvector (using Docker)
docker compose up postgres -d

# Enable pgvector extension
docker compose exec postgres psql -U ansa -d ansa -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Copy and configure environment (single .env file in root)
cp .env.example .env
# Edit .env - for local dev, update DATABASE_URL to use localhost:
# DATABASE_URL=postgresql://ansa:postgres@localhost:5432/ansa

# Generate a secure auth secret
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env

# Run database migrations
cd packages/db && pnpm drizzle-kit push && cd ../..

# (Optional) Start Ollama for local LLM
ollama serve &
ollama pull llama3.1:8b       # Chat model
ollama pull nomic-embed-text  # Embedding model for RAG

# Start all development servers with a single command
pnpm dev
```

This starts all services using the single `.env` file from the root directory:
- **API** at [http://localhost:3001](http://localhost:3001)
- **Dashboard** at [http://localhost:3000](http://localhost:3000)
- **Widget** at [http://localhost:3002](http://localhost:3002)

### Setting up Ollama for Local Models

To use local LLM models instead of cloud APIs, you need Ollama running:

**Option A: Install Ollama natively (recommended for development)**
```bash
# macOS
brew install ollama

# Start Ollama server
ollama serve

# In another terminal, pull the required models
ollama pull qwen2.5:7b        # Chat model (best for tool support)
ollama pull nomic-embed-text  # Embedding model for RAG
```

**Option B: Use Docker**
```bash
# Start Ollama container
docker compose --profile ollama up -d ollama

# Pull the required models
docker compose exec ollama ollama pull qwen2.5:7b
docker compose exec ollama ollama pull nomic-embed-text
```

**Required Models:**

| Model | Purpose | Size |
|-------|---------|------|
| `qwen2.5:7b` | Chat/completion (recommended) | ~4.7GB |
| `nomic-embed-text` | Embeddings for RAG | ~274MB |

> **Note:** `qwen2.5:7b` is recommended as it has the best support for tool/function calling among local models. The embedding model is optional - if not installed, chat will work but without RAG context from your documents.

Once Ollama is running, local models will automatically appear in the model dropdown on the Agents page.

## ⚙️ Configuration

### Demo Account for Local Screenshots

The seed script creates a local account populated with realistic data, for taking
documentation screenshots or exercising the dashboard against believable content.

It creates a **real, loginable account** and wipes any existing one with the same
address, so it refuses to run unless you supply credentials and `DATABASE_URL`
points at a local database:

```bash
SCREENSHOT_EMAIL=demo@localhost \
SCREENSHOT_PASSWORD='<pick something>' \
  pnpm --filter @ansa/api seed:screenshots
```

To capture the screenshots, point the crawler at your local dashboard using the
same credentials:

```bash
BASE_URL=http://localhost:3000 \
TEST_EMAIL=demo@localhost \
TEST_PASSWORD='<same as above>' \
  pnpm docs:screenshots
```

> Never run either script against a production database. The seed script deletes
> the existing account and all of its agents before recreating it.

This creates a complete demo account with:
- 50 conversations (60-90 days of history)
- ~200 messages with confidence scores
- Rich knowledge base (15 Q&A sources, 40+ questions)
- 5 proactive triggers
- 2 tools with sample form submissions
- Various conversation statuses and channels

Run this script whenever you need fresh demo data for screenshots or testing. The script is idempotent and will wipe/recreate the account if it already exists.

### Configuration is read at runtime

The dashboard resolves its client configuration when the container starts, not
when the image is built. `apps/dashboard/scripts/write-runtime-config.mjs` writes
`public/runtime-config.js` from the environment, and the page loads it before any
application code.

That means one image works in every environment — change `API_URL` and restart,
no rebuild. It also means published images are usable as-is rather than being
tied to whoever built them.

For local development the same script runs via `predev`, so `pnpm dev` matches.
Regenerate by hand with:

```bash
pnpm --filter @ansa/dashboard config:write
```

### Environment Variables

`BETTER_AUTH_SECRET` is the only variable required to start the Docker stack. Set
at least one AI provider before creating an agent. Optional integrations can stay
empty.

#### Core and URLs

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `production` in Docker |
| `SELF_HOSTED` | Disable cloud billing and usage limits | `true` |
| `BETTER_AUTH_SECRET` | Session secret, at least 32 characters | Required |
| `DATABASE_URL` | PostgreSQL connection string for local development | - |
| `POSTGRES_USER` | PostgreSQL username used by Docker | `ansa` |
| `POSTGRES_PASSWORD` | PostgreSQL password used by Docker | `postgres` |
| `POSTGRES_DB` | PostgreSQL database used by Docker | `ansa` |
| `PORT` | API listening port outside Docker | `3001` |
| `UPLOADS_DIR` | Directory used for chat attachments | `./uploads/attachments` |
| `API_URL` | Public API URL | `http://localhost:3001` |
| `DASHBOARD_URL` | Public dashboard URL and allowed CORS origin | `http://localhost:3000` |
| `WIDGET_URL` | Widget application URL | `http://localhost:3002` |
| `CDN_URL` | Widget asset URL | `http://localhost:3002` |
| `DOCS_URL` | Documentation URL | `https://docs.ansa.so` in Docker |
| `PROJECT_NAME` | Product name shown by the dashboard | `Ansa` |
| `DASHBOARD_AGENT_ID` | Agent used by the support widget on the dashboard | - |

#### AI providers and models

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI chat and embedding API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `GOOGLE_API_KEY` | Google Gemini API key | - |
| `OLLAMA_API_BASE` | Ollama OpenAI-compatible URL | - |
| `DEFAULT_MODEL` | Default model for new agents | `gpt-4o-mini` |
| `MODEL_FAST` | Model used for the Fast quality tier | `gpt-4o-mini` |
| `MODEL_BALANCED` | Model used for the Balanced quality tier | `gpt-4o` |
| `MODEL_HIGH_QUALITY` | Model used for the High Quality tier | `claude-sonnet-4-20250514` |

#### Auth, email, and integrations

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials | - |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials | - |
| `RESEND_API_KEY` | Resend API key | - |
| `EMAIL_FROM` | Verified sender used for outgoing email | - |
| `EMAIL_INBOUND_DOMAIN` | Domain used by the email channel | `mail.ansa.so` |
| `RESEND_WEBHOOK_SECRET` | Resend webhook signing secret | - |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | Shopify app credentials | - |
| `SHOPIFY_SCOPES` | Requested Shopify OAuth scopes | `read_orders,write_orders,read_customers,read_products` |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Facebook Messenger app credentials | - |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe API and webhook secrets | - |
| `STRIPE_PRICE_STARTER_MONTHLY` / `STRIPE_PRICE_STARTER_YEARLY` | Starter price IDs | - |
| `STRIPE_PRICE_GROWTH_MONTHLY` / `STRIPE_PRICE_GROWTH_YEARLY` | Growth price IDs | - |
| `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY` | Pro price IDs | - |
| `POSTHOG_KEY` | Dashboard PostHog project key | - |
| `POSTHOG_API_KEY` | API PostHog project key | - |
| `POSTHOG_HOST` | PostHog host | `https://us.i.posthog.com` |
| `PROXY_BLOCKED_IPS` | Comma-separated IP addresses rejected by the proxy guard | - |
| `PROXY_BLOCKED_PATTERNS` | Comma-separated request patterns rejected by the proxy guard | - |

### LLM Providers

**Ollama (Local, Free)**
```env
OLLAMA_API_BASE=http://localhost:11434/v1
DEFAULT_MODEL=qwen2.5:7b
MODEL_FAST=qwen2.5:7b
MODEL_BALANCED=qwen2.5:7b
MODEL_HIGH_QUALITY=qwen2.5:7b
```

When Ansa and Ollama both run through Docker Compose, use
`OLLAMA_API_BASE=http://ollama:11434/v1` instead.

**OpenAI**
```env
OPENAI_API_KEY=sk-your-key
```

**Anthropic Claude**
```env
ANTHROPIC_API_KEY=sk-ant-your-key
```
### Shopify Integration

Ansa integrates with Shopify to provide AI-powered customer support for e-commerce stores. The integration includes order lookup, customer context, product search, and refund handling.

#### Setup

1. **Environment Variables**
```env
SHOPIFY_CLIENT_ID=your-client-id
SHOPIFY_CLIENT_SECRET=your-client-secret
SHOPIFY_SCOPES=read_orders,write_orders,read_customers,read_products
```

2. **App Configuration**

The Shopify app is configured via `shopify.app.toml` in the repository root. To deploy configuration changes:

```bash
# Install Shopify CLI
npm install -g @shopify/cli @shopify/app

# Deploy app configuration (webhooks, scopes, etc.)
shopify app deploy
```

3. **Compliance Webhooks (GDPR/CCPA)**

The app automatically handles mandatory compliance webhooks:
- `customers/data_request` - Export customer data on request
- `customers/redact` - Delete customer data on request
- `shop/redact` - Delete all shop data 48h after uninstall

These are configured in `shopify.app.toml` and handled by the API at `/shopify/webhooks`.

#### Features

| Feature | Description |
|---------|-------------|
| **Order Lookup** | AI can look up orders by number, email, or phone |
| **Customer Context** | Automatic customer identification and history |
| **Product Search** | Search products by type, color, size, availability |
| **Refund Requests** | AI-assisted refund processing with approval workflow |
| **Widget Injection** | Auto-inject chat widget on Shopify storefronts |
## �️ Database Commands

### Running Migrations

**Local Development:**
```bash
# Apply schema changes using Drizzle
pnpm db:push

# Run a raw SQL migration file
pnpm db:sql packages/db/drizzle/0008_add-confidence-score.sql
```

**Docker:**
```bash
# Apply schema changes
docker compose exec api pnpm db:push

# Run a raw SQL migration file
docker compose exec api pnpm db:sql packages/db/drizzle/0008_add-confidence-score.sql
```

### Generating Migrations

```bash
# Generate SQL migrations from schema changes
pnpm db:generate
```

## �📖 API Documentation

API documentation is available at `/api/docs` when running the API server.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | Send a message to an agent |
| `GET` | `/agents` | List all agents |
| `POST` | `/agents` | Create a new agent |
| `POST` | `/documents` | Upload a document |
| `GET` | `/conversations` | List conversations |

## 🎨 Widget Integration

Embed the chat widget on any website:

```html
<script>
  window.ansaConfig = {
    agentId: "your-agent-id",
    apiUrl: "https://your-api-url.com"
  };
</script>
<script src="https://your-widget-url.com/widget.js" async></script>
```

### Releasing Widget Updates

When you release a new version of the widget, the embed.js file is uploaded to Cloudflare R2 and the CDN cache is automatically purged.

**Setup Cloudflare CDN Purging:**

1. Get your **Zone ID** from the Cloudflare dashboard (Overview page of your domain)
2. Create an **API Token** with `Cache Purge` permissions:
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Click "Create Token"
   - Use the "Purge Cache" template or create a custom token with `Zone.Cache Purge` permission

3. Add to your `.env` file:
   ```env
   CLOUDFLARE_ZONE_ID=your-zone-id
   CLOUDFLARE_API_TOKEN=your-api-token
   ```

4. Release the widget:
   ```bash
   cd apps/widget
   pnpm release
   ```

This will build the embed script, upload it to R2, and purge the CDN cache for `cdn.ansa.so`.

## 🛒 Shopify Integration

Ansa can be installed as a Shopify app to provide AI-powered customer support for Shopify stores.

### Setup

1. **Create a Shopify App** in the [Shopify Partner Dashboard](https://partners.shopify.com):
   - Create a new app
   - Set the App URL to your dashboard URL (e.g., `https://ansa.so`)
   - Set the Allowed redirection URL(s) to `{API_URL}/shopify/callback` (e.g., `https://api.ansa.so/shopify/callback`)
   - Copy the Client ID and Client Secret

2. **Configure Environment Variables**:
   ```env
   SHOPIFY_CLIENT_ID=your-client-id
   SHOPIFY_CLIENT_SECRET=your-client-secret
   SHOPIFY_SCOPES=read_orders,write_orders,read_customers,write_script_tags,read_products
   ```

3. **Install the App** on a Shopify store by navigating to:
   ```
   {API_URL}/shopify/install?shop={store-name}.myshopify.com
   ```

   For example:
   ```
   https://api.ansa.so/shopify/install?shop=my-store.myshopify.com
   ```

4. **Complete OAuth Flow**: The user will be redirected to Shopify to authorize the app, then back to select a billing plan.

### Shopify Billing

Shopify Billing API is used for stores installed from the Shopify App Store. Requirements:
- App must have **public distribution** enabled in Partner Dashboard
- Development stores may have billing restrictions

For development/testing, you can use Stripe billing instead by directing users to the regular `/choose-plan` page.

## 📧 Email Channel

Enable your AI agents to respond to emails automatically. Customers can email your agent, and it will generate and send AI-powered responses.

### How It Works

1. **Forward emails** to your agent's unique inbound address (e.g., `agent-abc123@mail.ansa.so`)
2. The AI processes the email content and generates a response
3. A reply is sent from your verified domain with proper email threading

### Setup

1. **Configure Resend** for email sending:
   ```env
   RESEND_API_KEY=re_xxxxx
   EMAIL_INBOUND_DOMAIN=mail.ansa.so
   RESEND_WEBHOOK_SECRET=whsec_xxxxx  # Optional: verify webhook signatures
   ```

2. **Set up Resend Inbound Webhook**:
   - Go to [Resend Webhooks](https://resend.com/webhooks)
   - Create a webhook pointing to `{API_URL}/email/inbound`
   - Select the `email.received` event

3. **Configure DNS** for your inbound domain:
   - Add MX record pointing to Resend's inbound servers
   - See [Resend Inbound Documentation](https://resend.com/docs/dashboard/webhooks/inbound-emails)

4. **Verify your sending domain** in the dashboard:
   - Go to Integrations → Email
   - Enter your reply email address
   - Click "Verify Domain" and add the DNS records shown

### Features

- **Thread Continuity**: AI maintains conversation context across email threads
- **Email Threading**: Proper `In-Reply-To` headers for email client threading
- **Access Control**: Whitelist domains and block specific senders
- **Customization**: Configure display name, signature, AI disclaimer, and more

## ⏱️ Background Jobs

Ansa runs several automated background jobs (cron jobs) to maintain and analyze your data. These jobs run automatically within the API container.

### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| **Recap Emails** | Hourly (`:00`) | Sends daily/weekly summary emails to users with agent performance metrics |
| **Webhook Retries** | Every minute | Retries failed webhook deliveries for form submissions |
| **Auto-close Conversations** | Every 5 minutes | Automatically closes inactive conversations based on channel-specific timeouts (widget: 60min, email: 48h) |
| **Question Clustering** | Daily at 2:00 AM | Groups similar questions using semantic similarity, tracks conversion rates and confidence scores for analytics |

### Manual Execution

You can trigger background jobs manually:

**Local Development:**
```bash
# Run question clustering (processes up to 50 agents by default)
pnpm --filter api tsx scripts/cluster-questions.ts
```

**Docker:**
```bash
# Run question clustering
docker compose exec api tsx scripts/cluster-questions.ts

# Process specific agent
docker compose exec api node -e "import('./scripts/cluster-questions.js').then(m => m.main({ agentId: 'your-agent-id' }))"

# Process limited batch
docker compose exec api node -e "import('./scripts/cluster-questions.js').then(m => m.main({ batchLimit: 10 }))"
```

**API Endpoint:**
```bash
# Trigger clustering via API (requires authentication)
curl -X POST https://your-api-url/analytics/cluster \
  -H "Content-Type: application/json" \
  -d '{"agentId": "your-agent-id"}'
```

> **Note:** Question clustering requires user messages to have embeddings generated. Embeddings are created automatically when users send messages if you have configured `OPENAI_API_KEY` or are using Ollama with an embedding model.

## 🛠️ Development

```bash
# Run all apps in development mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint

# Build all packages
pnpm build
```

### Database Migrations

The project uses Drizzle ORM for database migrations. Run these from the project root:

```bash
# Apply pending migrations (recommended)
pnpm db:migrate

# Generate a new migration from schema changes
pnpm db:generate

# Open Drizzle Studio to browse/edit data
pnpm db:studio
```

**Creating a new migration:**

1. Modify the schema in `packages/db/src/schema.ts`
2. Run `pnpm db:generate` to create a migration SQL file
3. Review the generated SQL in `packages/db/drizzle/`
4. Run `pnpm db:migrate` to apply

**Best practices for migrations:**
- Use `IF NOT EXISTS` / `IF EXISTS` to make migrations idempotent
- Test migrations on a local database first
- Migrations are tracked in the `drizzle.__drizzle_migrations` table

## 👑 Admin Dashboard

Platform admins can access a dedicated KPI dashboard at `/admin` showing business growth metrics:
- User growth and signups
- MRR and subscriptions by plan
- Conversation volume
- LLM costs by tier and model

### Setting Up Admin Users

Admin access is controlled via the `role` column on the `users` table. To grant admin access:

```bash
# Local development
psql "$DATABASE_URL" -c "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"

# Docker
docker compose exec postgres psql -U ansa -d ansa -c "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

The admin link will appear in the sidebar for users with admin role.

## 🚢 Production Deployment (Docker)

### Security Considerations

⚠️ **IMPORTANT**: Before deploying to production:

1. **Set a strong database password** - Never use the default `ansa:postgres`
2. **PostgreSQL is not exposed publicly** - The database is only accessible from other Docker containers
3. **To access the database locally**, use: `docker compose exec postgres psql -U ansa -d ansa`
4. **Generate secure secrets**: `openssl rand -hex 32`

### Initial Setup

After deploying with Docker Compose, you need to set up the database:

```bash
# 1. Enable pgvector extension (REQUIRED for embeddings)
docker compose exec postgres psql -U ansa -d ansa -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 2. Run database migrations (inside the API container)
docker compose exec api sh -c 'cd /app/packages/db && pnpm db:push'

# 3. Seed the marketplace tools (optional but recommended)
docker compose exec api npx tsx apps/api/scripts/seed-marketplace.ts

# 4. Restart the API to apply changes
docker compose restart api
```

> **Note:** PostgreSQL is not exposed to the host by default for security. Use `docker compose exec` to access it.

### Updating an Existing Deployment

When updating to a new version:

```bash
# Pull latest changes
git pull

# Rebuild and restart containers
docker compose up -d --build --remove-orphans

# Run any new migrations
docker compose exec api sh -c 'cd /app/packages/db && pnpm db:push'

# Re-seed marketplace (updates existing tools, adds new ones)
docker compose exec api npx tsx apps/api/scripts/seed-marketplace.ts
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the Functional Source License 1.1 (Apache 2.0 Future License) - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

For security concerns, please see [SECURITY.md](SECURITY.md) or open a private advisory.
