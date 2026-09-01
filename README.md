# AI Back-Office Agent for African SMEs — v1

WhatsApp-first AI back-office for small businesses in Ghana and Nigeria.

## v1 Features

| Module | Capabilities |
|--------|-------------|
| **Auth** | Phone/email login, session cookies, tenant isolation |
| **Invoicing** | Create via AI, detail view, printable HTML/PDF, send via WhatsApp |
| **Payments** | Record, bank CSV import, auto-match to invoices, unmatched queue |
| **Tax** | Monthly VAT/WHT summary (GRA prep, report only) |
| **Payroll** | Employee list, monthly gross/net with SSNIT placeholder |
| **Compliance** | Deadline tracking, mark complete, auto overdue detection |
| **WhatsApp** | Inbound webhook + outbound invoice delivery |
| **Agent** | 8 tools, mock + live (OpenAI) modes, audit log |

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

1. Open http://localhost:3000/login
2. Sign in with `+233241234567` (demo owner)
3. Try the AI chat or WhatsApp test endpoint

## Agent Tools (8)

| Tool | Example command |
|------|----------------|
| `create_invoice` | "Create an invoice for Kofi, 1,200 GHS for web design" |
| `send_invoice` | "Send invoice INV-001 via WhatsApp" |
| `list_unpaid_invoices` | "Show unpaid invoices this month" |
| `record_payment` | "Record payment of 520 GHS for INV-002" |
| `import_bank_statement` | Paste CSV in chat or use Payments → Import CSV |
| `compute_vat_wht_summary` | "How much VAT do I owe for July?" |
| `prepare_payroll` | "Prepare payroll for my staff" |
| `list_compliance_events` | "Show compliance deadlines" |

## WhatsApp Setup

```env
WHATSAPP_VERIFY_TOKEN=your-token
WHATSAPP_ACCESS_TOKEN=your-meta-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
APP_URL=https://your-domain.com
```

Webhook URL: `https://your-domain.com/api/whatsapp/webhook`

Test locally:
```bash
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Show unpaid invoices this month"}'
```

## Bank CSV Import

Upload via **Payments → Import CSV** or ask the agent. Sample format in `public/sample-bank-statement.csv`:

```
Date,Description,Amount,Reference
2026-07-15,MTN MoMo from Kwame,400,INV-002
```

Auto-matches by reference (INV-xxx) or exact amount.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite or PostgreSQL connection |
| `SESSION_SECRET` | Cookie signing secret |
| `DEFAULT_BUSINESS_ID` | From seed output |
| `APP_URL` | Public URL for invoice links |
| `AGENT_MODE` | `mock` or `live` |
| `OPENAI_API_KEY` | Required for live agent |

## License

MIT
