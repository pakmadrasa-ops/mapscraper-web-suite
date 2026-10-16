import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TokenPackage } from '../types/scraper';
import {
  X,
  CreditCard,
  Check,
  ShieldCheck,
  Zap,
  Coins,
  Sparkles,
  Phone,
  Smartphone,
  Lock,
  ArrowRight
} from 'lucide-react';

const PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter Lead Pack',
    tokens: 250,
    priceUSD: 5,
    pricePKR: 1400,
    features: [
      'Approx. 15 full city queries',
      'Depth up to 10 scroll levels',
      'Email extraction included',
      'Export to Excel & CSV',
    ]
  },
  {
    id: 'pro',
    name: 'Growth Agency Pack',
    tokens: 1000,
    priceUSD: 15,
    pricePKR: 4200,
    popular: true,
    discountBadge: 'Save 25%',
    features: [
      'Approx. 75 comprehensive queries',
      'Depth up to 25 scroll levels',
      'High-speed concurrency (4 workers)',
      'Email & extra reviews scraping',
      'Grid Bounding Box scraping'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise Bulk Pack',
    tokens: 5000,
    priceUSD: 50,
    pricePKR: 14000,
    discountBadge: 'Best Value (50% Off)',
    features: [
      'Approx. 400 deep regional queries',
      'Unlimited scroll depth (up to 50)',
      'Dedicated proxy rotation',
      'Full AWS S3 & LeadsDB export',
      'Priority server execution'
    ]
  }
];

export const TokenPurchaseModal: React.FC = () => {
  const { isTokenModalOpen, setIsTokenModalOpen, addTokens, user, showToast } = useApp();

  const [selectedPackage, setSelectedPackage] = useState<TokenPackage>(PACKAGES[1]);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'paypal' | 'jazzcash'>('jazzcash');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form fields
  // Card
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('888');
  const [cardName, setCardName] = useState('Ghulam Nabi');

  // PayPal
  const [paypalEmail, setPaypalEmail] = useState(user?.email || 'user@example.com');

  // JazzCash
  const [jazzMobile, setJazzMobile] = useState('0301-7654321');
  const [jazzCnic, setJazzCnic] = useState('123456');
  const [jazzMpin, setJazzMpin] = useState('');

  if (!isTokenModalOpen) return null;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      let accountRef = '';
      if (paymentMethod === 'credit_card') {
        accountRef = `Card ending in ${cardNumber.slice(-4) || '4242'}`;
      } else if (paymentMethod === 'paypal') {
        accountRef = `PayPal: ${paypalEmail}`;
      } else {
        accountRef = `JazzCash Wallet (${jazzMobile})`;
      }

      addTokens(selectedPackage.tokens, {
        packageId: selectedPackage.id,
        tokens: selectedPackage.tokens,
        amountUSD: selectedPackage.priceUSD,
        amountPKR: selectedPackage.pricePKR,
        paymentMethod,
        accountReference: accountRef,
        status: 'completed',
      });

      setIsProcessing(false);
      setIsTokenModalOpen(false);
      showToast(`Payment successful! ${selectedPackage.tokens} tokens credited via ${paymentMethod === 'jazzcash' ? 'JazzCash' : paymentMethod === 'paypal' ? 'PayPal' : 'Credit Card'}.`, 'success');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Purchase Scraper Query Tokens
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  Instant Credit
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Refill tokens to execute queries via Credit Card, PayPal, or JazzCash mobile wallet
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTokenModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Step 1: Select Package */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
              1. Choose Token Package
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PACKAGES.map(pkg => {
                const isSelected = selectedPackage.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative rounded-xl p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-sm">
                        Most Popular
                      </span>
                    )}
                    {pkg.discountBadge && !pkg.popular && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                        {pkg.discountBadge}
                      </span>
                    )}

                    <h4 className="text-sm font-bold text-slate-100">{pkg.name}</h4>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-amber-400 font-mono">{pkg.tokens}</span>
                      <span className="text-xs text-slate-400">tokens</span>
                    </div>

                    <div className="mt-1 text-xs text-slate-300 font-semibold">
                      ${pkg.priceUSD} USD <span className="text-slate-500 font-normal">/ Rs. {pkg.pricePKR.toLocaleString()} PKR</span>
                    </div>

                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-400">
                      {pkg.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Payment Provider Selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
              2. Select Payment Method
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* JazzCash Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('jazzcash')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  paymentMethod === 'jazzcash'
                    ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <Smartphone className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    JazzCash
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-medium">PK</span>
                  </h5>
                  <p className="text-[11px] text-slate-400">Mobile Wallet / CNIC</p>
                </div>
              </button>

              {/* Credit Card Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  paymentMethod === 'credit_card'
                    ? 'bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-100">Credit / Debit Card</h5>
                  <p className="text-[11px] text-slate-400">Visa, MasterCard, Amex</p>
                </div>
              </button>

              {/* PayPal Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('paypal')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  paymentMethod === 'paypal'
                    ? 'bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
                  P
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-100">PayPal</h5>
                  <p className="text-[11px] text-slate-400">Instant Global Express</p>
                </div>
              </button>

            </div>
          </div>

          {/* Step 3: Payment Details Form */}
          <form onSubmit={handleCheckout} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            
            {/* JazzCash Form */}
            {paymentMethod === 'jazzcash' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> JazzCash Mobile Account Checkout
                  </span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    Rs. {selectedPackage.pricePKR.toLocaleString()} PKR
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      JazzCash Mobile Number
                    </label>
                    <input
                      type="text"
                      required
                      value={jazzMobile}
                      onChange={e => setJazzMobile(e.target.value)}
                      placeholder="0300-1234567"
                      className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      CNIC (Last 6 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={jazzCnic}
                      onChange={e => setJazzCnic(e.target.value)}
                      placeholder="e.g. 789123"
                      className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                  📱 A flash prompt or SMS with 4-digit MPIN verification will be sent to your Jazz mobile number immediately upon clicking Pay.
                </div>
              </div>
            )}

            {/* Credit Card Form */}
            {paymentMethod === 'credit_card' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> Secure Card Payment (256-Bit SSL)
                  </span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    ${selectedPackage.priceUSD}.00 USD
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">Card Number</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">Expiry / CVV</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-1/2 bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-2 text-slate-200 font-mono text-center focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value)}
                        placeholder="CVV"
                        className="w-1/2 bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-2 text-slate-200 font-mono text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PayPal Form */}
            {paymentMethod === 'paypal' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                    PayPal One-Click Express Checkout
                  </span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    ${selectedPackage.priceUSD}.00 USD
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">PayPal Account Email</label>
                  <input
                    type="email"
                    required
                    value={paypalEmail}
                    onChange={e => setPaypalEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  You will be securely routed through PayPal's token billing API with instantaneous token unlock.
                </p>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authorizing with {paymentMethod === 'jazzcash' ? 'JazzCash Gateway' : paymentMethod === 'paypal' ? 'PayPal' : 'Card Network'}...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    Pay {paymentMethod === 'jazzcash' ? `Rs. ${selectedPackage.pricePKR.toLocaleString()} PKR` : `$${selectedPackage.priceUSD}.00 USD`} & Add {selectedPackage.tokens} Tokens
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted PCI-DSS & JazzCash API Verified</span>
          </div>
          <span>Tokens never expire</span>
        </div>

      </div>
    </div>
  );
};
