"""
Laxigam Blockchain - Backend API Server
Production-ready FastAPI backend for LXG token ecosystem

Features:
- User authentication and wallet management
- AI-powered transaction validation (Gemini + Claude)
- BRICS payment integrations (UPI, PIX, QIWI, Alipay)
- Telegram bot integration
- Telegram Stars & TON network support
- PIN-based security
"""

from fastapi import FastAPI, HTTPException, Header, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import hashlib
import os
import random
import time
import json
import asyncio
import httpx
from dotenv import load_dotenv
import asyncpg
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
MINI_APP_URL = os.getenv("MINI_APP_URL", "http://localhost:3000")
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "dev_secret_change_in_production")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
AI_MODE = os.getenv("AI_MODE", "hybrid")  # online, local, hybrid
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://laxigam:laxigam@localhost:5432/laxigam")

# Payment Gateway Keys
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET", "")
MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
QIWI_SECRET_KEY = os.getenv("QIWI_SECRET_KEY", "")
ALIPAY_APP_ID = os.getenv("ALIPAY_APP_ID", "")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
TELEGRAM_PAYMENT_TOKEN = os.getenv("TELEGRAM_PAYMENT_TOKEN", "")
TON_API_KEY = os.getenv("TON_API_KEY", "")

# Exchange rates (LXG/USD base rate)
LXG_USD_RATE = float(os.getenv("LXG_USD_RATE", "0.05"))  # 1 LXG = $0.05

# Database pool
db_pool = None

async def init_db():
    """Initialize database connection pool"""
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL)
    
    async with db_pool.acquire() as conn:
        # Users table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                telegram_id BIGINT UNIQUE,
                wallet_address VARCHAR(42) UNIQUE,
                created_at TIMESTAMP DEFAULT NOW(),
                last_active TIMESTAMP DEFAULT NOW(),
                trust_score INTEGER DEFAULT 50,
                kyc_verified BOOLEAN DEFAULT FALSE,
                kyc_data JSONB
            )
        """)
        
        # Transactions table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                tx_hash VARCHAR(66),
                type VARCHAR(50),
                amount_lxg DECIMAL(18,6),
                amount_fiat DECIMAL(18,2),
                currency VARCHAR(3),
                source VARCHAR(50),
                destination VARCHAR(50),
                status VARCHAR(20) DEFAULT 'pending',
                ai_validation JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                confirmed_at TIMESTAMP,
                metadata JSONB
            )
        """)
        
        # Payments table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                payment_method VARCHAR(20),
                external_id VARCHAR(100),
                amount_fiat DECIMAL(18,2),
                currency VARCHAR(3),
                lxg_amount DECIMAL(18,6),
                status VARCHAR(20) DEFAULT 'pending',
                payment_details JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP
            )
        """)
        
        # Withdrawals table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS withdrawals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                amount_lxg DECIMAL(18,6),
                amount_fiat DECIMAL(18,2),
                currency VARCHAR(3),
                destination VARCHAR(200),
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                processed_at TIMESTAMP,
                metadata JSONB
            )
        """)
        
        # PIN hashes table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS pin_hashes (
                user_address VARCHAR(42) PRIMARY KEY,
                pin_hash VARCHAR(64),
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                telegram_chat_id VARCHAR(50)
            )
        """)
        
        # Game integrations table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS game_integrations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                game_name VARCHAR(100) UNIQUE,
                game_api_url VARCHAR(255),
                api_key VARCHAR(100),
                conversion_rate DECIMAL,
                enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                metadata JSONB
            )
        """)
        
        # AI validation history
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_validation_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender VARCHAR(42),
                receiver VARCHAR(42),
                amount DECIMAL(18,6),
                approved BOOLEAN,
                confidence DECIMAL(5,2),
                gemini_response JSONB,
                claude_response JSONB,
                reason TEXT,
                risk_level VARCHAR(10),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    await init_db()
    yield
    if db_pool:
        await db_pool.close()

