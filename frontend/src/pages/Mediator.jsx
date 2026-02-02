import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Styles
const styles = {
  container: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  card: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: '24px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
  },
  tabInactive: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '12px 16px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
    outline: 'none',
  },
  currencySelect: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginRight: '8px',
  },
  paymentMethods: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '24px',
  },
  paymentMethod: {
    padding: '12px',
    borderRadius: '12px',
    border: '2px solid transparent',
    background: 'rgba(255, 255, 255, 0.05)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  paymentMethodSelected: {
    borderColor: '#667eea',
    background: 'rgba(102, 126, 234, 0.2)',
  },
  paymentIcon: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  paymentLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quoteBox: {
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
  },
  quoteRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  quoteLabel: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  quoteValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
  },
  quoteHighlight: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#4ade80',
  },
  button: {
    width: '100%',
    padding: '16px 24px',
    borderRadius: '14px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  statusBox: {
    background: 'rgba(74, 222, 128, 0.1)',
    border: '1px solid rgba(74, 222, 128, 0.3)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusIcon: {
    fontSize: '24px',
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4ade80',
    marginBottom: '4px',
  },
  statusDesc: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
};

// Payment method icons
const PAYMENT_METHODS = {
  deposit: [
    { id: 'UPI', icon: '🇮🇳', label: 'UPI', currency: 'INR' },
    { id: 'PIX', icon: '🇧🇷', label: 'PIX', currency: 'BRL' },
    { id: 'QIWI', icon: '🇷🇺', label: 'QIWI', currency: 'RUB' },
    { id: 'ALIPAY', icon: '🇨🇳', label: 'Alipay', currency: 'CNY' },
    { id: 'STARS', icon: '⭐', label: 'Stars', currency: 'USD' },
    { id: 'TON', icon: '💎', label: 'TON', currency: 'USD' },
  ],
  withdraw: [
    { id: 'UPI', icon: '🇮🇳', label: 'UPI', currency: 'INR' },
    { id: 'PIX', icon: '🇧🇷', label: 'PIX', currency: 'BRL' },
    { id: 'QIWI', icon: '🇷🇺', label: 'QIWI', currency: 'RUB' },
    { id: 'ALIPAY', icon: '🇨🇳', label: 'Alipay', currency: 'CNY' },
  ],
};

// Exchange rates (mock - would come from API)
const EXCHANGE_RATES = {
  INR: 83.0,
  BRL: 5.0,
  RUB: 92.0,
  CNY: 7.2,
  USD: 1.0,
};

const LXG_USD_RATE = 0.05;

