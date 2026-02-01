"""
Telegram Stars Payment Integration
Handles Telegram Stars payments for in-app purchases
"""

import os
from datetime import datetime
from typing import Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_PAYMENT_TOKEN = os.getenv("TELEGRAM_PAYMENT_TOKEN", "")

# Conversion rate: 100 Stars = 10 LXG (configurable)
STARS_TO_LXG_RATE = float(os.getenv("STARS_TO_LXG_RATE", "0.1"))

class TelegramStarsPayment:
    """Telegram Stars Payment Handler"""
    
    def __init__(self):
        self.bot_token = TELEGRAM_BOT_TOKEN
        self.payment_token = TELEGRAM_PAYMENT_TOKEN
        
    def stars_to_lxg(self, stars: int) -> float:
        """Convert Telegram Stars to LXG"""
        return stars * STARS_TO_LXG_RATE
    
    def lxg_to_stars(self, lxg: float) -> int:
        """Convert LXG to Telegram Stars"""
        return int(lxg / STARS_TO_LXG_RATE)
    
    async def create_stars_invoice(
        self,
        chat_id: int,
        title: str,
        description: str,
        stars_amount: int,
        payload: str,
        photo_url: Optional[str] = None
    ) -> Dict:
        """
        Create a Telegram Stars invoice
        
        Args:
            chat_id: Telegram chat ID
            title: Invoice title
            description: Invoice description
            stars_amount: Amount in Telegram Stars
            payload: Internal payload for tracking
            photo_url: Optional product photo
            
        Returns:
            Dict with invoice details
        """
        if not self.bot_token:
            return self._demo_invoice(chat_id, stars_amount)
        
        lxg_amount = self.stars_to_lxg(stars_amount)
        
        url = f"https://api.telegram.org/bot{self.bot_token}/createInvoiceLink"
        
        invoice_payload = {
            "title": title,
            "description": description,
            "payload": payload,
            "provider_token": "",  # Empty for Stars payments
            "currency": "XTR",  # Telegram Stars currency code
            "prices": [{"label": "LXG Tokens", "amount": stars_amount}],
            "photo_url": photo_url or "https://laxigam.com/logo.png",
            "photo_size": 512,
            "photo_width": 512,
            "photo_height": 512,
            "need_name": False,
            "need_phone_number": False,
            "need_email": False,
            "need_shipping_address": False,
            "is_flexible": False
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=invoice_payload, timeout=30.0)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("ok"):
                    return {
                        "success": True,
                        "invoice_link": result["result"],
                        "stars_amount": stars_amount,
                        "lxg_amount": lxg_amount,
                        "payload": payload,
                        "instructions": [
                            "Click the invoice link",
                            "Pay with Telegram Stars",
                            f"You will receive {lxg_amount:.2f} LXG"
                        ]
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("description", "Unknown error")
                    }
            else:
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }
    
    async def send_stars_invoice(
        self,
        chat_id: int,
        title: str,
        description: str,
        stars_amount: int,
        payload: str
    ) -> Dict:
        """Send invoice directly to chat"""
        if not self.bot_token:
            return self._demo_invoice(chat_id, stars_amount)
        
        lxg_amount = self.stars_to_lxg(stars_amount)
        
        url = f"https://api.telegram.org/bot{self.bot_token}/sendInvoice"
        
        invoice_payload = {
            "chat_id": chat_id,
            "title": title,
            "description": description,
            "payload": payload,
            "provider_token": "",
            "currency": "XTR",
            "prices": [{"label": "LXG Tokens", "amount": stars_amount}],
            "start_parameter": "lxg_purchase"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=invoice_payload, timeout=30.0)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("ok"):
                    message = result["result"]
                    return {
                        "success": True,
                        "message_id": message["message_id"],
                        "chat_id": chat_id,
                        "stars_amount": stars_amount,
                        "lxg_amount": lxg_amount
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("description")
                    }
            
            return {"success": False, "error": response.text}
    
    async def answer_pre_checkout_query(
        self,
        pre_checkout_query_id: str,
        ok: bool = True,
        error_message: Optional[str] = None
    ) -> Dict:
        """Answer pre-checkout query"""
        if not self.bot_token:
            return {"success": True, "demo": True}
        
        url = f"https://api.telegram.org/bot{self.bot_token}/answerPreCheckoutQuery"
        
        payload = {
            "pre_checkout_query_id": pre_checkout_query_id,
            "ok": ok
        }
        
        if not ok and error_message:
            payload["error_message"] = error_message
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            return {"success": response.status_code == 200}
    
    async def handle_successful_payment(
        self,
        payment: Dict,
        user_id: str
    ) -> Dict:
        """Process successful Stars payment"""
        stars_amount = payment.get("total_amount", 0)
        lxg_amount = self.stars_to_lxg(stars_amount)
        payload = payment.get("invoice_payload", "")
        
        return {
            "processed": True,
            "telegram_payment_id": payment.get("telegram_payment_charge_id"),
            "provider_payment_id": payment.get("provider_payment_charge_id"),
            "stars_amount": stars_amount,
            "lxg_amount": lxg_amount,
            "payload": payload,
            "user_id": user_id,
            "currency": payment.get("currency"),
            "shipping_option_id": payment.get("shipping_option_id")
        }
    
    def _demo_invoice(self, chat_id: int, stars_amount: int) -> Dict:
        """Generate demo invoice"""
        lxg_amount = self.stars_to_lxg(stars_amount)
        
        return {
            "success": True,
            "demo": True,
            "chat_id": chat_id,
            "stars_amount": stars_amount,
            "lxg_amount": lxg_amount,
            "invoice_link": f"https://t.me/Laxigam_blockchain_bot?start=stars_{stars_amount}",
            "instructions": [
                "Open the bot",
                "Click 'Pay with Stars'",
                f"Pay {stars_amount} Stars",
                f"Receive {lxg_amount:.2f} LXG"
            ],
            "note": "This is a demo. Configure TELEGRAM_BOT_TOKEN for live payments."
        }


