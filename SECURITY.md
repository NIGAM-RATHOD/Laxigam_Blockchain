# Security Policy

Laxigam moves real money between games, a blockchain and bank rails, so we take security reports seriously.

## Reporting a vulnerability

**Please do not open a public issue.** Report privately through
[GitHub Security Advisories](https://github.com/NIGAM-RATHOD/Laxigam_Blockchain/security/advisories/new).

Include:

- the affected component (contract, API endpoint, bot, frontend)
- steps to reproduce or a proof of concept
- the impact you believe it has

We aim to acknowledge reports within 72 hours and to agree on a disclosure timeline with you.

## Scope

In scope: everything in this repository — `contracts/`, `backend/`, `frontend/`, and the Telegram webhook.

Especially valuable:

- signature replay or forgery against `MediatorVault` / `AIValidator`
- bypassing PIN verification or Trust Score limits
- forged Telegram webhook updates
- leakage of API keys, bot tokens or oracle keys

## Operational guidance for deployers

- Never commit `.env`. Rotate any key that has ever been pushed.
- Set `ORACLE_PRIVATE_KEY` explicitly; the code falls back to a **public Hardhat test key** for local development only.
- Set `TELEGRAM_WEBHOOK_SECRET` (or let `backend/setup_telegram.py` generate one) so the API rejects forged bot updates.
- Restrict `CORS_ORIGINS` to your frontend domains in production.
- `VITE_*` variables are shipped to the browser — never put secrets in them.
