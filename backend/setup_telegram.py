"""
Laxigam Telegram setup.

Configures the bot end-to-end through the Bot API, so nothing has to be
clicked through in @BotFather except creating the bot itself:

    python setup_telegram.py             # full setup
    python setup_telegram.py --status    # show bot, webhook and menu button state
    python setup_telegram.py --remove-webhook

Reads from .env (never hardcode tokens):
    TELEGRAM_BOT_TOKEN       required
    MINI_APP_URL             https URL of the deployed frontend (Mini App)
    BACKEND_PUBLIC_URL       https URL of the API; webhook = <url>/telegram/webhook
    TELEGRAM_WEBHOOK_SECRET  shared secret Telegram sends with every update
"""

import argparse
import asyncio
import os
import secrets
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
MINI_APP_URL = os.getenv("MINI_APP_URL") or os.getenv("TELEGRAM_MINI_APP_URL", "")
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

# Must stay in sync with handle_bot_command() in main.py
COMMANDS = [
    {"command": "start", "description": "Welcome & create wallet"},
    {"command": "app", "description": "Open the Laxigam Mini App"},
    {"command": "balance", "description": "Check LXG balance"},
    {"command": "deposit", "description": "Buy LXG (UPI / PIX / QIWI / Alipay / TON)"},
    {"command": "withdraw", "description": "Cash out to your bank"},
    {"command": "transfer", "description": "Move LXG to a game wallet"},
    {"command": "help", "description": "Commands & support"},
]

DESCRIPTION = (
    "Laxigam is the gaming-to-bank bridge for BRICS+.\n\n"
    "🎮 Earn in games → 🪙 hold LXG → 🏦 cash out to UPI, PIX, QIWI or Alipay.\n"
    "🛡 Every transaction is checked by dual-AI validation and confirmed with a one-time PIN.\n\n"
    "Tap Start to open your wallet."
)
SHORT_DESCRIPTION = "Gaming-to-bank bridge for BRICS+. Earn in games, cash out to UPI, PIX, QIWI & Alipay."


class Bot:
    def __init__(self, token: str, client: httpx.AsyncClient):
        self.base = f"https://api.telegram.org/bot{token}"
        self.client = client

    async def call(self, method: str, **params):
        response = await self.client.post(f"{self.base}/{method}", json=params, timeout=15.0)
        data = response.json()
        if not data.get("ok"):
            raise RuntimeError(f"{method} failed: {data.get('description', response.text)}")
        return data["result"]


def ok(msg: str):
    print(f"  ✅ {msg}")


def warn(msg: str):
    print(f"  ⚠️  {msg}")


def require_https(name: str, url: str) -> bool:
    if not url:
        warn(f"{name} is not set - skipping")
        return False
    if not url.startswith("https://"):
        warn(f"{name} must be https:// for Telegram (got {url}) - skipping")
        return False
    return True


async def setup(bot: Bot):
    me = await bot.call("getMe")
    print(f"\n🤖 Configuring @{me['username']} ({me['first_name']})\n")

    await bot.call("setMyCommands", commands=COMMANDS)
    ok(f"{len(COMMANDS)} commands registered")

    await bot.call("setMyDescription", description=DESCRIPTION)
    await bot.call("setMyShortDescription", short_description=SHORT_DESCRIPTION)
    ok("Description and short description set")

    if require_https("MINI_APP_URL", MINI_APP_URL):
        await bot.call(
            "setChatMenuButton",
            menu_button={"type": "web_app", "text": "Open Laxigam", "web_app": {"url": MINI_APP_URL}},
        )
        ok(f"Menu button → {MINI_APP_URL}")

    if require_https("BACKEND_PUBLIC_URL", BACKEND_PUBLIC_URL):
        secret = TELEGRAM_WEBHOOK_SECRET
        if not secret:
            secret = secrets.token_urlsafe(32)
            warn("TELEGRAM_WEBHOOK_SECRET was empty - generated one. Add this line to .env and restart the API:")
            print(f"\n     TELEGRAM_WEBHOOK_SECRET={secret}\n")
        webhook_url = f"{BACKEND_PUBLIC_URL.rstrip('/')}/telegram/webhook"
        await bot.call(
            "setWebhook",
            url=webhook_url,
            secret_token=secret,
            allowed_updates=["message", "callback_query", "pre_checkout_query"],
            drop_pending_updates=True,
        )
        ok(f"Webhook → {webhook_url}")

    print("\n🚀 Done. Open your bot in Telegram and send /start.\n")


async def status(bot: Bot):
    me = await bot.call("getMe")
    webhook = await bot.call("getWebhookInfo")
    menu = await bot.call("getChatMenuButton")

    print(f"\n🤖 @{me['username']}  (id {me['id']})")
    print(f"   Webhook:      {webhook.get('url') or '— not set —'}")
    print(f"   Pending:      {webhook.get('pending_update_count', 0)} updates")
    if webhook.get("last_error_message"):
        print(f"   Last error:   {webhook['last_error_message']}")
    menu_url = menu.get("web_app", {}).get("url")
    print(f"   Menu button:  {menu.get('type')}{f' → {menu_url}' if menu_url else ''}\n")


async def main():
    parser = argparse.ArgumentParser(description="Configure the Laxigam Telegram bot")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--status", action="store_true", help="show current bot configuration")
    group.add_argument("--remove-webhook", action="store_true", help="delete the webhook (e.g. for local polling)")
    args = parser.parse_args()

    if not TELEGRAM_BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and add the token from @BotFather.")
        sys.exit(1)

    async with httpx.AsyncClient() as client:
        bot = Bot(TELEGRAM_BOT_TOKEN, client)
        try:
            if args.status:
                await status(bot)
            elif args.remove_webhook:
                await bot.call("deleteWebhook", drop_pending_updates=False)
                ok("Webhook removed")
            else:
                await setup(bot)
        except RuntimeError as error:
            print(f"❌ {error}")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
