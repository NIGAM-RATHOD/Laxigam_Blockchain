"""
Brazil PIX Payment Integration - Mercado Pago
Handles PIX payments for Brazilian users
"""

import os
import base64
import qrcode
import io
from datetime import datetime, timedelta
from typing import Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")

class PIXPayment:
    """Mercado Pago PIX Payment Handler"""
    
    BASE_URL = "https://api.mercadopago.com"
    
    def __init__(self):
        self.access_token = MERCADOPAGO_ACCESS_TOKEN
        
    def _get_headers(self) -> dict:
        """Get API headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def create_pix_payment(
        self,
        user_id: str,
        amount_brl: float,
        description: str = "Laxigam LXG Purchase",
        user_email: Optional[str] = None,
        user_cpf: Optional[str] = None
    ) -> Dict:
        """
        Create a PIX payment
        
        Args:
            user_id: Internal user ID
            amount_brl: Amount in Brazilian Reais
            description: Payment description
            user_email: User email
            user_cpf: User CPF (Brazilian tax ID)
            
        Returns:
            Dict with PIX QR code and payment details
        """
        if not self.access_token:
            return self._demo_payment(user_id, amount_brl)
        
        # Calculate expiration (30 minutes)
        expiration = datetime.utcnow() + timedelta(minutes=30)
        
        payload = {
            "transaction_amount": amount_brl,
            "description": description,
            "payment_method_id": "pix",
            "notification_url": "https://api.laxigam.com/payments/mercadopago/webhook",
            "date_of_expiration": expiration.isoformat() + "Z",
            "payer": {
                "email": user_email or f"user_{user_id}@laxigam.com",
                "identification": {
                    "type": "CPF",
                    "number": user_cpf or "00000000000"
                }
            },
            "external_reference": f"laxigam_{user_id}_{int(datetime.now().timestamp())}",
            "metadata": {
                "user_id": user_id,
                "platform": "Laxigam"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/v1/payments",
                headers=self._get_headers(),
                json=payload,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                payment = response.json()
                point_of_interaction = payment.get("point_of_interaction", {})
                transaction_data = point_of_interaction.get("transaction_data", {})
                
                # Generate QR code image
                qr_code_base64 = transaction_data.get("qr_code_base64", "")
                qr_code_text = transaction_data.get("qr_code", "")
                
                return {
                    "success": True,
                    "payment_id": payment.get("id"),
                    "amount_brl": amount_brl,
                    "currency": "BRL",
                    "status": payment.get("status"),
                    "pix_qr_code": qr_code_text,
                    "pix_qr_code_base64": qr_code_base64,
                    "pix_copy_paste": qr_code_text,  # Copia e Cola
                    "expiration_date": payment.get("date_of_expiration"),
                    "external_reference": payment.get("external_reference"),
                    "instructions": [
                        "Open your bank app",
                        "Select PIX payment",
                        "Scan QR code or use 'Copia e Cola'",
                        f"Amount: R$ {amount_brl:.2f}"
                    ]
                }
            else:
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }
    
    async def get_payment_status(self, payment_id: str) -> Dict:
        """Get PIX payment status"""
        if not self.access_token:
            return {"status": "demo", "payment_id": payment_id}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/v1/payments/{payment_id}",
                headers=self._get_headers(),
                timeout=30.0
            )
            
            if response.status_code == 200:
                payment = response.json()
                return {
                    "payment_id": payment_id,
                    "status": payment.get("status"),
                    "status_detail": payment.get("status_detail"),
                    "amount_brl": payment.get("transaction_amount"),
                    "date_created": payment.get("date_created"),
                    "date_approved": payment.get("date_approved"),
                    "external_reference": payment.get("external_reference")
                }
            
            return {"error": "Payment not found", "status_code": response.status_code}
    
    async def cancel_payment(self, payment_id: str) -> Dict:
        """Cancel a pending PIX payment"""
        if not self.access_token:
            return {"success": True, "demo": True, "payment_id": payment_id}
        
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.BASE_URL}/v1/payments/{payment_id}",
                headers=self._get_headers(),
                json={"status": "cancelled"},
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "payment_id": payment_id,
                    "status": "cancelled"
                }
            
            return {"success": False, "error": response.text}
    
    async def refund_payment(self, payment_id: str, amount_brl: Optional[float] = None) -> Dict:
        """Refund a PIX payment"""
        if not self.access_token:
            return {"success": True, "demo": True, "payment_id": payment_id}
        
        payload = {}
        if amount_brl:
            payload["amount"] = amount_brl
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/v1/payments/{payment_id}/refunds",
                headers=self._get_headers(),
                json=payload,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                refund = response.json()
                return {
                    "success": True,
                    "refund_id": refund.get("id"),
                    "payment_id": payment_id,
                    "amount_brl": refund.get("amount"),
                    "status": refund.get("status")
                }
            
            return {"success": False, "error": response.text}
    
    def _generate_qr_code(self, pix_code: str) -> str:
        """Generate QR code image as base64"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(pix_code)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()
    
    def _demo_payment(self, user_id: str, amount_brl: float) -> Dict:
        """Generate demo PIX payment"""
        import time
        payment_id = f"pix_demo_{int(time.time())}"
        
        # Generate demo PIX code
        pix_code = f"00020126330014BR.GOV.BCB.PIX0114laxigam@pix.br520400005303986540{amount_brl:.2f}5802BR5910Laxigam6010Sao Paulo62070503***6304"
        
        return {
            "success": True,
            "demo": True,
            "payment_id": payment_id,
            "amount_brl": amount_brl,
            "currency": "BRL",
            "status": "pending",
            "pix_qr_code": pix_code,
            "pix_copy_paste": pix_code,
            "expiration_date": (datetime.utcnow() + timedelta(minutes=30)).isoformat(),
            "instructions": [
                "Open your bank app (Itaú, Bradesco, Nubank, etc.)",
                "Select PIX payment",
                "Scan QR code or paste 'Copia e Cola' code",
                f"Amount: R$ {amount_brl:.2f}"
            ],
            "note": "This is a demo. Configure MERCADOPAGO_ACCESS_TOKEN for live payments."
        }


# Webhook handler
async def handle_mercadopago_webhook(payload: Dict) -> Dict:
    """
    Handle Mercado Pago webhook
    
    Args:
        payload: Webhook payload
        
    Returns:
        Dict with processed result
    """
    data = payload.get("data", {})
    payment_id = data.get("id")
    
    # Fetch full payment details
    pix = PIXPayment()
    payment_details = await pix.get_payment_status(str(payment_id))
    
    status = payment_details.get("status")
    
    if status == "approved":
        return {
            "processed": True,
            "payment_id": payment_id,
            "status": "approved",
            "amount_brl": payment_details.get("amount_brl"),
            "external_reference": payment_details.get("external_reference")
        }
    
    elif status == "cancelled":
        return {
            "processed": True,
            "payment_id": payment_id,
            "status": "cancelled"
        }
    
    return {"processed": True, "payment_id": payment_id, "status": status}


# Usage example
if __name__ == "__main__":
    import asyncio
    
    async def test():
        pix = PIXPayment()
        
        # Create PIX payment
        result = await pix.create_pix_payment(
            user_id="user_123",
            amount_brl=50.00,
            user_email="user@example.com",
            user_cpf="12345678900"
        )
        print("PIX Payment:", result)
    
    asyncio.run(test())
