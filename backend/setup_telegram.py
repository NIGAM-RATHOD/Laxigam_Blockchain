import os
import asyncio
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration (Uses environment variables - NO HARDCODED TOKENS)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
MINI_APP_URL = os.getenv("MINI_APP_URL")

async def setup_bot():
    """ Setup Telegram Bot commands and description """
    if not TELEGRAM_BOT_TOKEN:
        print("❌ Error: TELEGRAM_BOT_TOKEN not found in .env file.")
        return

    print("🚀 Setting up Laxigam Telegram Bot...")
    
    async with httpx.AsyncClient() as client:
        # 1. Set Bot commands
        commands_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setMyCommands"
        commands_data = {
            "commands": [
                {"command": "start", "description": "Welcome & create wallet"},
                {"command": "balance", "description": "Check LXG balance"},
                {"command": "deposit", "description": "Add funds (UPI/PIX/QIWI/Alipay/TON)"},
                {"command": "withdraw", "description": "Cash out to bank"},
                {"command": "transfer", "description": "Send LXG to game or friend"},
                {"command": "help", "description": "Support & Documentation"}
            ]
        }
        
        response = await client.post(commands_url, json=commands_data)
        if response.status_code == 200:
            print("✅ Bot commands set successfully.")
        else:
            print(f"❌ Failed to set commands: {response.text}")

        # 2. Set Bot description
        description_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setMyDescription"
        description_data = {
            "description": "Laxigam: The Gaming-to-Bank bridge for BRICS+ nations. Earn in games, cash out to UPI, PIX, QIWI, and more."
        }
        
        response = await client.post(description_url, json=description_data)
        if response.status_code == 200:
            print("✅ Bot description set successfully.")

        # 3. Set Mini App Menu Button
        # (Requires bot token to be set up as a Mini App bot in @BotFather)
        print("\n💡 NOTE: To link your Mini App, go to @BotFather:")
        print(f"1. /setmenubutton")
        print(f"2. Select your bot")
        print(f"3. Paste your URL: {MINI_APP_URL}")
        print(f"4. Name it: Laxigam App")

if __name__ == "__main__":
    asyncio.run(setup_bot())
