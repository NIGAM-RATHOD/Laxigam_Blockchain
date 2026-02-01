"""
India UPI Payment Integration - Razorpay
Handles UPI payments for Indian users
"""

import os
import hashlib
import hmac
import base64
from datetime import datetime
from typing import Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET", "")

class UPIPayment:
    """Razorpay UPI Payment Handler"""
    
    BASE_URL = "https://api.razorpay.com/v1"
    
    def __init__(self):
        self.key_id = RAZORPAY_KEY_ID
        self.secret = RAZORPAY_SECRET
        
    def _get_auth(self) -> tuple:
        """Get authentication tuple"""
        return (self.key_id, self.secret)
    
    async def create_upi_payment(
        self,
        user_id: str,
        amount_inr: float,
        description: str = "Laxigam LXG Purchase",
        user_contact: Optional[str] = None,
        user_email: Optional[str] = None
    ) -> Dict:
        """
        Create a UPI payment order via Razorpay
        
        Args:
            user_id: Internal user ID
            amount_inr: Amount in Indian Rupees
            description: Payment description
            user_contact: User phone number
            user_email: User email
            
        Returns:
            Dict with order details, UPI options, and QR code
        """
        if not self.key_id or not self.secret:
            # Demo mode - return mock response
            return self._demo_payment(user_id, amount_inr)
        
        amount_paise = int(amount_inr * 100)  # Razorpay uses paise
        
        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"laxigam_{user_id}_{int(datetime.now().timestamp())}",
            "notes": {
                "user_id": user_id,
                "purpose": "LXG_TOKEN_PURCHASE"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/orders",
                auth=self._get_auth(),
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200:
                order = response.json()
                
                # Create payment link with UPI options
                payment_link = await self._create_payment_link(
                    order["id"],
                    amount_inr,
                    description,
                    user_contact,
                    user_email
                )
                
                return {
                    "success": True,
                    "order_id": order["id"],
                    "amount_inr": amount_inr,
                    "amount_paise": amount_paise,
                    "currency": "INR",
                    "status": order["status"],
                    "payment_link": payment_link.get("short_url"),
                    "upi_options": {
                        "google_pay": True,
                        "phonepe": True,
                        "paytm": True,
                        "bhim": True,
                        "any_upi_app": True
                    },
                    "qr_code": self._generate_upi_qr(order["id"], amount_inr),
                    "expires_at": order.get("expires_at")
                }
            else:
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }
    
    async def _create_payment_link(
        self,
        order_id: str,
        amount_inr: float,
        description: str,
        user_contact: Optional[str],
        user_email: Optional[str]
    ) -> Dict:
        """Create a payment link for the order"""
        payload = {
            "amount": int(amount_inr * 100),
            "currency": "INR",
            "accept_partial": False,
            "description": description,
            "customer": {
                "name": "Laxigam User",
                "contact": user_contact or "",
                "email": user_email or ""
            },
            "notify": {
                "sms": True,
                "email": True
            },
            "reminder_enable": True,
            "notes": {
                "order_id": order_id,
                "platform": "Laxigam"
            },
            "callback_url": "https://api.laxigam.com/payments/razorpay/callback",
            "callback_method": "get"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/payment_links",
                auth=self._get_auth(),
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            return {}
    
    def _generate_upi_qr(self, order_id: str, amount_inr: float) -> str:
        """Generate UPI QR code data"""
        # UPI QR format
        upi_data = f"upi://pay?pa=laxigam@razorpay&pn=Laxigam&am={amount_inr}&cu=INR&tn=LXG_{order_id[:8]}"
        return base64.b64encode(upi_data.encode()).decode()
    
    async def verify_payment(self, order_id: str, payment_id: str, signature: str) -> Dict:
        """
        Verify Razorpay payment signature
        
        Args:
            order_id: Razorpay order ID
            payment_id: Razorpay payment ID
            signature: Razorpay signature
            
        Returns:
            Dict with verification result
        """
        if not self.key_id or not self.secret:
            return {"verified": True, "demo": True}
        
        # Verify signature
        message = f"{order_id}|{payment_id}"
        expected_signature = hmac.new(
            self.secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        is_valid = hmac.compare_digest(expected_signature, signature)
        
        if is_valid:
            # Fetch payment details
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/payments/{payment_id}",
                    auth=self._get_auth(),
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    payment = response.json()
                    return {
                        "verified": True,
                        "payment_id": payment_id,
                        "order_id": order_id,
                        "amount_inr": payment.get("amount", 0) / 100,
                        "status": payment.get("status"),
                        "method": payment.get("method"),
                        "upi_transaction_id": payment.get("acquirer_data", {}).get("upi_transaction_id")
                    }
        
        return {"verified": False, "error": "Invalid signature"}
    
    async def get_payment_status(self, order_id: str) -> Dict:
        """Get payment status for an order"""
        if not self.key_id or not self.secret:
            return {"status": "demo", "order_id": order_id}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/orders/{order_id}",
                auth=self._get_auth(),
                timeout=30.0
            )
            
            if response.status_code == 200:
                order = response.json()
                return {
                    "order_id": order_id,
                    "status": order.get("status"),
                    "amount_paid": order.get("amount_paid", 0) / 100,
                    "amount_due": order.get("amount_due", 0) / 100,
                    "attempts": order.get("attempts", 0),
                    "created_at": order.get("created_at")
                }
            
            return {"error": "Order not found", "status_code": response.status_code}
    
    async def refund_payment(self, payment_id: str, amount_inr: Optional[float] = None) -> Dict:
        """Refund a payment"""
        if not self.key_id or not self.secret:
            return {"success": True, "demo": True, "payment_id": payment_id}
        
        payload = {}
        if amount_inr:
            payload["amount"] = int(amount_inr * 100)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/payments/{payment_id}/refund",
                auth=self._get_auth(),
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200:
                refund = response.json()
                return {
                    "success": True,
                    "refund_id": refund.get("id"),
                    "payment_id": payment_id,
                    "amount_inr": refund.get("amount", 0) / 100,
                    "status": refund.get("status")
                }
            
            return {"success": False, "error": response.text}
    
    def _demo_payment(self, user_id: str, amount_inr: float) -> Dict:
        """Generate demo payment response"""
        import time
        order_id = f"order_demo_{int(time.time())}"
        
        return {
            "success": True,
            "demo": True,
            "order_id": order_id,
            "amount_inr": amount_inr,
            "amount_paise": int(amount_inr * 100),
            "currency": "INR",
            "status": "created",
            "payment_link": f"https://rzp.io/i/{order_id}",
            "upi_options": {
                "google_pay": True,
                "phonepe": True,
                "paytm": True,
                "bhim": True,
                "any_upi_app": True
            },
            "instructions": [
                "Open any UPI app (GPay, PhonePe, Paytm)",
                f"Send ₹{amount_inr} to laxigam@upi",
                "Use reference: " + order_id[:8]
            ],
            "note": "This is a demo. Configure RAZORPAY_KEY_ID and RAZORPAY_SECRET for live payments."
        }


# Webhook handler
async def handle_razorpay_webhook(payload: Dict, signature: str) -> Dict:
    """
    Handle Razorpay webhook
    
    Args:
        payload: Webhook payload
        signature: Webhook signature
        
    Returns:
        Dict with processed result
    """
    secret = RAZORPAY_SECRET
    
    if not secret:
        return {"processed": True, "demo": True}
    
    # Verify webhook signature
    expected_signature = hmac.new(
        secret.encode(),
        json.dumps(payload, separators=(',', ':')).encode(),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected_signature, signature):
        return {"processed": False, "error": "Invalid webhook signature"}
    
    event = payload.get("event")
    
    if event == "payment.captured":
        payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
        return {
            "processed": True,
            "event": event,
            "payment_id": payment.get("id"),
            "order_id": payment.get("order_id"),
            "amount_inr": payment.get("amount", 0) / 100,
            "status": "captured"
        }
    
    elif event == "payment.failed":
        payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
        return {
            "processed": True,
            "event": event,
            "payment_id": payment.get("id"),
            "order_id": payment.get("order_id"),
            "status": "failed",
            "error": payment.get("error_description")
        }
    
    return {"processed": True, "event": event}


# Usage example
if __name__ == "__main__":
    import asyncio
    
    async def test():
        upi = UPIPayment()
        
        # Create payment
        result = await upi.create_upi_payment(
            user_id="user_123",
            amount_inr=1000.00,
            user_contact="+919876543210",
            user_email="user@example.com"
        )
        print("Payment created:", json.dumps(result, indent=2))
    
    asyncio.run(test())
