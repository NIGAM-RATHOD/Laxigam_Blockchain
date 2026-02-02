"""
Mediator Service - Core API Routes for Laxigam Mediator App
Handles the complete flow of Fiat <-> LXG conversions

This module:
- Processes deposit initiations (Fiat -> LXG)
- Processes withdrawal requests (LXG -> Fiat)
- Signs blockchain transactions for the MediatorVault contract
- Integrates with all payment gateways
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import hashlib
import json
import time
import os

# Import payment handlers
from payments.india_upi import UPIPaymentHandler
from payments.brazil_pix import PIXPaymentHandler
from payments.russia_qiwi import QIWIPaymentHandler
from payments.china_alipay import AlipayPaymentHandler
from payments.telegram_stars import TelegramStarsHandler
from payments.ton_network import TONNetworkHandler

# Blockchain signer
from signer import sign_mediator_transaction

router = APIRouter(prefix="/api/mediator", tags=["Mediator"])

# Environment
LXG_USD_RATE = float(os.getenv("LXG_USD_RATE", "0.05"))

# Exchange rates (Fiat -> USD)
EXCHANGE_RATES = {
    "USD": 1.0,
    "INR": 83.0,
    "BRL": 5.0,
    "RUB": 92.0,
    "CNY": 7.2,
    "ZAR": 18.5,
}

# Payment handlers mapping
PAYMENT_HANDLERS = {
    "UPI": UPIPaymentHandler,
    "PIX": PIXPaymentHandler,
    "QIWI": QIWIPaymentHandler,
    "ALIPAY": AlipayPaymentHandler,
    "STARS": TelegramStarsHandler,
    "TON": TONNetworkHandler,
}

# ═══════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════

class DepositInitRequest(BaseModel):
    """Request to initiate a deposit (buy LXG with fiat)"""
    wallet_address: str = Field(..., description="User's wallet address")
    payment_method: str = Field(..., description="UPI, PIX, QIWI, ALIPAY, STARS, TON")
    amount_fiat: float = Field(..., gt=0, description="Amount in fiat currency")
    currency: str = Field(..., description="Currency code: INR, BRL, RUB, CNY, USD")
    telegram_id: Optional[int] = Field(None, description="Telegram user ID for notifications")

class DepositConfirmRequest(BaseModel):
    """Webhook/callback to confirm a deposit was paid"""
    payment_id: str = Field(..., description="Payment ID from initiation")
    gateway_transaction_id: str = Field(..., description="Transaction ID from payment gateway")
    status: str = Field(..., description="Payment status: success, failed, pending")

class WithdrawRequest(BaseModel):
    """Request to withdraw LXG to fiat"""
    wallet_address: str = Field(..., description="User's wallet address")
    amount_lxg: float = Field(..., gt=0, description="Amount of LXG to withdraw")
    payment_method: str = Field(..., description="UPI, PIX, QIWI, ALIPAY")
    destination: str = Field(..., description="UPI ID, PIX key, QIWI phone, etc.")
    currency: str = Field(..., description="Target currency")
    telegram_id: Optional[int] = Field(None, description="Telegram user ID for notifications")

class QuoteRequest(BaseModel):
    """Get a quote for conversion"""
    direction: str = Field(..., description="fiat_to_lxg or lxg_to_fiat")
    amount: float = Field(..., gt=0)
    currency: str
    payment_method: str

# ═══════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════

def fiat_to_lxg(amount_fiat: float, currency: str) -> float:
    """Convert fiat amount to LXG"""
    rate = EXCHANGE_RATES.get(currency.upper(), 1.0)
    usd_amount = amount_fiat / rate
    return round(usd_amount / LXG_USD_RATE, 6)

def lxg_to_fiat(amount_lxg: float, currency: str) -> float:
    """Convert LXG to fiat amount"""
    usd_amount = amount_lxg * LXG_USD_RATE
    rate = EXCHANGE_RATES.get(currency.upper(), 1.0)
    return round(usd_amount * rate, 2)

def generate_payment_id() -> str:
    """Generate unique payment ID"""
    return hashlib.sha256(
        f"{time.time()}{os.urandom(16).hex()}".encode()
    ).hexdigest()[:32]

# ═══════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/quote")
async def get_quote(request: QuoteRequest):
    """
    Get a quote for fiat <-> LXG conversion
    
    This shows the user exactly how much they will receive before committing.
    """
    if request.direction == "fiat_to_lxg":
        lxg_amount = fiat_to_lxg(request.amount, request.currency)
        fee_lxg = lxg_amount * 0.005  # 0.5% deposit fee
        net_lxg = lxg_amount - fee_lxg
        
        return {
            "direction": "fiat_to_lxg",
            "input_amount": request.amount,
            "input_currency": request.currency,
            "output_amount": net_lxg,
            "output_currency": "LXG",
            "fee_amount": fee_lxg,
            "fee_currency": "LXG",
            "fee_percentage": 0.5,
            "exchange_rate": f"1 {request.currency} = {fiat_to_lxg(1, request.currency)} LXG",
            "valid_for_seconds": 300,
            "timestamp": datetime.utcnow().isoformat()
        }
    else:
        fiat_amount = lxg_to_fiat(request.amount, request.currency)
        fee_fiat = fiat_amount * 0.01  # 1% withdrawal fee
        net_fiat = fiat_amount - fee_fiat
        
        return {
            "direction": "lxg_to_fiat",
            "input_amount": request.amount,
            "input_currency": "LXG",
            "output_amount": net_fiat,
            "output_currency": request.currency,
            "fee_amount": fee_fiat,
            "fee_currency": request.currency,
            "fee_percentage": 1.0,
            "exchange_rate": f"1 LXG = {lxg_to_fiat(1, request.currency)} {request.currency}",
            "valid_for_seconds": 300,
            "timestamp": datetime.utcnow().isoformat()
        }

@router.post("/deposit/initiate")
async def initiate_deposit(request: DepositInitRequest, background_tasks: BackgroundTasks):
    """
    Step 1: Initiate a deposit (Buy LXG with Fiat)
    
    Returns payment instructions (QR code, UPI link, etc.)
    """
    # Validate payment method
    payment_method = request.payment_method.upper()
    if payment_method not in PAYMENT_HANDLERS:
        raise HTTPException(400, f"Unsupported payment method: {payment_method}")
    
    # Calculate LXG amount
    lxg_amount = fiat_to_lxg(request.amount_fiat, request.currency)
    
    # Minimum check
    MIN_LXG = 10  # 10 LXG minimum
    if lxg_amount < MIN_LXG:
        raise HTTPException(400, f"Minimum deposit is {MIN_LXG} LXG")
    
    # Generate payment ID
    payment_id = generate_payment_id()
    
    # Initialize payment handler
    handler = PAYMENT_HANDLERS[payment_method]()
    
    # Create payment with gateway
    payment_result = await handler.create_payment(
        payment_id=payment_id,
        amount=request.amount_fiat,
        currency=request.currency,
        user_wallet=request.wallet_address,
        lxg_amount=lxg_amount
    )
    
    # Store in database (would call db_pool.acquire() in real implementation)
    # For now, just return the result
    
    return {
        "success": True,
        "payment_id": payment_id,
        "payment_method": payment_method,
        "input": {
            "amount": request.amount_fiat,
            "currency": request.currency
        },
        "output": {
            "amount": lxg_amount,
            "currency": "LXG"
        },
        "payment_details": payment_result,
        "expires_at": (datetime.utcnow() + timedelta(minutes=30)).isoformat(),
        "next_step": "Complete payment using the provided instructions. LXG will be sent to your wallet automatically.",
        "webhook_url": f"/api/mediator/deposit/webhook/{payment_id}"
    }

@router.post("/deposit/webhook/{payment_id}")
async def deposit_webhook(payment_id: str, request: DepositConfirmRequest, background_tasks: BackgroundTasks):
    """
    Step 2: Payment gateway webhook callback
    
    Called automatically when user completes payment.
    Triggers blockchain transaction to send LXG to user.
    """
    if request.status != "success":
        # Payment failed, notify user
        return {"status": "failed", "message": "Payment was not successful"}
    
    # In production: Fetch deposit request from database
    # deposit_request = await db.get_deposit(payment_id)
    
    # Sign transaction for MediatorVault contract
    # This signature is used by the contract to verify the backend approved this deposit
    signature_data = sign_mediator_transaction(
        action="fulfill_deposit",
        payment_id=payment_id,
        # user=deposit_request.wallet_address,
        # amount=deposit_request.lxg_amount
    )
    
    # Queue blockchain transaction
    background_tasks.add_task(
        execute_deposit_on_chain,
        payment_id=payment_id,
        signature=signature_data
    )
    
    return {
        "status": "processing",
        "payment_id": payment_id,
        "message": "Payment confirmed. LXG is being sent to your wallet.",
        "estimated_time_seconds": 30
    }

@router.post("/withdraw/initiate")
async def initiate_withdrawal(request: WithdrawRequest, background_tasks: BackgroundTasks):
    """
    Step 1: Initiate a withdrawal (Sell LXG for Fiat)
    
    Returns a signature that the user must submit to the MediatorVault contract.
    After contract verifies and locks LXG, backend processes fiat payout.
    """
    # Validate payment method
    payment_method = request.payment_method.upper()
    if payment_method not in ["UPI", "PIX", "QIWI", "ALIPAY"]:
        raise HTTPException(400, f"Withdrawal not supported for: {payment_method}")
    
    # Calculate fiat amount
    fiat_amount = lxg_to_fiat(request.amount_lxg, request.currency)
    
    # Minimum check
    MIN_FIAT = {"INR": 100, "BRL": 10, "RUB": 100, "CNY": 10, "USD": 5}
    min_amount = MIN_FIAT.get(request.currency.upper(), 5)
    if fiat_amount < min_amount:
        raise HTTPException(400, f"Minimum withdrawal is {min_amount} {request.currency}")
    
    # Generate request ID and nonce
    request_id = generate_payment_id()
    nonce = int(time.time() * 1000)
    
    # Sign withdrawal approval for the user to submit to contract
    signature = sign_mediator_transaction(
        action="approve_withdrawal",
        user=request.wallet_address,
        amount_lxg=int(request.amount_lxg * 10**18),  # Convert to wei
        destination=request.destination,
        currency=request.currency,
        amount_fiat=fiat_amount,
        nonce=nonce
    )
    
    return {
        "success": True,
        "request_id": request_id,
        "input": {
            "amount": request.amount_lxg,
            "currency": "LXG"
        },
        "output": {
            "amount": fiat_amount,
            "currency": request.currency,
            "destination": request.destination
        },
        "fee": {
            "amount": request.amount_lxg * 0.01,
            "currency": "LXG",
            "percentage": 1.0
        },
        "blockchain_data": {
            "signature": signature,
            "nonce": nonce,
            "contract_method": "requestWithdrawal",
            "instructions": "Submit this signature to the MediatorVault contract to lock your LXG."
        },
        "next_step": "Submit the transaction to the blockchain. Fiat will be sent within 24 hours.",
        "estimated_payout_hours": 24
    }

@router.get("/status/{request_id}")
async def get_request_status(request_id: str):
    """
    Get the status of a deposit or withdrawal request
    """
    # In production: Query database
    return {
        "request_id": request_id,
        "status": "pending",  # pending, processing, completed, failed
        "type": "deposit",  # deposit or withdrawal
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "details": {}
    }

@router.get("/history/{wallet_address}")
async def get_user_history(wallet_address: str, limit: int = 20, offset: int = 0):
    """
    Get user's transaction history
    """
    # In production: Query database
    return {
        "wallet_address": wallet_address,
        "transactions": [],
        "total": 0,
        "limit": limit,
        "offset": offset
    }

@router.get("/rates")
async def get_current_rates():
    """
    Get current exchange rates for all supported currencies
    """
    rates = {}
    for currency, usd_rate in EXCHANGE_RATES.items():
        lxg_per_fiat = 1 / (usd_rate * LXG_USD_RATE)
        fiat_per_lxg = usd_rate * LXG_USD_RATE
        rates[currency] = {
            "lxg_per_fiat": round(lxg_per_fiat, 6),
            "fiat_per_lxg": round(fiat_per_lxg, 2),
            "usd_rate": usd_rate
        }
    
    return {
        "base_rate_usd": LXG_USD_RATE,
        "rates": rates,
        "last_updated": datetime.utcnow().isoformat(),
        "next_update_in_seconds": 300
    }

# ═══════════════════════════════════════════════════════════════════════════
# Background Tasks
# ═══════════════════════════════════════════════════════════════════════════

async def execute_deposit_on_chain(payment_id: str, signature: str):
    """
    Background task to execute deposit on blockchain
    """
    # In production:
    # 1. Call MediatorVault.fulfillDeposit(payment_id)
    # 2. Wait for confirmation
    # 3. Update database
    # 4. Notify user via Telegram
    pass

async def process_fiat_payout(request_id: str, amount: float, currency: str, destination: str, method: str):
    """
    Background task to process fiat payout
    """
    # In production:
    # 1. Call appropriate payment gateway payout API
    # 2. Wait for confirmation
    # 3. Call MediatorVault.processWithdrawal(request_id)
    # 4. Notify user via Telegram
    pass