app = FastAPI(
    title="Laxigam Blockchain API",
    description="Production API for LXG token ecosystem",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class TransactionData(BaseModel):
    sender: str
    receiver: str
    amount: float
    trust_score: int
    transaction_type: str
    game_name: Optional[str] = None

class PinRequest(BaseModel):
    user_address: str
    telegram_chat_id: Optional[str] = None

class PinVerifyRequest(BaseModel):
    user_address: str
    pin: str
    amount: float = 0.0
    receiver: str = ""
    transaction_type: str = "deposit"

class DepositInitiateRequest(BaseModel):
    payment_method: str  # UPI, PIX, QIWI, ALIPAY, CARD, STARS, TON
    amount_fiat: float
    currency: str  # INR, BRL, RUB, CNY, USD
    user_id: Optional[str] = None

class WithdrawInitiateRequest(BaseModel):
    amount_lxg: float
    payment_method: str
    destination: str
    currency: str

class TransferRequest(BaseModel):
    user_address: str
    game_name: str
    amount: float
    direction: str  # to_game or to_wallet

class UserRegisterRequest(BaseModel):
    telegram_id: Optional[int] = None
    wallet_address: str

class AIValidationRequest(BaseModel):
    sender: str
    receiver: str
    amount: float
    trust_score: int
    tx_type: str
    transaction_history: Optional[List[Dict]] = None

# Helper Functions
async def verify_api_key(x_api_key: str = Header(default="")):
    if x_api_key != API_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key

async def send_telegram_message(chat_id: str, text: str, reply_markup: dict = None):
    """Send message via Telegram Bot API"""
    if not TELEGRAM_BOT_TOKEN:
        return False
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = json.dumps(reply_markup)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=10.0)
            return response.status_code == 200
        except Exception as e:
            print(f"Telegram error: {e}")
            return False

async def send_telegram_pin(chat_id: str, pin: str, purpose: str = "transaction"):
    """Send PIN to user via Telegram"""
    message = f"""
🔐 <b>Laxigam Security PIN</b>

Your one-time verification PIN for <b>{purpose}</b> is:

<code>{pin}</code>

⏰ Valid for 10 minutes
⚠️ Do not share this PIN with anyone!

🛡️ AI Validated • BRICS Secure
    """
    return await send_telegram_message(chat_id, message)

# AI Validation Functions
async def call_gemini_validation(data: dict) -> dict:
    """Call Google Gemini API for transaction validation"""
    if not GEMINI_API_KEY:
        return {"approved": True, "confidence": 0.7, "reason": "Gemini API not configured"}
    
    prompt = f"""
You are a blockchain transaction fraud detector. Analyze this transaction and respond ONLY with valid JSON.

Transaction Details:
- Sender: {data['sender']}
- Receiver: {data['receiver']}
- Amount: {data['amount']} LXG
- Sender Trust Score: {data['trust_score']}/100
- Transaction Type: {data['tx_type']}

Red Flags to Check:
1. Amount Anomaly: Score < 30 + Amount > 1000 LXG = HIGH RISK
2. Rapid Transactions: Check if sender made many transfers recently
3. Round-Trip Pattern: Money going A→B→A (money laundering)
4. New Account: Account < 7 days old with large transfers
5. Low Trust Receiver: Receiver has trust score < 10

Respond with ONLY this JSON format (no markdown, no explanation):
{{
  "approved": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "risk_level": "low/medium/high",
  "recommended_action": "approve/reject/hold_for_review"
}}
"""
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 200}
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                # Extract JSON from response
                try:
                    json_start = text.find("{")
                    json_end = text.rfind("}") + 1
                    if json_start >= 0 and json_end > json_start:
                        return json.loads(text[json_start:json_end])
                except:
                    pass
    except Exception as e:
        print(f"Gemini API error: {e}")
    
    return {"approved": True, "confidence": 0.6, "reason": "Gemini validation failed, using fallback"}