export default function MediatorApp() {
  const [mode, setMode] = useState('deposit'); // 'deposit' or 'withdraw'
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [destination, setDestination] = useState(''); // For withdrawals
  const [quote, setQuote] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (err) {
        console.error('Failed to connect wallet:', err);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  // Calculate quote when inputs change
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    const amountNum = parseFloat(amount);
    const rate = EXCHANGE_RATES[currency] || 1;

    if (mode === 'deposit') {
      // Fiat -> LXG
      const usdAmount = amountNum / rate;
      const lxgAmount = usdAmount / LXG_USD_RATE;
      const fee = lxgAmount * 0.005; // 0.5%
      const netAmount = lxgAmount - fee;

      setQuote({
        input: amountNum,
        inputCurrency: currency,
        output: netAmount.toFixed(2),
        outputCurrency: 'LXG',
        fee: fee.toFixed(4),
        feeCurrency: 'LXG',
        rate: `1 ${currency} = ${(1 / rate / LXG_USD_RATE).toFixed(4)} LXG`,
      });
    } else {
      // LXG -> Fiat
      const usdAmount = amountNum * LXG_USD_RATE;
      const fiatAmount = usdAmount * rate;
      const fee = fiatAmount * 0.01; // 1%
      const netAmount = fiatAmount - fee;

      setQuote({
        input: amountNum,
        inputCurrency: 'LXG',
        output: netAmount.toFixed(2),
        outputCurrency: currency,
        fee: fee.toFixed(2),
        feeCurrency: currency,
        rate: `1 LXG = ${(LXG_USD_RATE * rate).toFixed(2)} ${currency}`,
      });
    }
  }, [amount, currency, mode]);

  // Update currency when payment method changes
  useEffect(() => {
    const methods = PAYMENT_METHODS[mode];
    const method = methods.find(m => m.id === paymentMethod);
    if (method) {
      setCurrency(method.currency);
    }
  }, [paymentMethod, mode]);

  // Handle submit
  const handleSubmit = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    if (!quote) return;

    setLoading(true);
    setStatus({ type: 'processing', message: 'Processing your request...' });

    try {
      const endpoint = mode === 'deposit' 
        ? '/api/mediator/deposit/initiate'
        : '/api/mediator/withdraw/initiate';

      const body = mode === 'deposit' ? {
        wallet_address: walletAddress,
        payment_method: paymentMethod,
        amount_fiat: parseFloat(amount),
        currency: currency,
      } : {
        wallet_address: walletAddress,
        amount_lxg: parseFloat(amount),
        payment_method: paymentMethod,
        destination: destination,
        currency: currency,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setStatus({
          type: 'success',
          message: mode === 'deposit' 
            ? 'Payment initiated! Complete the payment using the instructions below.'
            : 'Withdrawal initiated! Sign the transaction in your wallet.',
          data: data,
        });
      } else {
        throw new Error(data.error || 'Request failed');
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Card */}
      <div style={styles.card}>
        <div style={styles.title}>
          <span>💱</span>
          <span>Laxigam Mediator</span>
        </div>
        <div style={styles.subtitle}>
          Convert between LXG and your local currency instantly
        </div>

        {/* Mode Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'deposit' ? styles.tabActive : styles.tabInactive) }}
            onClick={() => { setMode('deposit'); setPaymentMethod('UPI'); setAmount(''); }}
          >
            💰 Buy LXG
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'withdraw' ? styles.tabActive : styles.tabInactive) }}
            onClick={() => { setMode('withdraw'); setPaymentMethod('UPI'); setAmount(''); }}
          >
            💵 Sell LXG
          </button>
        </div>

        {/* Payment Methods */}
        <div style={styles.label}>Payment Method</div>
        <div style={styles.paymentMethods}>
          {PAYMENT_METHODS[mode].map(method => (
            <div
              key={method.id}
              style={{
                ...styles.paymentMethod,
                ...(paymentMethod === method.id ? styles.paymentMethodSelected : {}),
              }}
              onClick={() => setPaymentMethod(method.id)}
            >
              <div style={styles.paymentIcon}>{method.icon}</div>
              <div style={styles.paymentLabel}>{method.label}</div>
            </div>
          ))}
        </div>

        {/* Amount Input */}
        <div style={styles.inputGroup}>
          <div style={styles.label}>
            {mode === 'deposit' ? 'You Pay' : 'You Sell'}
          </div>
          <div style={styles.inputWrapper}>
            <input
              type="number"
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              style={styles.currencySelect}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {mode === 'deposit' ? (
                <>
                  <option value="INR">INR</option>
                  <option value="BRL">BRL</option>
                  <option value="RUB">RUB</option>
                  <option value="CNY">CNY</option>
                  <option value="USD">USD</option>
                </>
              ) : (
                <option value="LXG">LXG</option>
              )}
            </select>
          </div>
        </div>

        {/* Destination (for withdrawals) */}
        {mode === 'withdraw' && (
          <div style={styles.inputGroup}>
            <div style={styles.label}>
              {paymentMethod === 'UPI' ? 'UPI ID' :
               paymentMethod === 'PIX' ? 'PIX Key' :
               paymentMethod === 'QIWI' ? 'Phone Number' :
               'Alipay Account'}
            </div>
            <div style={styles.inputWrapper}>
              <input
                type="text"
                style={styles.input}
                placeholder={
                  paymentMethod === 'UPI' ? 'yourname@upi' :
                  paymentMethod === 'PIX' ? 'CPF or email' :
                  paymentMethod === 'QIWI' ? '+79001234567' :
                  'alipay@account.com'
                }
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Quote Box */}
        {quote && (
          <div style={styles.quoteBox}>
            <div style={styles.quoteRow}>
              <span style={styles.quoteLabel}>You {mode === 'deposit' ? 'pay' : 'sell'}</span>
              <span style={styles.quoteValue}>
                {quote.input} {quote.inputCurrency}
              </span>
            </div>
            <div style={styles.quoteRow}>
              <span style={styles.quoteLabel}>Fee</span>
              <span style={styles.quoteValue}>
                {quote.fee} {quote.feeCurrency}
              </span>
            </div>
            <div style={styles.quoteRow}>
              <span style={styles.quoteLabel}>You {mode === 'deposit' ? 'receive' : 'get'}</span>
              <span style={styles.quoteHighlight}>
                {quote.output} {quote.outputCurrency}
              </span>
            </div>
            <div style={{ ...styles.quoteRow, marginBottom: 0, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={styles.quoteLabel}>Rate</span>
              <span style={styles.quoteValue}>{quote.rate}</span>
            </div>
          </div>
        )}

        {/* Status */}
        {status && (
          <div style={{
            ...styles.statusBox,
            background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)',
            borderColor: status.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(74, 222, 128, 0.3)',
          }}>
            <div style={styles.statusIcon}>
              {status.type === 'success' ? '✅' : status.type === 'error' ? '❌' : '⏳'}
            </div>
            <div style={styles.statusText}>
              <div style={{ ...styles.statusTitle, color: status.type === 'error' ? '#ef4444' : '#4ade80' }}>
                {status.type === 'success' ? 'Success!' : status.type === 'error' ? 'Error' : 'Processing...'}
              </div>
              <div style={styles.statusDesc}>{status.message}</div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          style={{
            ...styles.button,
            ...(loading || !amount ? styles.buttonDisabled : {}),
          }}
          onClick={handleSubmit}
          disabled={loading || !amount}
        >
          {!walletAddress 
            ? '🔗 Connect Wallet'
            : loading 
              ? '⏳ Processing...'
              : mode === 'deposit' 
                ? `💰 Buy ${quote?.output || ''} LXG`
                : `💵 Sell ${amount || ''} LXG`
          }
        </button>
      </div>

      {/* Info Card */}
      <div style={{ ...styles.card, padding: '16px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6 }}>
          <strong>🔐 Secure & Fast</strong><br />
          • AI-validated transactions<br />
          • Instant settlements via BRICS payment rails<br />
          • Low fees: 0.5% deposit, 1% withdrawal
        </div>
      </div>
    </div>
  );
}
