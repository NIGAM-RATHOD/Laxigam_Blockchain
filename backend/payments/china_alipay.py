"""
China Alipay Payment Integration
Handles Alipay payments for Chinese users
"""

import os
import json
import base64
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional
import httpx
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()

ALIPAY_APP_ID = os.getenv("ALIPAY_APP_ID", "")
ALIPAY_PRIVATE_KEY = os.getenv("ALIPAY_PRIVATE_KEY", "")
ALIPAY_PUBLIC_KEY = os.getenv("ALIPAY_PUBLIC_KEY", "")
ALIPAY_GATEWAY = "https://openapi.alipay.com/gateway.do"

class AlipayPayment:
    """Alipay Payment Handler"""
    
    def __init__(self):
        self.app_id = ALIPAY_APP_ID
        self.private_key = ALIPAY_PRIVATE_KEY
        self.alipay_public_key = ALIPAY_PUBLIC_KEY
        
    def _sign(self, params: dict) -> str:
        """Generate RSA signature"""
        # Sort params and create string
        sorted_params = sorted(params.items())
        content = "&".join(f"{k}={v}" for k, v in sorted_params if v)
        
        # Sign with private key (simplified - use proper RSA in production)
        # In production, use cryptography library for proper RSA signing
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _build_request_params(
        self,
        method: str,
        biz_content: dict,
        notify_url: str = ""
    ) -> dict:
        """Build Alipay API request parameters"""
        params = {
            "app_id": self.app_id,
            "method": method,
            "format": "JSON",
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "biz_content": json.dumps(biz_content, ensure_ascii=False)
        }
        
        if notify_url:
            params["notify_url"] = notify_url
        
        # Add signature
        params["sign"] = self._sign(params)
        
        return params
    
    async def create_alipay_payment(
        self,
        user_id: str,
        amount_cny: float,
        subject: str = "Laxigam LXG Purchase",
        body: str = "Purchase of LXG gaming tokens",
        user_email: Optional[str] = None
    ) -> Dict:
        """
        Create an Alipay payment
        
        Args:
            user_id: Internal user ID
            amount_cny: Amount in Chinese Yuan
            subject: Payment subject
            body: Payment description
            user_email: User email
            
        Returns:
            Dict with payment details
        """
        if not self.app_id:
            return self._demo_payment(user_id, amount_cny)
        
        out_trade_no = f"laxigam_{user_id}_{int(datetime.now().timestamp())}"
        
        # For PC/WEB payment
        biz_content = {
            "out_trade_no": out_trade_no,
            "total_amount": f"{amount_cny:.2f}",
            "subject": subject,
            "body": body,
            "product_code": "FAST_INSTANT_TRADE_PAY",
            "timeout_express": "30m"
        }
        
        params = self._build_request_params(
            "alipay.trade.page.pay",
            biz_content,
            notify_url="https://api.laxigam.com/payments/alipay/notify"
        )
        
        # Build payment URL
        query_string = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
        payment_url = f"{ALIPAY_GATEWAY}?{query_string}"
        
        return {
            "success": True,
            "out_trade_no": out_trade_no,
            "amount_cny": amount_cny,
            "currency": "CNY",
            "payment_url": payment_url,
            "subject": subject,
            "instructions": [
                "Click the payment link",
                "Login to Alipay",
                "Confirm payment",
                f"Amount: ¥{amount_cny:.2f}"
            ],
            "payment_methods": [
                "支付宝余额",
                "花呗",
                "银行卡",
                "信用卡"
            ]
        }
    
    async def create_mobile_payment(
        self,
        user_id: str,
        amount_cny: float,
        subject: str = "Laxigam LXG Purchase"
    ) -> Dict:
        """Create mobile/WAP Alipay payment"""
        if not self.app_id:
            return self._demo_payment(user_id, amount_cny)
        
        out_trade_no = f"laxigam_{user_id}_{int(datetime.now().timestamp())}"
        
        biz_content = {
            "out_trade_no": out_trade_no,
            "total_amount": f"{amount_cny:.2f}",
            "subject": subject,
            "product_code": "QUICK_WAP_WAY",
            "timeout_express": "30m"
        }
        
        params = self._build_request_params(
            "alipay.trade.wap.pay",
            biz_content,
            notify_url="https://api.laxigam.com/payments/alipay/notify"
        )
        
        query_string = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
        payment_url = f"{ALIPAY_GATEWAY}?{query_string}"
        
        return {
            "success": True,
            "out_trade_no": out_trade_no,
            "amount_cny": amount_cny,
            "currency": "CNY",
            "payment_url": payment_url,
            "type": "mobile"
        }
    
    async def query_payment(self, out_trade_no: str) -> Dict:
        """Query payment status"""
        if not self.app_id:
            return {"status": "demo", "out_trade_no": out_trade_no}
        
        biz_content = {
            "out_trade_no": out_trade_no
        }
        
        params = self._build_request_params("alipay.trade.query", biz_content)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                ALIPAY_GATEWAY,
                data=params,
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                alipay_response = result.get("alipay_trade_query_response", {})
                
                return {
                    "out_trade_no": out_trade_no,
                    "trade_no": alipay_response.get("trade_no"),
                    "status": alipay_response.get("trade_status"),
                    "amount_cny": alipay_response.get("total_amount"),
                    "buyer_logon_id": alipay_response.get("buyer_logon_id"),
                    "send_pay_date": alipay_response.get("send_pay_date")
                }
            
            return {"error": "Query failed", "status_code": response.status_code}
    
    async def refund_payment(
        self,
        out_trade_no: str,
        amount_cny: Optional[float] = None,
        reason: str = "User request"
    ) -> Dict:
        """Refund an Alipay payment"""
        if not self.app_id:
            return {"success": True, "demo": True, "out_trade_no": out_trade_no}
        
        refund_no = f"REFUND_{out_trade_no}"
        
        biz_content = {
            "out_trade_no": out_trade_no,
            "out_request_no": refund_no,
            "refund_amount": f"{amount_cny:.2f}" if amount_cny else None,
            "refund_reason": reason
        }
        
        params = self._build_request_params("alipay.trade.refund", biz_content)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                ALIPAY_GATEWAY,
                data=params,
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                alipay_response = result.get("alipay_trade_refund_response", {})
                
                return {
                    "success": alipay_response.get("code") == "10000",
                    "out_trade_no": out_trade_no,
                    "refund_no": refund_no,
                    "refund_amount": alipay_response.get("refund_fee"),
                    "status": "refunded" if alipay_response.get("fund_change") == "Y" else "pending"
                }
            
            return {"success": False, "error": response.text}
    
    def _verify_sign(self, params: dict) -> bool:
        """Verify Alipay signature"""
        # In production, use proper RSA verification
        # This is a simplified version
        sign = params.pop("sign", "")
        sign_type = params.pop("sign_type", "RSA2")
        
        # Re-create content string
        sorted_params = sorted(params.items())
        content = "&".join(f"{k}={v}" for k, v in sorted_params if v)
        
        # Verify with Alipay public key
        # In production: use cryptography library
        return True  # Simplified for demo
    
    def _demo_payment(self, user_id: str, amount_cny: float) -> Dict:
        """Generate demo Alipay payment"""
        import time
        out_trade_no = f"alipay_demo_{int(time.time())}"
        
        return {
            "success": True,
            "demo": True,
            "out_trade_no": out_trade_no,
            "amount_cny": amount_cny,
            "currency": "CNY",
            "payment_url": f"https://openapi.alipay.com/gateway.do?out_trade_no={out_trade_no}",
            "subject": "Laxigam LXG Purchase",
            "instructions": [
                "点击支付链接",
                "登录支付宝",
                "确认付款",
                f"金额: ¥{amount_cny:.2f}"
            ],
            "payment_methods": [
                "支付宝余额",
                "花呗 (Huabei)",
                "银行卡",
                "信用卡"
            ],
            "note": "This is a demo. Configure ALIPAY_APP_ID for live payments."
        }