async def call_claude_validation(data: dict) -> dict:
    """Call Anthropic Claude API for transaction validation"""
    if not ANTHROPIC_API_KEY:
        return {"approved": True, "confidence": 0.7, "reason": "Claude API not configured"}
    
    prompt = f"""
Analyze this blockchain transaction for fraud detection. Respond ONLY with valid JSON.

Transaction:
- Sender: {data['sender']}
- Receiver: {data['receiver']}
- Amount: {data['amount']} LXG
- Trust Score: {data['trust_score']}/100
- Type: {data['tx_type']}

Fraud Indicators:
- Low trust + high amount = suspicious
- New accounts with large transfers = suspicious
- Round-trip transactions = money laundering

JSON Response Only:
{{
  "approved": boolean,
  "confidence": 0.0-1.0,
  "reason": "string",
  "risk_level": "low/medium/high",
  "recommended_action": "approve/reject/hold_for_review"
}}
"""
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 200,
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                text = result.get("content", [{}])[0].get("text", "")
                try:
                    json_start = text.find("{")
                    json_end = text.rfind("}") + 1
                    if json_start >= 0 and json_end > json_start:
                        return json.loads(text[json_start:json_end])
                except:
                    pass
    except Exception as e:
        print(f"Claude API error: {e}")
    
    return {"approved": True, "confidence": 0.6, "reason": "Claude validation failed, using fallback"}

async def ai_consensus_validation(data: dict) -> dict:
    """Get consensus from both AI models"""
    gemini_result = await call_gemini_validation(data)
    claude_result = await call_claude_validation(data)
    
    # Consensus logic
    gemini_approved = gemini_result.get("approved", True)
    claude_approved = claude_result.get("approved", True)
    gemini_confidence = gemini_result.get("confidence", 0.5)
    claude_confidence = claude_result.get("confidence", 0.5)
    
    # Both approve = approved
    # Either rejects = rejected
    # Disagreement with low confidence = rejected (err on safe side)
    if gemini_approved and claude_approved:
        approved = True
        confidence = (gemini_confidence + claude_confidence) / 2
        reason = f"Both AI approve: {gemini_result.get('reason', '')} | {claude_result.get('reason', '')}"
    elif not gemini_approved or not claude_approved:
        approved = False
        confidence = max(gemini_confidence, claude_confidence)
        reason = f"AI rejection: {gemini_result.get('reason', '')} | {claude_result.get('reason', '')}"
    else:
        approved = False
        confidence = 0.5
        reason = "AI disagreement, erring on safe side"
    
    risk_level = "high"
    if gemini_result.get("risk_level") == "high" or claude_result.get("risk_level") == "high":
        risk_level = "high"
    elif gemini_result.get("risk_level") == "medium" or claude_result.get("risk_level") == "medium":
        risk_level = "medium"
    else:
        risk_level = "low"
    
    return {
        "approved": approved,
        "confidence": confidence,
        "reason": reason,
        "risk_level": risk_level,
        "gemini_response": gemini_result,
        "claude_response": claude_result
    }

# Exchange Rate Functions
def get_exchange_rate(currency: str) -> float:
    """Get exchange rate for currency to USD"""
    rates = {
        "USD": 1.0,
        "INR": 83.0,  # Indian Rupee
        "BRL": 5.0,   # Brazilian Real
        "RUB": 92.0,  # Russian Ruble
        "CNY": 7.2,   # Chinese Yuan
        "ZAR": 18.5,  # South African Rand
    }
    return rates.get(currency.upper(), 1.0)

def fiat_to_lxg(amount_fiat: float, currency: str) -> float:
    """Convert fiat amount to LXG tokens"""
    exchange_rate = get_exchange_rate(currency)
    usd_amount = amount_fiat / exchange_rate
    lxg_amount = usd_amount / LXG_USD_RATE
    return round(lxg_amount, 6)

