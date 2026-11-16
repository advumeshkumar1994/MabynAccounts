# AI Marketing Bot — Meta & Google Ads (approval-first)

Standalone Node.js 20+ dashboard and API in a subfolder of MabynAccounts. Existing project code is untouched.

## What works now
- Browser dashboard for creating campaign drafts
- Meta and Google campaign categories (mock, not connected)
- Budget validation ₹1,000–₹3,000/day
- Draft → pending approval → approved (mock) or rejected
- Demonstration-only performance metrics and audit history
- Local bearer-token authentication, JSON persistence, no external spending

**No live API calls, OAuth, ad publishing, AI model calls or real performance reporting are implemented.** The approval action changes internal state only. No ad account is touched.

## Run on Windows / macOS / Linux
1. Install Node.js 20 or newer.
2. Open a terminal in `ai-marketing-bot`.
3. Set a long unique token (never commit it):
   - PowerShell: `$env:ADMIN_TOKEN="replace-with-a-random-secret-of-32-characters"`
   - macOS/Linux: `export ADMIN_TOKEN="replace-with-a-random-secret-of-32-characters"`
4. Run `npm test` and then `npm start`.
5. Open http://127.0.0.1:3100 and unlock with the token.

Health check: http://127.0.0.1:3100/health

## API
- `GET /health` (public)
- `GET /api/state`
- `POST /api/campaigns` body: `{"platform":"meta","name":"Launch","dailyBudget":1500,"copy":"Premium cosmetics in India"}`
- `POST /api/campaigns/:id/submit`
- `POST /api/campaigns/:id/approve`
- `POST /api/campaigns/:id/reject`
- `POST /api/campaigns/:id/insights` (synthetic demo numbers)

All /api endpoints require `Authorization: Bearer <ADMIN_TOKEN>`.

## Architecture / production handoff
Dashboard (static HTML/JS) → Node HTTP API → approval state machine → local JSON store.
For production: replace JSON with PostgreSQL, add user sessions/RBAC, CSRF protection, request throttling, HTTPS and secure secrets management. Never expose the local admin token publicly. Current server binds to loopback only.

**Meta integration:** register Meta Developer App, request appropriate Marketing API permissions and business verification where applicable, implement server-side OAuth with state/PKCE where supported, securely store tokens, map ad accounts, validate creative/policy, then submit approved campaigns using the Marketing API. Confirm live status with provider response and retain external IDs.

**Google Ads integration:** configure Google Cloud OAuth client, obtain Google Ads developer token and account access, securely handle refresh tokens, map customer IDs, create campaigns/ad groups/assets with Google Ads API after human approval, then reconcile status and metrics.

Use a separate explicit **publish** operation after approval, with immutable approved payload hash, role checks, idempotency keys, per-account caps, spend guardrails and full audit logging. Do not automatically publish on approval. Add scheduling, monitoring, retry handling and provider policy checks.

## Deployment
This is a local development MVP, **not safe to expose directly on the internet**. Before deploying to Render/Railway/VPS, complete the production security and persistence work above, configure secret environment variables and HTTPS, then connect provider credentials. GitHub is source control, not hosting.

## Tests
`npm test` validates approval transitions, platform selection and budget limits.