# Webhook handler
async def handle_alipay_notify(payload: Dict) -> Dict:
    """
    Handle Alipay async notification
    
    Args:
        payload: Notification payload
        
    Returns:
        Dict with processed result
    """
    # Verify signature
    alipay = AlipayPayment()
    
    if not alipay._verify_sign(payload.copy()):
        return {"processed": False, "error": "Invalid signature"}
    
    trade_status = payload.get("trade_status")
    out_trade_no = payload.get("out_trade_no")
    
    if trade_status == "TRADE_SUCCESS":
        return {
            "processed": True,
            "out_trade_no": out_trade_no,
            "trade_no": payload.get("trade_no"),
            "status": "success",
            "amount_cny": payload.get("total_amount"),
            "buyer_id": payload.get("buyer_id"),
            "gmt_payment": payload.get("gmt_payment")
        }
    
    elif trade_status == "TRADE_CLOSED":
        return {
            "processed": True,
            "out_trade_no": out_trade_no,
            "status": "closed"
        }
    
    return {"processed": True, "status": trade_status}


# Usage example
if __name__ == "__main__":
    import asyncio
    
    async def test():
        alipay = AlipayPayment()
        
        # Create payment
        result = await alipay.create_alipay_payment(
            user_id="user_123",
            amount_cny=100.00,
            subject="Laxigam LXG Purchase"
        )
        print("Alipay Payment:", result)
    
    asyncio.run(test())
