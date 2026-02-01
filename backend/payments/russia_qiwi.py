"""
Russia QIWI Payment Integration
Handles QIWI payments for Russian users
"""

import os
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

QIWI_SECRET_KEY = os.getenv("QIWI_SECRET_KEY", "")
QIWI_PUBLIC_KEY = os.getenv("QIWI_PUBLIC_KEY", "")

class QIWIPayment:
    """QIWI Payment Handler"""
    
    BASE_URL = "https://api.qiwi.com/partner/bill/v1/bills"
    
    def __init__(self):
        self.secret_key = QIWI_SECRET_KEY
        self.public_key = QIWI_PUBLIC_KEY
        
    def _get_headers(self) -> dict:
        """Get API headers"""
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def create_qiwi_payment(
        self,
        user_id: str,
        amount_rub: float,
        user_phone: Optional[str] = None,
        description: str = "Laxigam LXG Purchase"
    ) -> Dict:
        """
        Create a QIWI payment bill
        
        Args:
            user_id: Internal user ID
            amount_rub: Amount in Russian Rubles
            user_phone: User phone number (for QIWI wallet)
            description: Payment description
            
        Returns:
            Dict with payment bill details
        """
        if not self.secret_key:
            return self._demo_payment(user_id, amount_rub)
        
        bill_id = f"laxigam_{user_id}_{int(datetime.now().timestamp())}"
        
        # Expiration (30 minutes)
        expiration = datetime.utcnow() + timedelta(minutes=30)
        
        payload = {
            "amount": {
                "currency": "RUB",
                "value": f"{amount_rub:.2f}"
            },
            "comment": description,
            "expirationDateTime": expiration.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "customer": {
                "account": user_phone or "",
                "phone": user_phone or ""
            },
            "customFields": {
                "user_id": user_id,
                "platform": "Laxigam"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.BASE_URL}/{bill_id}",
                headers=self._get_headers(),
                json=payload,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                bill = response.json()
                
                return {
                    "success": True,
                    "bill_id": bill_id,
                    "payment_url": bill.get("payUrl"),
                    "amount_rub": amount_rub,
                    "currency": "RUB",
                    "status": bill.get("status", {}).get("value"),
                    "expiration": expiration.isoformat(),
                    "instructions": [
                        "Click the payment link or scan QR",
                        "Login to your QIWI wallet",
                        "Confirm payment",
                        f"Amount: {amount_rub:.2f} ₽"
                    ],
                    "payment_methods": [
                        "QIWI Wallet",
                        "SberPay",
                        "Tinkoff Pay",
                        "Card (Visa/Mastercard/MIR)"
                    ]
                }
            else:
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }
    
    async def get_bill_status(self, bill_id: str) -> Dict:
        """Get QIWI bill status"""
        if not self.secret_key:
            return {"status": "demo", "bill_id": bill_id}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{bill_id}",
                headers=self._get_headers(),
                timeout=30.0
            )
            
            if response.status_code == 200:
                bill = response.json()
                status = bill.get("status", {})
                
                return {
                    "bill_id": bill_id,
                    "status": status.get("value"),
                    "amount_rub": float(bill.get("amount", {}).get("value", 0)),
                    "currency": bill.get("amount", {}).get("currency"),
                    "created": bill.get("creationDateTime"),
                    "expiration": bill.get("expirationDateTime"),
                    "paid": status.get("value") == "PAID"
                }
            
            return {"error": "Bill not found", "status_code": response.status_code}
    
    async def cancel_bill(self, bill_id: str) -> Dict:
        """Cancel a pending QIWI bill"""
        if not self.secret_key:
            return {"success": True, "demo": True, "bill_id": bill_id}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/{bill_id}/reject",
                headers=self._get_headers(),
                timeout=30.0
            )
            
            if response.status_code in [200, 204]:
                return {
                    "success": True,
                    "bill_id": bill_id,
                    "status": "rejected"
                }
            
            return {"success": False, "error": response.text}
    
    async def refund_payment(self, bill_id: str, amount_rub: Optional[float] = None) -> Dict:
        """Refund a QIWI payment"""
        if not self.secret_key:
            return {"success": True, "demo": True, "bill_id": bill_id}
        
        payload = {}
        if amount_rub:
            payload["amount"] = {"currency": "RUB", "value": f"{amount_rub:.2f}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/{bill_id}/refund",
                headers=self._get_headers(),
                json=payload,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                refund = response.json()
                return {
                    "success": True,
                    "refund_id": refund.get("refundId"),
                    "bill_id": bill_id,
                    "amount_rub": amount_rub,
                    "status": "refunded"
                }
            
            return {"success": False, "error": response.text}
    
    def _demo_payment(self, user_id: str, amount_rub: float) -> Dict:
        """Generate demo QIWI payment"""
        import time
        bill_id = f"qiwi_demo_{int(time.time())}"
        
        return {
            "success": True,
            "demo": True,
            "bill_id": bill_id,
            "payment_url": f"https://oplata.qiwi.com/form?invoiceUid={bill_id}",
            "amount_rub": amount_rub,
            "currency": "RUB",
            "status": "WAITING",
            "expiration": (datetime.utcnow() + timedelta(minutes=30)).isoformat(),
            "instructions": [
                "Click the payment link",
                "Login to QIWI wallet or use card",
                "Confirm payment",
                f"Amount: {amount_rub:.2f} ₽"
            ],
            "payment_methods": [
                "QIWI Кошелек",
                "СберPay",
                "Тинькофф Pay",
                "Банковская карта (Visa/Mastercard/МИР)"
            ],
            "note": "This is a demo. Configure QIWI_SECRET_KEY for live payments."
        }


# Webhook handler
async def handle_qiwi_webhook(payload: Dict, signature: str) -> Dict:
    """
    Handle QIWI webhook
    
    Args:
        payload: Webhook payload
        signature: Webhook signature
        
    Returns:
        Dict with processed result
    """
    secret = QIWI_SECRET_KEY
    
    if not secret:
        return {"processed": True, "demo": True}
    
    # Verify signature (QIWI uses HMAC-SHA256)
    message = json.dumps(payload, separators=(',', ':'))
    expected_signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected_signature, signature):
        return {"processed": False, "error": "Invalid signature"}
    
    bill = payload.get("bill", {})
    status = bill.get("status", {}).get("value")
    
    if status == "PAID":
        return {
            "processed": True,
            "bill_id": bill.get("billId"),
            "status": "paid",
            "amount_rub": float(bill.get("amount", {}).get("value", 0)),
            "currency": bill.get("amount", {}).get("currency"),
            "customer_phone": bill.get("customer", {}).get("phone")
        }
    
    elif status == "REJECTED":
        return {
            "processed": True,
            "bill_id": bill.get("billId"),
            "status": "rejected"
        }
    
    return {"processed": True, "status": status}


# Usage example
if __name__ == "__main__":
    import asyncio
    
    async def test():
        qiwi = QIWIPayment()
        
        # Create payment
        result = await qiwi.create_qiwi_payment(
            user_id="user_123",
            amount_rub=5000.00,
            user_phone="+79001234567"
        )
        print("QIWI Payment:", result)
    
    asyncio.run(test())
