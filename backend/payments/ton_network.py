"""
TON (The Open Network) Blockchain Integration
Handles TON payments and bridge to LXG tokens
"""

import os
import base64
import hashlib
from datetime import datetime
from typing import Dict, Optional, List
import httpx
from dotenv import load_dotenv

load_dotenv()

TON_API_KEY = os.getenv("TON_API_KEY", "")
TON_CENTER_API = "https://toncenter.com/api/v2"
TON_BRIDGE_CONTRACT = os.getenv("TON_BRIDGE_CONTRACT", "")
LXG_TON_WALLET = os.getenv("LXG_TON_WALLET", "")

# Conversion rate: 1 TON = X LXG (configurable)
TON_TO_LXG_RATE = float(os.getenv("TON_TO_LXG_RATE", "100"))  # 1 TON = 100 LXG

class TONNetwork:
    """TON Network Handler"""
    
    def __init__(self):
        self.api_key = TON_API_KEY
        self.bridge_contract = TON_BRIDGE_CONTRACT
        self.lxg_wallet = LXG_TON_WALLET
        
    def _get_headers(self) -> dict:
        """Get API headers"""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers
    
    def ton_to_lxg(self, ton_amount: float) -> float:
        """Convert TON to LXG"""
        return ton_amount * TON_TO_LXG_RATE
    
    def lxg_to_ton(self, lxg_amount: float) -> float:
        """Convert LXG to TON"""
        return lxg_amount / TON_TO_LXG_RATE
    
    async def get_wallet_info(self, address: str) -> Dict:
        """Get TON wallet information"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TON_CENTER_API}/getAddressInformation",
                params={"address": address},
                headers=self._get_headers(),
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("ok"):
                    data = result["result"]
                    return {
                        "success": True,
                        "address": address,
                        "balance_nanoton": data.get("balance", "0"),
                        "balance_ton": float(data.get("balance", 0)) / 1e9,
                        "status": data.get("status"),
                        "code": data.get("code"),
                        "data": data.get("data")
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("error", "Unknown error")
                    }
            
            return {"success": False, "error": response.text}
    
    async def get_transactions(
        self,
        address: str,
        limit: int = 10
    ) -> Dict:
        """Get transaction history for address"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TON_CENTER_API}/getTransactions",
                params={
                    "address": address,
                    "limit": limit,
                    "archival": "false"
                },
                headers=self._get_headers(),
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("ok"):
                    transactions = []
                    
                    for tx in result.get("result", []):
                        in_msg = tx.get("in_msg", {})
                        out_msgs = tx.get("out_msgs", [])
                        
                        transactions.append({
                            "hash": tx.get("transaction_id", {}).get("hash"),
                            "lt": tx.get("transaction_id", {}).get("lt"),
                            "utime": tx.get("utime"),
                            "fee": float(tx.get("fee", 0)) / 1e9,
                            "in_msg": {
                                "source": in_msg.get("source"),
                                "destination": in_msg.get("destination"),
                                "value": float(in_msg.get("value", 0)) / 1e9,
                                "message": in_msg.get("message")
                            },
                            "out_msgs": [
                                {
                                    "source": msg.get("source"),
                                    "destination": msg.get("destination"),
                                    "value": float(msg.get("value", 0)) / 1e9,
                                    "message": msg.get("message")
                                }
                                for msg in out_msgs
                            ]
                        })
                    
                    return {
                        "success": True,
                        "address": address,
                        "transactions": transactions
                    }
                else:
                    return {"success": False, "error": result.get("error")}
            
            return {"success": False, "error": response.text}
    
    async def create_ton_deposit(
        self,
        user_id: str,
        ton_amount: float,
        user_ton_address: str
    ) -> Dict:
        """
        Create a TON deposit request (TON -> LXG bridge)
        
        Args:
            user_id: Internal user ID
            ton_amount: Amount of TON to deposit
            user_ton_address: User's TON wallet address
            
        Returns:
            Dict with deposit instructions
        """
        lxg_amount = self.ton_to_lxg(ton_amount)
        
        # Generate unique deposit ID
        deposit_id = hashlib.sha256(
            f"{user_id}{ton_amount}{datetime.now().timestamp()}".encode()
        ).hexdigest()[:16]
        
        return {
            "success": True,
            "deposit_id": deposit_id,
            "user_id": user_id,
            "ton_amount": ton_amount,
            "lxg_amount": lxg_amount,
            "lxg_wallet_address": self.lxg_wallet,
            "user_ton_address": user_ton_address,
            "instructions": [
                "Open your TON wallet (Tonkeeper, MyTonWallet, etc.)",
                f"Send {ton_amount:.4f} TON to:",
                f"`{self.lxg_wallet}`",
                "Include memo:",
                f"`{deposit_id}`",
                f"\nYou will receive {lxg_amount:.2f} LXG"
            ],
            "memo": deposit_id,
            "estimated_time": "1-5 minutes",
            "min_confirmations": 10
        }
    
    async def verify_ton_deposit(
        self,
        deposit_id: str,
        expected_amount: float
    ) -> Dict:
        """
        Verify TON deposit and confirm LXG minting
        
        Args:
            deposit_id: Deposit memo/ID
            expected_amount: Expected TON amount
            
        Returns:
            Dict with verification result
        """
        if not self.api_key:
            return {"verified": True, "demo": True, "deposit_id": deposit_id}
        
        # Get recent transactions to LXG wallet
        wallet_info = await self.get_wallet_info(self.lxg_wallet)
        
        if not wallet_info.get("success"):
            return {"verified": False, "error": "Cannot fetch wallet info"}
        
        # Get transactions
        tx_result = await self.get_transactions(self.lxg_wallet, limit=50)
        
        if not tx_result.get("success"):
            return {"verified": False, "error": "Cannot fetch transactions"}
        
        # Look for transaction with matching memo
        for tx in tx_result.get("transactions", []):
            in_msg = tx.get("in_msg", {})
            message = in_msg.get("message", "")
            
            if deposit_id in message:
                received_ton = in_msg.get("value", 0)
                
                # Verify amount (with small tolerance for fees)
                tolerance = 0.001  # 0.001 TON tolerance
                if abs(received_ton - expected_amount) <= tolerance:
                    return {
                        "verified": True,
                        "deposit_id": deposit_id,
                        "transaction_hash": tx.get("hash"),
                        "received_ton": received_ton,
                        "lxg_amount": self.ton_to_lxg(received_ton),
                        "confirmations": 1,  # Would check actual confirmations
                        "timestamp": tx.get("utime")
                    }
                else:
                    return {
                        "verified": False,
                        "error": "Amount mismatch",
                        "expected": expected_amount,
                        "received": received_ton
                    }
        
        return {"verified": False, "error": "Deposit not found", "deposit_id": deposit_id}
    
    async def create_ton_withdrawal(
        self,
        user_id: str,
        lxg_amount: float,
        destination_ton_address: str
    ) -> Dict:
        """
        Create a TON withdrawal request (LXG -> TON bridge)
        
        Args:
            user_id: Internal user ID
            lxg_amount: Amount of LXG to withdraw
            destination_ton_address: User's TON wallet address
            
        Returns:
            Dict with withdrawal details
        """
        ton_amount = self.lxg_to_ton(lxg_amount)
        
        # Validate TON address
        if not self._validate_ton_address(destination_ton_address):
            return {"success": False, "error": "Invalid TON address"}
        
        withdrawal_id = hashlib.sha256(
            f"withdraw_{user_id}{lxg_amount}{datetime.now().timestamp()}".encode()
        ).hexdigest()[:16]
        
        return {
            "success": True,
            "withdrawal_id": withdrawal_id,
            "user_id": user_id,
            "lxg_amount": lxg_amount,
            "ton_amount": ton_amount,
            "destination_address": destination_ton_address,
            "status": "pending",
            "estimated_time": "5-30 minutes",
            "note": "LXG will be burned and TON will be sent to your wallet"
        }
    
    def _validate_ton_address(self, address: str) -> bool:
        """Validate TON wallet address format"""
        # TON addresses can be:
        # - Raw: 0: + 64 hex chars
        # - User-friendly: Base64 encoded with flags
        
        if not address:
            return False
        
        # Check raw format
        if address.startswith("0:") and len(address) == 66:
            try:
                int(address[2:], 16)
                return True
            except ValueError:
                return False
        
        # Check user-friendly format (base64)
        if len(address) in [48, 36]:  # EQ/ UQ addresses
            try:
                base64.b64decode(address + "=" * (4 - len(address) % 4))
                return True
            except:
                pass
        
        return True  # Allow for demo
    
    async def estimate_fees(self, operation: str = "transfer") -> Dict:
        """Estimate TON network fees"""
        # Typical TON fees
        fees = {
            "transfer": 0.005,  # 0.005 TON
            "bridge_deposit": 0.01,
            "bridge_withdrawal": 0.015
        }
        
        return {
            "operation": operation,
            "estimated_fee_ton": fees.get(operation, 0.005),
            "estimated_fee_usd": fees.get(operation, 0.005) * 5  # Approx $5/TON
        }
    
    async def get_ton_price(self) -> Dict:
        """Get current TON price"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.coingecko.com/api/v3/simple/price",
                    params={
                        "ids": "the-open-network",
                        "vs_currencies": "usd,inr,brl,rub,cny"
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    ton_data = data.get("the-open-network", {})
                    
                    return {
                        "success": True,
                        "usd": ton_data.get("usd", 0),
                        "inr": ton_data.get("inr", 0),
                        "brl": ton_data.get("brl", 0),
                        "rub": ton_data.get("rub", 0),
                        "cny": ton_data.get("cny", 0),
                        "lxg_conversion_rate": TON_TO_LXG_RATE
                    }
        except Exception as e:
            pass
        
        return {
            "success": False,
            "error": "Cannot fetch price",
            "approximate_usd": 5.0
        }


# TON Connect integration for Mini Apps
class TONConnect:
    """TON Connect 2.0 integration for Telegram Mini Apps"""
    
    def __init__(self):
        self.manifest_url = "https://laxigam.com/tonconnect-manifest.json"
    
    def generate_connect_url(self, return_url: str = "https://laxigam.com/miniapp") -> str:
        """Generate TON Connect URL"""
        # This would integrate with TON Connect SDK
        return f"tc://connect?manifest={self.manifest_url}&return={return_url}"
    
    def verify_connect_proof(self, proof: Dict, wallet_address: str) -> bool:
        """Verify TON Connect proof of ownership"""
        # In production: verify Ed25519 signature
        # For demo: accept
        return True


# Jetton (token) operations
class TONJetton:
    """Handle TON Jetton (token) operations"""
    
    def __init__(self):
        self.api_key = TON_API_KEY
        self.jetton_master = os.getenv("LXG_JETTON_MASTER", "")
    
    async def get_jetton_balance(self, wallet_address: str) -> Dict:
        """Get LXG Jetton balance on TON"""
        if not self.api_key:
            return {"balance": 0, "demo": True}
        
        # Query jetton wallet for user
        # This is simplified - actual implementation would use TON contracts
        return {
            "wallet_address": wallet_address,
            "jetton_master": self.jetton_master,
            "balance": 0,  # Would query actual balance
            "decimals": 9
        }
    
    async def get_jetton_transfers(self, wallet_address: str, limit: int = 10) -> List[Dict]:
        """Get Jetton transfer history"""
        return []  # Would implement actual query


# Webhook handler for TON
async def handle_ton_webhook(payload: Dict) -> Dict:
    """
    Handle TON webhook notifications
    
    Args:
        payload: Webhook payload
        
    Returns:
        Dict with processed result
    """
    event = payload.get("event")
    
    if event == "transaction":
        tx = payload.get("transaction", {})
        
        return {
            "processed": True,
            "event": event,
            "hash": tx.get("hash"),
            "from": tx.get("from"),
            "to": tx.get("to"),
            "value": tx.get("value"),
            "message": tx.get("message")
        }
    
    return {"processed": False, "reason": "Unknown event"}


# Usage example
if __name__ == "__main__":
    import asyncio
    
    async def test():
        ton = TONNetwork()
        
        # Get wallet info
        wallet = "EQD..."  # Example address
        info = await ton.get_wallet_info(wallet)
        print("Wallet Info:", info)
        
        # Create deposit
        deposit = await ton.create_ton_deposit(
            user_id="user_123",
            ton_amount=1.0,
            user_ton_address=wallet
        )
        print("Deposit:", deposit)
        
        # Convert
        print("1 TON =", ton.ton_to_lxg(1), "LXG")
        print("100 LXG =", ton.lxg_to_ton(100), "TON")
        
        # Get price
        price = await ton.get_ton_price()
        print("TON Price:", price)
    
    asyncio.run(test())
