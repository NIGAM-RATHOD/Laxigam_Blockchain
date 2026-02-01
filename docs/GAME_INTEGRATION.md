# Game Integration Guide

This guide explains how to integrate Laxigam Blockchain into your game, enabling players to use LXG tokens for in-game purchases, rewards, and trading.

---

## Overview

### What is Laxigam?

Laxigam is a blockchain ecosystem that bridges real-world finance with gaming economies. Players can:

- Deposit real money (via BRICS+ payments) to get LXG tokens
- Use LXG tokens to buy in-game items and currency
- Earn LXG tokens through gameplay
- Withdraw LXG tokens back to real money

### Integration Benefits

- **Global Payments**: Accept payments from India, Brazil, Russia, China, and more
- **Lower Fees**: ~2% vs 30% on traditional app stores
- **Player Retention**: Tokens can be used across multiple games
- **NFT Support**: Trade in-game items as NFTs

---

## Quick Start

### 1. Register Your Game

Contact us to register your game:

```
Email: partners@laxigam.com
Telegram: @LaxigamPartners
```

You'll receive:
- Game API Key
- Game ID
- Webhook URL
- Conversion rate settings

### 2. Install SDK

#### Unity

```bash
# Via Package Manager
Window > Package Manager > Add package from git URL
https://github.com/Laxigam/unity-sdk.git
```

#### Unreal Engine

```bash
# Via Marketplace or GitHub
https://github.com/Laxigam/unreal-sdk
```

#### JavaScript/TypeScript (Web Games)

```bash
npm install @laxigam/sdk
```

### 3. Initialize SDK

```javascript
import { LaxigamSDK } from '@laxigam/sdk';

const laxigam = new LaxigamSDK({
  apiKey: 'your_game_api_key',
  gameId: 'your_game_id',
  environment: 'production' // or 'sandbox'
});

// Initialize on game start
await laxigam.initialize();
```

---

## Core Features

### Player Authentication

```javascript
// Connect player's wallet
const connectWallet = async () => {
  const result = await laxigam.connectWallet();
  
  if (result.success) {
    console.log('Connected:', result.address);
    console.log('Balance:', result.balance);
  }
};

// Or use existing wallet address
const playerAddress = '0x...';
laxigam.setPlayerAddress(playerAddress);
```

### Check Balance

```javascript
const getPlayerBalance = async () => {
  const balance = await laxigam.getBalance(playerAddress);
  
  return {
    realWallet: balance.real_wallet,      // LXG in real wallet
    gameWallet: balance.game_wallets['YourGame'], // LXG in game
    total: balance.total
  };
};
```

### Deposit to Game

When a player wants to add funds to your game:

```javascript
const depositToGame = async (amount) => {
  const result = await laxigam.depositToGame({
    playerAddress: playerAddress,
    amount: amount, // LXG amount
    callbackUrl: 'https://yourgame.com/callback'
  });
  
  if (result.success) {
    // Show confirmation to player
    showNotification(`Deposited ${amount} LXG to game!`);
    
    // Update in-game currency
    addInGameCurrency(amount * CONVERSION_RATE);
  }
};
```

### In-Game Purchases

```javascript
const purchaseItem = async (itemId, priceInLXG) => {
  // Check if player has enough balance in game
  const balance = await laxigam.getGameBalance(playerAddress);
  
  if (balance < priceInLXG) {
    showError('Insufficient balance. Please deposit more LXG.');
    return;
  }
  
  // Process purchase
  const result = await laxigam.spendInGame({
    playerAddress: playerAddress,
    amount: priceInLXG,
    itemId: itemId,
    metadata: {
      itemName: 'Legendary Sword',
      itemType: 'weapon'
    }
  });
  
  if (result.success) {
    // Give item to player
    giveItemToPlayer(itemId);
    showSuccess('Purchase successful!');
  }
};
```

### Reward Players

