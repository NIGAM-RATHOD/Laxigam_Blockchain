"""
Oracle signer for Laxigam contracts.

The oracle key signs approvals that the on-chain contracts verify with
ECDSA.recover(). Load ORACLE_PRIVATE_KEY from the environment; the fallback
below is Hardhat's public test account #0 and must never hold real funds.
"""

import os
import warnings
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

HARDHAT_TEST_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ORACLE_PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY", HARDHAT_TEST_KEY)

if ORACLE_PRIVATE_KEY == HARDHAT_TEST_KEY:
    warnings.warn(
        "ORACLE_PRIVATE_KEY is not set - using the public Hardhat test key. "
        "Never use this outside local development.",
        stacklevel=2,
    )


def _sign_hash(message_hash: bytes) -> dict:
    """Sign a keccak hash as an Ethereum Signed Message (matches toEthSignedMessageHash)."""
    message = encode_defunct(hexstr=message_hash.hex())
    signed_message = Account.sign_message(message, ORACLE_PRIVATE_KEY)

    return {
        "v": signed_message.v,
        "r": signed_message.r.to_bytes(32, 'big').hex(),
        "s": signed_message.s.to_bytes(32, 'big').hex(),
        "signature": signed_message.signature.hex(),
        "message_hash": message_hash.hex()
    }


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
    return _sign_hash(message_hash)


def sign_mediator_transaction(action: str, **kwargs) -> dict:
    """
    Sign an approval for the MediatorVault contract.

    approve_withdrawal mirrors MediatorVault.requestWithdrawal():
        keccak256(abi.encodePacked(user, amountLXG, destination, currency, amountFiat, nonce))
      kwargs: user, amount_lxg (wei), destination, currency, amount_fiat (minor units), nonce

    fulfill_deposit is an off-chain attestation that the payment gateway confirmed
    payment_id (fulfillDeposit itself is onlyOracle, so no on-chain signature check):
        keccak256(abi.encodePacked("fulfill_deposit", paymentId))
    """
    if action == "approve_withdrawal":
        message_hash = Web3.solidity_keccak(
            ['address', 'uint256', 'string', 'string', 'uint256', 'uint256'],
            [
                Web3.to_checksum_address(kwargs["user"]),
                int(kwargs["amount_lxg"]),
                kwargs["destination"],
                kwargs["currency"],
                int(kwargs["amount_fiat"]),
                int(kwargs["nonce"]),
            ]
        )
    elif action == "fulfill_deposit":
        message_hash = Web3.solidity_keccak(
            ['string', 'string'],
            [action, kwargs["payment_id"]]
        )
    else:
        raise ValueError(f"Unknown mediator action: {action}")

    return {"action": action, **_sign_hash(message_hash)}


def get_oracle_address():
    account = Account.from_key(ORACLE_PRIVATE_KEY)
    return account.address