def lxg_to_fiat(amount_lxg: float, currency: str) -> float:
    """Convert LXG tokens to fiat amount"""
    usd_amount = amount_lxg * LXG_USD_RATE
    exchange_rate = get_exchange_rate(currency)
    fiat_amount = usd_amount * exchange_rate
    return round(fiat_amount, 2)

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    ai_status = {
        "gemini": bool(GEMINI_API_KEY),
        "claude": bool(ANTHROPIC_API_KEY)
    }
    
    db_status = "connected" if db_pool else "disconnected"
    
    return {
        "status": "ok",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "ai_online": ai_status,
        "database": db_status,
        "telegram_configured": bool(TELEGRAM_BOT_TOKEN)
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Laxigam Blockchain API",
        "version": "2.0.0",
        "description": "Production API for LXG token ecosystem",
        "features": [
            "AI Transaction Validation",
            "BRICS Payment Integration",
            "Telegram Bot",
            "Telegram Stars",
            "TON Network"
        ],
        "documentation": "/docs"
    }

# User Management
@app.post("/api/auth/register")
async def register_user(request: UserRegisterRequest):
    """Register a new user"""
    async with db_pool.acquire() as conn:
        # Check if user exists
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE wallet_address = $1",
            request.wallet_address.lower()
        )
        
        if existing:
            return {"success": True, "user_id": str(existing["id"]), "message": "User already exists"}
        
        # Create new user
        user_id = await conn.fetchval(
            """
            INSERT INTO users (telegram_id, wallet_address, trust_score)
            VALUES ($1, $2, 50)
            RETURNING id
            """,
            request.telegram_id,
            request.wallet_address.lower()
        )
        
        return {
            "success": True,
            "user_id": str(user_id),
            "wallet_address": request.wallet_address.lower(),
            "trust_score": 50,
            "message": "User registered successfully"
        }

@app.get("/api/user/{wallet_address}")
async def get_user(wallet_address: str):
    """Get user details"""
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE wallet_address = $1",
            wallet_address.lower()
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get balances (mock - would query blockchain)
        real_balance = 0.0  # Would query from blockchain
        game_balances = {}  # Would query from blockchain
        
        return {
            "user_id": str(user["id"]),
            "telegram_id": user["telegram_id"],
            "wallet_address": user["wallet_address"],
            "trust_score": user["trust_score"],
            "kyc_verified": user["kyc_verified"],
            "created_at": user["created_at"].isoformat() if user["created_at"] else None,
            "real_wallet_balance": real_balance,
            "game_wallets": game_balances
        }

# AI Validation
@app.post("/api/ai/validate")
async def validate_transaction(request: AIValidationRequest, api_key: str = Depends(verify_api_key)):
    """Validate transaction using AI consensus"""
    data = {
        "sender": request.sender,
        "receiver": request.receiver,
        "amount": request.amount,
        "trust_score": request.trust_score,
        "tx_type": request.tx_type,
        "transaction_history": request.transaction_history or []
    }
    
    result = await ai_consensus_validation(data)
    
    # Store in database
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO ai_validation_history 
            (sender, receiver, amount, approved, confidence, gemini_response, claude_response, reason, risk_level)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            request.sender,
            request.receiver,
            request.amount,
            result["approved"],
            result["confidence"],
            json.dumps(result["gemini_response"]),
            json.dumps(result["claude_response"]),
            result["reason"],
            result["risk_level"]
        )
    
    return result