```javascript
const rewardPlayer = async (playerAddress, amount, reason) => {
  const result = await laxigam.rewardPlayer({
    playerAddress: playerAddress,
    amount: amount,
    reason: reason, // e.g., 'quest_completed', 'tournament_winner'
    metadata: {
      questId: 'quest_123',
      xpGained: 1000
    }
  });
  
  if (result.success) {
    showNotification(`Earned ${amount} LXG!`);
  }
};
```

### Withdraw from Game

```javascript
const withdrawFromGame = async (amount) => {
  const result = await laxigam.withdrawFromGame({
    playerAddress: playerAddress,
    amount: amount,
    callbackUrl: 'https://yourgame.com/withdraw-callback'
  });
  
  if (result.success) {
    // Deduct from in-game currency
    deductInGameCurrency(amount * CONVERSION_RATE);
    
    showNotification(`Withdrawal initiated. LXG will be sent to your wallet.`);
  }
};
```

---

## Webhooks

### Setup

Configure your webhook URL in the Laxigam Dashboard:

```
https://yourgame.com/webhooks/laxigam
```

### Event Types

#### deposit.completed

```json
{
  "event": "deposit.completed",
  "data": {
    "playerAddress": "0x...",
    "amount": 100,
    "gameId": "your_game_id",
    "transactionId": "txn_xxx",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### purchase.completed

```json
{
  "event": "purchase.completed",
  "data": {
    "playerAddress": "0x...",
    "amount": 50,
    "itemId": "item_123",
    "transactionId": "txn_xxx",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### reward.issued

```json
{
  "event": "reward.issued",
  "data": {
    "playerAddress": "0x...",
    "amount": 25,
    "reason": "quest_completed",
    "transactionId": "txn_xxx",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### withdrawal.initiated

```json
{
  "event": "withdrawal.initiated",
  "data": {
    "playerAddress": "0x...",
    "amount": 200,
    "withdrawalId": "wdr_xxx",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### Webhook Verification

```javascript
const crypto = require('crypto');

const verifyWebhook = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// In your webhook handler
app.post('/webhooks/laxigam', (req, res) => {
  const signature = req.headers['x-laxigam-signature'];
  
  if (!verifyWebhook(req.body, signature, process.env.LAXIGAM_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  handleWebhookEvent(req.body);
  res.status(200).send('OK');
});
```

---

## Conversion Rates

### Setting Your Rate

Define how much in-game currency 1 LXG equals:

```javascript
// Example: 1 LXG = $100 in-game
const LXG_TO_GAME_RATE = 100;

const convertLXGToGameCurrency = (lxgAmount) => {
  return lxgAmount * LXG_TO_GAME_RATE;
};

const convertGameCurrencyToLXG = (gameCurrency) => {
  return gameCurrency / LXG_TO_GAME_RATE;
};
```

### Dynamic Rates

You can adjust rates based on:
- Game economy health
- Special events
- Player tier

```javascript
const getDynamicRate = (playerTier) => {
  const baseRate = 100;
  
  switch (playerTier) {
    case 'bronze': return baseRate;
    case 'silver': return baseRate * 1.1;
    case 'gold': return baseRate * 1.25;
    case 'platinum': return baseRate * 1.5;
    default: return baseRate;
  }
};
```

---

## NFT Integration

### Mint In-Game Items as NFTs

```javascript
const mintItemAsNFT = async (playerAddress, itemData) => {
  const result = await laxigam.mintNFT({
    playerAddress: playerAddress,
    name: itemData.name,
    description: itemData.description,
    game: 'YourGame',
    metadata: {
      itemType: itemData.type,
      rarity: itemData.rarity,
      stats: itemData.stats
    },
    isUnique: itemData.rarity === 'legendary'
  });
  
  if (result.success) {
    // Store NFT ID in your database
    await savePlayerNFT(playerAddress, result.nftId, itemData);
  }
};
```

### List NFT for Sale

```javascript
const listNFTForSale = async (playerAddress, nftId, price) => {
  const result = await laxigam.listNFT({
    playerAddress: playerAddress,
    nftId: nftId,
    price: price // in LXG
  });
  
  if (result.success) {
    showNotification('Item listed on marketplace!');
  }
};
```

---

## Best Practices

### 1. Error Handling

```javascript
const safeTransaction = async (transactionFn) => {
  try {
    const result = await transactionFn();
    
    if (!result.success) {
      console.error('Transaction failed:', result.error);
      showError(result.error.message);
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('Unexpected error:', error);
    showError('Something went wrong. Please try again.');
    return null;
  }
};
```

### 2. Loading States

```javascript
const purchaseWithLoading = async (itemId, price) => {
  showLoading('Processing purchase...');
  
  try {
    const result = await purchaseItem(itemId, price);
    hideLoading();
    return result;
  } catch (error) {
    hideLoading();
    throw error;
  }
};
```

### 3. Balance Refreshing

```javascript
// Refresh balance after transactions
const refreshBalance = async () => {
  const balance = await laxigam.getBalance(playerAddress);
  updateUI(balance);
};

// Auto-refresh every 30 seconds
setInterval(refreshBalance, 30000);

// Refresh after specific events
laxigam.on('transactionComplete', refreshBalance);
```

### 4. Security

```javascript
// Validate transactions on your server
const validatePurchase = async (playerAddress, itemId, price) => {
  const response = await fetch('/api/validate-purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerAddress,
      itemId,
      price,
      timestamp: Date.now()
    })
  });
  
  return response.json();
};
```

---

## Testing

### Sandbox Mode

```javascript
const laxigam = new LaxigamSDK({
  apiKey: 'your_sandbox_api_key',
  gameId: 'your_game_id',
  environment: 'sandbox'
});

// All transactions use test tokens
```

### Test Scenarios

1. **Successful Deposit**
   - Player deposits 100 LXG
   - Verify in-game currency increases

2. **Insufficient Balance**
   - Try to purchase item with insufficient LXG
   - Verify error message shows

3. **Webhook Handling**
   - Send test webhook
   - Verify game state updates correctly

---

## Examples

### Unity Example

```csharp
using Laxigam;

public class GameEconomy : MonoBehaviour
{
    private LaxigamSDK laxigam;
    
    async void Start()
    {
        laxigam = new LaxigamSDK({
            apiKey = "your_api_key",
            gameId = "your_game_id"
        });
        
        await laxigam.Initialize();
    }
    
    public async void PurchaseItem(string itemId, decimal price)
    {
        var result = await laxigam.PurchaseItem(playerAddress, itemId, price);
        
        if (result.Success)
        {
            GiveItemToPlayer(itemId);
            ShowNotification("Purchase successful!");
        }
    }
}
```

### Unreal Example

```cpp
#include "LaxigamSDK.h"

void AMyGameMode::PurchaseItem(FString ItemId, float Price)
{
    FLaxigamPurchaseRequest Request;
    Request.PlayerAddress = PlayerAddress;
    Request.ItemId = ItemId;
    Request.Price = Price;
    
    LaxigamSDK::Get()->PurchaseItem(Request, FLaxigamPurchaseDelegate::CreateLambda(
        [this](const FLaxigamPurchaseResponse& Response)
        {
            if (Response.Success)
            {
                GiveItemToPlayer(Response.ItemId);
            }
        }
    ));
}
```

---

## Support

Need help with integration?

- **Documentation**: https://docs.laxigam.com
- **Discord**: https://discord.gg/laxigam
- **Email**: dev-support@laxigam.com
- **Telegram**: @LaxigamDev

---

## Changelog

### v2.0.0
- Added NFT marketplace integration
- Improved webhook reliability
- Added batch transaction support

### v1.5.0
- Added TON network support
- Added Telegram Stars payments
- Performance improvements

### v1.0.0
- Initial release
- Core deposit/withdraw/transfer features
- BRICS+ payment support