# Mini App Stars API
class TelegramMiniAppStars:
    """Handle Stars payments within Telegram Mini App"""
    
    def __init__(self):
        self.bot_token = TELEGRAM_BOT_TOKEN
    
    def generate_stars_purchase_url(
        self,
        user_id: int,
        stars_amount: int,
        return_url: str = "https://laxigam.com/miniapp"
    ) -> str:
        """Generate URL for Stars purchase in Mini App"""
        # This uses Telegram's native Stars purchase flow
        return f"tg://stars/purchase?amount={stars_amount}&bot=Laxigam_blockchain_bot&return_url={return_url}"
    
    async def verify_stars_transaction(
        self,
        transaction_id: str,
        user_id: int
    ) -> Dict:
        """Verify a Stars transaction"""
        # In production, verify against your database
        # For now, return success for demo
        return {
            "verified": True,
            "transaction_id": transaction_id,
            "user_id": user_id,
            "stars_amount": 0,  # Would fetch from DB
            "lxg_credited": 0   # Would fetch from DB
        }


# Webhook handler for Stars payments
async def handle_stars_webhook(update: Dict) -> Dict:
    """
    Handle Telegram payment webhook
    
    Args:
        update: Telegram update object
        
    Returns:
        Dict with processed result
    """
    # Handle pre-checkout query
    if "pre_checkout_query" in update:
        pre_checkout = update["pre_checkout_query"]
        
        stars = TelegramStarsPayment()
        await stars.answer_pre_checkout_query(
            pre_checkout["id"],
            ok=True
        )
        
        return {"processed": True, "type": "pre_checkout"}
    
    # Handle successful payment
    if "message" in update:
        message = update["message"]
        
        if "successful_payment" in message:
            payment = message["successful_payment"]
            user = message.get("from", {})
            
            stars = TelegramStarsPayment()
            result = await stars.handle_successful_payment(
                payment,
                str(user.get("id"))
            )
            
            return {"processed": True, "type": "successful_payment", "data": result}
    
    return {"processed": False, "reason": "Not a payment update"}


# Usage example
if __name__ == "__main__":
    import asyncio
    
    async def test():
        stars = TelegramStarsPayment()
        
        # Create invoice
        result = await stars.create_stars_invoice(
            chat_id=123456789,
            title="Purchase LXG Tokens",
            description="Get LXG tokens for gaming",
            stars_amount=100,
            payload="user_123_purchase"
        )
        print("Stars Invoice:", result)
        
        # Convert
        print("100 Stars =", stars.stars_to_lxg(100), "LXG")
        print("50 LXG =", stars.lxg_to_stars(50), "Stars")
    
    asyncio.run(test())