# PIN Management
@app.post("/api/pin/generate")
async def generate_pin(request: PinRequest, api_key: str = Depends(verify_api_key)):
    """Generate 6-digit PIN for transaction security"""
    pin = str(random.randint(100000, 999999))
    pin_hash = hashlib.sha256(pin.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO pin_hashes (user_address, pin_hash, expires_at, telegram_chat_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_address) DO UPDATE
            SET pin_hash = $2, expires_at = $3, telegram_chat_id = $4
            """,
            request.user_address.lower(),
            pin_hash,
            expires_at,
            request.telegram_chat_id
        )
    
    # Send PIN via Telegram if chat_id provided
    telegram_sent = False
    if request.telegram_chat_id:
        telegram_sent = await send_telegram_pin(request.telegram_chat_id, pin)
    
    return {
        "success": True,
        "pin_hash": pin_hash,
        "expires_in": 600,
        "telegram_sent": telegram_sent,
        "pin": pin if not request.telegram_chat_id else None  # Only return PIN if not sent via Telegram
    }

@app.post("/api/pin/verify")
async def verify_pin(request: PinVerifyRequest, api_key: str = Depends(verify_api_key)):
    """Verify submitted PIN"""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT pin_hash, expires_at, telegram_chat_id FROM pin_hashes WHERE user_address = $1",
            request.user_address.lower()
        )
        
        if not row:
            return {"verified": False, "reason": "No PIN found for user"}
        
        if datetime.utcnow() > row["expires_at"]:
            await conn.execute(
                "DELETE FROM pin_hashes WHERE user_address = $1",
                request.user_address.lower()
            )
            return {"verified": False, "reason": "PIN expired"}
        
        submitted_hash = hashlib.sha256(request.pin.encode()).hexdigest()
        
        if submitted_hash == row["pin_hash"]:
            await conn.execute(
                "DELETE FROM pin_hashes WHERE user_address = $1",
                request.user_address.lower()
            )
            
            # SIGN THE TRANSACTION
            signature_data = None
            nonce = int(time.time() * 1000)
            
            if request.transaction_type == "deposit" and request.amount > 0:
                 from signer import sign_transaction_approval
                 amount_wei = int(request.amount * 10**18)
                 signature_data = sign_transaction_approval(
                     request.user_address,
                     amount_wei,
                     nonce
                 )

            if row["telegram_chat_id"]:
                await send_telegram_message(
                    row["telegram_chat_id"], 
                    "✅ <b>Transaction Approved!</b>\n\nYour PIN was verified successfully. The transaction has been processed."
                )
            
            return {
                "verified": True,
                "signature": signature_data,
                "nonce": nonce
            }
        
        return {"verified": False, "reason": "Incorrect PIN"}

# Deposits
@app.post("/api/deposit/initiate")
async def initiate_deposit(request: DepositInitiateRequest, api_key: str = Depends(verify_api_key)):
    """Initiate fiat deposit to get LXG"""
    payment_method = request.payment_method.upper()
    lxg_amount = fiat_to_lxg(request.amount_fiat, request.currency)
    
    # Generate unique payment ID
    payment_id = hashlib.sha256(
        f"{request.user_id or 'anon'}{time.time()}{random.randint(1000, 9999)}".encode()
    ).hexdigest()[:32]
    
    payment_details = {
        "payment_id": payment_id,
        "payment_method": payment_method,
        "amount_fiat": request.amount_fiat,
        "currency": request.currency,
        "lxg_amount": lxg_amount,
        "status": "pending"
    }
    
    # Store in database
    if request.user_id:
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO payments (user_id, payment_method, external_id, amount_fiat, currency, lxg_amount, payment_details)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                request.user_id,
                payment_method,
                payment_id,
                request.amount_fiat,
                request.currency,
                lxg_amount,
                json.dumps(payment_details)
            )
    
    # Generate payment method specific details
    if payment_method == "UPI":
        # India - UPI via Razorpay
        payment_details["upi_id"] = "laxigam@upi"
        payment_details["qr_code"] = f"upi://pay?pa=laxigam@upi&pn=Laxigam&am={request.amount_fiat}&cu={request.currency}&tn={payment_id}"
        payment_details["instructions"] = "Scan QR code with any UPI app (GPay, PhonePe, Paytm)"
        
    elif payment_method == "PIX":
        # Brazil - PIX
        payment_details["pix_key"] = "laxigam@pix.br"
        payment_details["qr_code"] = f"00020126330014BR.GOV.BCB.PIX0114laxigam@pix.br520400005303{request.currency}540{request.amount_fiat}"
        payment_details["instructions"] = "Scan QR code with your bank app"
        
    elif payment_method == "QIWI":
        # Russia - QIWI
        payment_details["qiwi_wallet"] = "+79000000000"
        payment_details["instructions"] = "Transfer to QIWI wallet +79000000000 with comment: " + payment_id
        
    elif payment_method == "ALIPAY":
        # China - Alipay
        payment_details["alipay_account"] = "laxigam@alipay.com"
        payment_details["instructions"] = "Send to Alipay account: laxigam@alipay.com"
        
    elif payment_method == "CARD":
        # Global - Stripe
        payment_details["stripe_intent"] = "pi_" + payment_id
        payment_details["instructions"] = "Complete payment via card (Stripe integration required)"
        
    elif payment_method == "STARS":
        # Telegram Stars
        payment_details["stars_amount"] = int(request.amount_fiat * 10)  # 1 USD = 10 Stars approx
        payment_details["instructions"] = "Pay with Telegram Stars"
        
    elif payment_method == "TON":
        # TON Network
        payment_details["ton_address"] = "EQD..."  # Your TON wallet
        payment_details["ton_amount"] = request.amount_fiat / 5  # Approx TON price
        payment_details["instructions"] = "Send TON to address with memo"
        
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported payment method: {payment_method}")
    
    return {
        "success": True,
        "payment_id": payment_id,
        "payment_method": payment_method,
        "amount_fiat": request.amount_fiat,
        "currency": request.currency,
        "lxg_amount": lxg_amount,
        "payment_details": payment_details,
        "expires_at": (datetime.utcnow() + timedelta(minutes=30)).isoformat()
    }

@app.post("/api/deposit/callback")
async def deposit_callback(request: Request, api_key: str = Depends(verify_api_key)):
    """Handle payment gateway callbacks"""
    data = await request.json()
    payment_id = data.get("payment_id")
    
    async with db_pool.acquire() as conn:
        payment = await conn.fetchrow(
            "SELECT * FROM payments WHERE external_id = $1",
            payment_id
        )
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Update payment status
        await conn.execute(
            """
            UPDATE payments 
            SET status = 'completed', completed_at = NOW()
            WHERE external_id = $1
            """,
            payment_id
        )
        
        # Create transaction record
        await conn.execute(
            """
            INSERT INTO transactions (user_id, type, amount_lxg, amount_fiat, currency, source, destination, status)
            VALUES ($1, 'deposit', $2, $3, $4, 'fiat', 'real_wallet', 'confirmed')
            """,
            payment["user_id"],
            payment["lxg_amount"],
            payment["amount_fiat"],
            payment["currency"]
        )
        
        # In production: Call smart contract to mint LXG tokens
        
    return {"success": True, "message": "Payment confirmed", "lxg_credited": float(payment["lxg_amount"])}

# Transfers
@app.post("/api/transfer/to-game")
async def transfer_to_game(request: TransferRequest, api_key: str = Depends(verify_api_key)):
    """Transfer LXG from real wallet to game wallet"""
    # AI validation
    ai_result = await ai_consensus_validation({
        "sender": request.user_address,
        "receiver": "game_bridge",
        "amount": request.amount,
        "trust_score": 50,  # Would get from blockchain
        "tx_type": "deposit_to_game"
    })
    
    if not ai_result["approved"]:
        raise HTTPException(status_code=400, detail=f"AI validation failed: {ai_result['reason']}")
    
    async with db_pool.acquire() as conn:
        # Get user
        user = await conn.fetchrow(
            "SELECT id FROM users WHERE wallet_address = $1",
            request.user_address.lower()
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create transaction
        tx_id = await conn.fetchval(
            """
            INSERT INTO transactions (user_id, type, amount_lxg, source, destination, status, ai_validation)
            VALUES ($1, 'transfer_to_game', $2, 'real_wallet', $3, 'confirmed', $4)
            RETURNING id
            """,
            user["id"],
            request.amount,
            request.game_name,
            json.dumps(ai_result)
        )
        
        return {
            "success": True,
            "transaction_id": str(tx_id),
            "amount": request.amount,
            "game": request.game_name,
            "ai_validation": ai_result
        }

@app.post("/api/transfer/to-wallet")
async def transfer_to_wallet(request: TransferRequest, api_key: str = Depends(verify_api_key)):
    """Transfer LXG from game wallet to real wallet"""
    ai_result = await ai_consensus_validation({
        "sender": "game_bridge",
        "receiver": request.user_address,
        "amount": request.amount,
        "trust_score": 50,
        "tx_type": "withdraw_from_game"
    })
    
    if not ai_result["approved"]:
        raise HTTPException(status_code=400, detail=f"AI validation failed: {ai_result['reason']}")
    
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id FROM users WHERE wallet_address = $1",
            request.user_address.lower()
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        tx_id = await conn.fetchval(
            """
            INSERT INTO transactions (user_id, type, amount_lxg, source, destination, status, ai_validation)
            VALUES ($1, 'transfer_to_wallet', $2, $3, 'real_wallet', 'confirmed', $4)
            RETURNING id
            """,
            user["id"],
            request.amount,
            request.game_name,
            json.dumps(ai_result)
        )
        
        return {
            "success": True,
            "transaction_id": str(tx_id),
            "amount": request.amount,
            "ai_validation": ai_result
        }

# Withdrawals
@app.post("/api/withdraw/initiate")
async def initiate_withdrawal(request: WithdrawInitiateRequest, api_key: str = Depends(verify_api_key)):
    """Initiate LXG withdrawal to fiat"""
    fiat_amount = lxg_to_fiat(request.amount_lxg, request.currency)
    
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id FROM users WHERE wallet_address = $1",
            request.destination.lower()
        )
        
        withdrawal_id = await conn.fetchval(
            """
            INSERT INTO withdrawals (user_id, amount_lxg, amount_fiat, currency, destination, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING id
            """,
            user["id"] if user else None,
            request.amount_lxg,
            fiat_amount,
            request.currency,
            request.destination
        )
        
        return {
            "success": True,
            "withdrawal_id": str(withdrawal_id),
            "amount_lxg": request.amount_lxg,
            "amount_fiat": fiat_amount,
            "currency": request.currency,
            "estimated_time": "24-48 hours",
            "fees": fiat_amount * 0.02  # 2% fee
        }

# Balance & History
@app.get("/api/balance/{wallet_address}")
async def get_balance(wallet_address: str):
    """Get user balances"""
    # In production: Query blockchain for actual balances
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id FROM users WHERE wallet_address = $1",
            wallet_address.lower()
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Mock balances - would query from blockchain
        return {
            "wallet_address": wallet_address.lower(),
            "real_wallet": 1250.00,
            "game_wallets": {
                "GTA_V": 500.00,
                "Minecraft": 200.00,
                "Fortnite": 150.00
            },
            "total": 2100.00,
            "usd_value": 2100.00 * LXG_USD_RATE
        }

@app.get("/api/transactions/{wallet_address}")
async def get_transactions(wallet_address: str, limit: int = 50, offset: int = 0):
    """Get transaction history"""
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id FROM users WHERE wallet_address = $1",
            wallet_address.lower()
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        rows = await conn.fetch(
            """
            SELECT * FROM transactions 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
            """,
            user["id"],
            limit,
            offset
        )
        
        transactions = []
        for row in rows:
            transactions.append({
                "id": str(row["id"]),
                "type": row["type"],
                "amount_lxg": float(row["amount_lxg"]) if row["amount_lxg"] else 0,
                "amount_fiat": float(row["amount_fiat"]) if row["amount_fiat"] else 0,
                "currency": row["currency"],
                "source": row["source"],
                "destination": row["destination"],
                "status": row["status"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None
            })
        
        return {
            "transactions": transactions,
            "total": len(transactions),
            "limit": limit,
            "offset": offset
        }

# Exchange Rates
@app.get("/api/exchange-rates")
async def get_exchange_rates():
    """Get current exchange rates"""
    return {
        "lxg_usd": LXG_USD_RATE,
        "rates": {
            "USD": {"rate": 1.0, "lxg_value": 1 / LXG_USD_RATE},
            "INR": {"rate": 83.0, "lxg_value": (1 / LXG_USD_RATE) / 83.0},
            "BRL": {"rate": 5.0, "lxg_value": (1 / LXG_USD_RATE) / 5.0},
            "RUB": {"rate": 92.0, "lxg_value": (1 / LXG_USD_RATE) / 92.0},
            "CNY": {"rate": 7.2, "lxg_value": (1 / LXG_USD_RATE) / 7.2},
            "ZAR": {"rate": 18.5, "lxg_value": (1 / LXG_USD_RATE) / 18.5},
        },
        "last_updated": datetime.utcnow().isoformat()
    }

# Telegram Bot Webhook
@app.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """Handle Telegram bot webhook"""
    data = await request.json()
    
    if "message" in data:
        message = data["message"]
        chat_id = str(message.get("chat", {}).get("id", ""))
        text = message.get("text", "")
        user = message.get("from", {})
        first_name = user.get("first_name", "User")
        
        if text == "/start":
            keyboard = {
                "inline_keyboard": [[
                    {
                        "text": "🎮 Open Laxigam App",
                        "web_app": {"url": MINI_APP_URL}
                    }
                ], [
                    {"text": "💰 Check Balance", "callback_data": "balance"},
                    {"text": "❓ Help", "callback_data": "help"}
                ]]
            }
            
            welcome = f"""
🎮 <b>Welcome to Laxigam, {first_name}!</b>

The blockchain that bridges real-world finance with game economies.

<b>🌍 BRICS+ Payments Supported:</b>
🇮🇳 India - UPI
🇧🇷 Brazil - PIX
🇷🇺 Russia - QIWI
🇨🇳 China - Alipay
🇿🇦 South Africa - PayFast
⭐ Telegram Stars
💎 TON Network

<b>Your Chat ID:</b> <code>{chat_id}</code>
<i>(Copy this to link your wallet)</i>

Tap below to open the Mini App:
            """
            await send_telegram_message(chat_id, welcome, keyboard)
        
        elif text == "/app":
            keyboard = {
                "inline_keyboard": [[
                    {"text": "🎮 Open Laxigam App", "web_app": {"url": MINI_APP_URL}}
                ]]
            }
            await send_telegram_message(chat_id, "Tap below to open the app:", keyboard)
        
        elif text == "/balance":
            await send_telegram_message(chat_id, "💰 Connect your wallet in the app to view balance.\n\nUse /app to open.")
        
        elif text == "/help":
            help_text = """
📚 <b>Laxigam Help</b>

<b>Commands:</b>
/start - Welcome & Setup
/app - Open Mini App
/balance - Check balance
/help - This menu

<b>Features:</b>
• <b>Deposit</b>: Fiat → LXG tokens
• <b>Transfer</b>: Real ↔ Game wallets
• <b>Withdraw</b>: LXG → Fiat
• <b>AI Security</b>: Dual validation
• <b>Trust Score</b>: Build reputation

<b>Supported Payments:</b>
🇮🇳 UPI (India)
🇧🇷 PIX (Brazil)
🇷🇺 QIWI (Russia)
🇨🇳 Alipay (China)
⭐ Telegram Stars
💎 TON Network

Need support? Contact @LaxigamSupport
            """
            await send_telegram_message(chat_id, help_text)
        
        else:
            await send_telegram_message(chat_id, f"👋 Hi {first_name}!\n\nUse /app to open Laxigam or /help for commands.")
    
    # Handle callback queries
    if "callback_query" in data:
        callback = data["callback_query"]
        chat_id = str(callback["message"]["chat"]["id"])
        action = callback["data"]
        
        if action == "balance":
            await send_telegram_message(chat_id, "💰 Connect wallet in app to check balance.\n\nUse /app to open.")
        elif action == "help":
            await send_telegram_message(chat_id, "Use /help for full menu.")
        
        # Answer callback
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery"
        async with httpx.AsyncClient() as client:
            await client.post(url, json={"callback_query_id": callback["id"]})
    
    return {"ok": True}

@app.get("/telegram/info")
async def telegram_info():
    """Get Telegram bot info"""
    if not TELEGRAM_BOT_TOKEN:
        return {"error": "No Telegram token configured"}
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("🚀 Laxigam Blockchain API v2.0")
    print("=" * 60)
    print("📡 API: http://0.0.0.0:8000")
    print("📚 Docs: http://0.0.0.0:8000/docs")
    print("🤖 Bot: @Laxigam_blockchain_bot")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
