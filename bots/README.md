# Modular Bot Starter

A dependency-free Node.js bot runner. Runs locally in **dry-run mode** by default and never posts ads, sends messages or spends money.

## Requirements
Node.js 20+.

## Quick start
```bash
node bots/cli.mjs list
node bots/cli.mjs run lead-followup
node bots/cli.mjs run campaign-review
node bots/cli.mjs run content-planner
node --test bots/*.test.mjs
```

## Supported starter bots
- **lead-followup**: drafts a response to an inbound lead; does not send it.
- **campaign-review**: reviews sample ad metrics; recommends changes, never publishes or spends.
- **content-planner**: generates a sample content plan for the MABYN app; does not publish.

Bot data in `bots/sample-data.json` is demonstration-only. Replace sample data with approved, authenticated integrations before production. Avoid putting customer data or secrets in source control.

## Safety and production checklist
- Add authentication, encrypted secret storage, approved integrations and audit history.
- Add opt-in/consent checks before sending customer messages.
- Require human approval before publishing, charging, spending or making account changes.
- Add provider rate-limit handling, error monitoring and retry policies.
- A running process/hosting is required for scheduled automation; GitHub storage alone does not execute bots.

This folder is separate from the existing MabynAccounts application.
