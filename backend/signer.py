import os
import time
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

# Use a consistent private key for the Oracle
# IN PRODUCTION: This should be loaded securely from .env and NEVER committed
ORACLE_PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")

def sign_transaction_approval(sender: str, amount: int, nonce: int):
    """
    Signs a message approving a transaction.
    Message format: keccak256(sender, amount, nonce)
    Returns: (v, r, s) signature components
    """
    message_hash = Web3.solidity_keccak(
        ['address', 'uint256', 'uint256'],
        [Web3.to_checksum_address(sender), amount, nonce]
    )
    
    # Sign the hash (Ethereum Signed Message)
    message = encode_defunct(hexstr=message_hash.hex())
    signed_message = Account.sign_message(message, ORACLE_PRIVATE_KEY)
    
    return {
        "v": signed_message.v,
        "r": signed_message.r.to_bytes(32, 'big').hex(),
        "s": signed_message.s.to_bytes(32, 'big').hex(),
        "signature": signed_message.signature.hex(),
        "message_hash": message_hash.hex()
    }

def get_oracle_address():
    account = Account.from_key(ORACLE_PRIVATE_KEY)
    return account.address
