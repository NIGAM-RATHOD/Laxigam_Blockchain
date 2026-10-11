# Contributing to Laxigam

Thanks for your interest! This guide gets you from clone to pull request.

## Repository layout

| Path | What lives there | Stack |
|------|------------------|-------|
| `contracts/` | LXG token, MediatorVault, GameBridge, TrustScore, AIValidator, Governance, NFT marketplace | Solidity 0.8.20, Hardhat, OpenZeppelin 5 |
| `backend/` | REST API, Mediator service, payment rails, Telegram bot webhook, oracle signer | Python 3.11, FastAPI |
| `frontend/` | Web app and Telegram Mini App | React 18, Vite, Tailwind |
| `docs/` | API, deployment, game integration, Mediator spec | Markdown |

## Local setup

```bash
cp .env.example .env              # fill in what you need

npm install                       # contracts
npx hardhat test

cd backend && pip install -r requirements.txt
uvicorn main:app --reload         # http://localhost:8000/docs

cd ../frontend && npm install
npm run dev                       # http://localhost:3000
```

### Telegram bot (optional)

1. Create a bot with [@BotFather](https://t.me/BotFather) and put the token in `TELEGRAM_BOT_TOKEN`.
2. Expose the API and frontend over https (for example with `cloudflared tunnel` or `ngrok`) and set `BACKEND_PUBLIC_URL` and `MINI_APP_URL`.
3. Run `python backend/setup_telegram.py`. It registers commands, descriptions, the menu button and the webhook.
4. Check the result with `python backend/setup_telegram.py --status`.

## Making a change

1. Branch from `main`: `git checkout -b feat/pix-refunds`
2. Keep commits focused. We use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
3. Contract changes need tests in `test/`.
4. New environment variables go in `.env.example` with a comment.
5. Open a PR. CI must be green before review.

## Adding a payment rail

1. Add `backend/payments/<country>_<rail>.py` with an async `create_*_payment` method.
2. Route it in `create_gateway_payment()` in `backend/mediator_service.py`.
3. Add it to `PAYMENT_METHODS` in `frontend/src/pages/Mediator.jsx` and to the rails list on the landing page.
4. Document it in the README's payment methods section.

## Code of conduct

Be respectful and constructive. Harassment of any kind is not tolerated.
