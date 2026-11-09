# MabynAccounts

A single-administrator accounts workspace starter. Node.js 24 serves the sign-in
and dashboard pages and uses built-in SQLite. There are no npm dependencies.

## Run locally

Install Node.js 24 LTS and Git, then run:

```sh
git clone https://github.com/advumeshkumar1994/MabynAccounts.git
cd MabynAccounts
cp .env.example .env
```

In Windows PowerShell use `Copy-Item .env.example .env` for the last line.
Open `.env`, replace `ADMIN_EMAIL` and set a unique random password of at least
16 characters. To generate one, run
`node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"`.
Save the password in your password manager. Run `npm start`, open
[localhost:3000](http://localhost:3000), and sign in. Check
[/healthz](http://localhost:3000/healthz) for an `ok` response.

| Variable | Purpose |
| --- | --- |
| `ADMIN_EMAIL` | Single administrator login |
| `ADMIN_PASSWORD` | Required secret, 16 characters minimum |
| `PORT` | Local default 3000. Render supplies the hosted port. |
| `DB_PATH` | Local default `./data/mabyn.sqlite`. Set to the mounted disk in hosting. |
| `NODE_ENV` | Docker sets `production`, enabling HTTPS-only session cookies and binding to all interfaces. |

## Structure and behavior

- `src/server.js` serves sign-in, sign-out, protected dashboard and health check.
  Password checks use scrypt. Session tokens are random, stored as hashes and
  expire after eight hours. A restart clears sessions. The single instance
  accepts up to ten login checks per minute across all callers.
- `db/schema.sql` bootstraps SQLite. The dashboard reads record counts for
  accounts, invoices and payments. These tables are placeholders with amounts
  in integer paise. Entry, editing, double-entry bookkeeping and reports still
  need implementation. Future schema changes need explicit migrations.
- `Dockerfile` builds the hosted runtime from the same source.

## Deploy from GitHub to Render

1. Sign in to [Render](https://dashboard.render.com), select **New → Web Service**,
   connect your GitHub account and grant Render access to **MabynAccounts**.
2. Select the repository, branch **main**, and runtime **Docker**. Leave the root
   directory at the repository root. Use `./Dockerfile` and the default Docker
   command. Select a paid instance that supports a persistent disk.
3. In the environment settings add `ADMIN_EMAIL`, `ADMIN_PASSWORD` and
   `DB_PATH=/var/data/mabyn.sqlite`. Enter the password as a secret in Render.
   Keep the service at one instance and leave the platform port in place.
4. In **Advanced**, add a persistent disk mounted at `/var/data` and set the
   health check path to `/healthz`. Create the service.
5. Wait for the deploy to report **Live**. Open the assigned HTTPS URL,
   check `/healthz`, sign in, verify the three dashboard cards, then sign out.
   Confirm that opening `/dashboard` sends you back to sign-in. Enable auto-deploy
   from `main` if you want subsequent GitHub pushes deployed automatically.

See Render's [web service setup](https://render.com/docs/web-services),
[persistent disk setup](https://render.com/docs/disks), and
[health checks](https://render.com/docs/health-checks). Keep credentials and
SQLite data outside Git. Before using business data, set up and test SQLite
backups and add the access controls and accounting features your workflow needs.

## Integration backlog

These are proposed integrations. Each needs implementation as well as credentials.

| Integration | What is needed |
| --- | --- |
| Payment collections | Payment provider sandbox/live API credentials and webhook signing secret |
| Bank reconciliation | Bank or statement-feed provider access, scoped credentials and consent where required |
| GST e-invoicing | Authorized IRP/GSP account and API credentials |
| Transactional email | Email provider API key or SMTP credentials and a verified sender domain |
| Team sign-in | Identity provider tenant/client credentials, callback setup and application role mapping |

No third-party credentials are required for the starter.
