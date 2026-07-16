import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Lock, 
  HelpCircle, 
  ChevronRight, 
  AlertCircle,
  TrendingDown,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { Merchant } from "../types";

interface TerminalSimulatorProps {
  onPay: (payload: {
    encryptedPayload: string;
    amount: number;
    cardholderName: string;
    cardBrand: string;
    clientCountry: string;
    clientIp: string;
  }) => Promise<void>;
  isProcessing: boolean;
  publicKeyJwk: any;
  merchants: Merchant[];
  activeMerchant: Merchant;
  setActiveMerchant: (merchant: Merchant) => void;
}

// Prefilled test cards for educational scenarios
const TEST_PRESETS = [
  {
    name: "Standard Approved Card",
    number: "4111 2222 3333 4444",
    holder: "John Approved",
    expiry: "12/28",
    cvv: "567",
    brand: "Visa",
    description: "Clears validation checks and settles successfully.",
    badge: "bg-emerald-500/10 text-emerald-400"
  },
  {
    name: "Insufficient Funds Decline",
    number: "5222 3333 4444 5555",
    holder: "Soren Broke",
    expiry: "09/27",
    cvv: "000",
    brand: "Mastercard",
    description: "Issuing Bank rejects transaction for CVV trigger '000'.",
    badge: "bg-amber-500/10 text-amber-400"
  },
  {
    name: "Fraud Guard Intercept",
    number: "3782 8224 6310 005",
    holder: "Test Fraud System",
    expiry: "05/29",
    cvv: "999",
    brand: "American Express",
    description: "Fails Risk Engine due to name and simulated CVV '999'.",
    badge: "bg-rose-500/10 text-rose-400"
  },
  {
    name: "Issuer Suspect Block",
    number: "4222 5555 6666 7777",
    holder: "Arthur Pendragon",
    expiry: "11/27",
    cvv: "111",
    brand: "Visa",
    description: "Issuing bank flags accounts as compromised (CVV 111).",
    badge: "bg-orange-500/10 text-orange-400"
  },
  {
    name: "Expired Card Decline",
    number: "6011 4444 8888 2222",
    holder: "Old Cronus",
    expiry: "01/24",
    cvv: "222",
    brand: "Discover",
    description: "Card rejected for expired status (CVV 222).",
    badge: "bg-slate-500/10 text-slate-400"
  }
];

export default function TerminalSimulator({ 
  onPay, 
  isProcessing, 
  publicKeyJwk, 
  merchants, 
  activeMerchant, 
  setActiveMerchant 
}: TerminalSimulatorProps) {
  
  // State variables for checkout form
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardholderName, setCardholderName] = useState("John Approved");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("567");
  const [amount, setAmount] = useState("45.00");
  const [cardBrand, setCardBrand] = useState("Visa");
  const [clientCountry, setClientCountry] = useState("US");
  const [clientIp, setClientIp] = useState("172.56.21.109");

  // State for live client-side encrypted text visualization
  const [encryptedValuePreview, setEncryptedValuePreview] = useState("");
  const [errorText, setErrorText] = useState("");

  // Determine card brand from number prefix
  useEffect(() => {
    const cleanNumber = cardNumber.replace(/\s+/g, "");
    if (cleanNumber.startsWith("4")) {
      setCardBrand("Visa");
    } else if (cleanNumber.startsWith("5") || cleanNumber.startsWith("2")) {
      setCardBrand("Mastercard");
    } else if (cleanNumber.startsWith("3")) {
      setCardBrand("American Express");
    } else if (cleanNumber.startsWith("6")) {
      setCardBrand("Discover");
    } else {
      setCardBrand("Credit Card");
    }
  }, [cardNumber]);

  // Compute live client-side RSA encryption preview for learning purposes
  useEffect(() => {
    async function computePreview() {
      if (!publicKeyJwk || !cardNumber || !cvv) {
        setEncryptedValuePreview("");
        return;
      }
      try {
        const key = await window.crypto.subtle.importKey(
          "jwk",
          publicKeyJwk,
          {
            name: "RSA-OAEP",
            hash: "SHA-256",
          },
          true,
          ["encrypt"]
        );
        const payload = JSON.stringify({ number: cardNumber, cvv, expiry });
        const encoder = new TextEncoder();
        const encryptedBuffer = await window.crypto.subtle.encrypt(
          { name: "RSA-OAEP" },
          key,
          encoder.encode(payload)
        );
        const base64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
        setEncryptedValuePreview(base64);
      } catch (err) {
        setEncryptedValuePreview("Cryptographic handshake error: check key compatibility");
      }
    }

    const timer = setTimeout(() => {
      computePreview();
    }, 400); // Debounce typing

    return () => clearTimeout(timer);
  }, [cardNumber, cvv, expiry, publicKeyJwk]);

  // Formatter utilities
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handlePresetSelect = (preset: typeof TEST_PRESETS[0]) => {
    setCardNumber(preset.number);
    setCardholderName(preset.holder);
    setExpiry(preset.expiry);
    setCvv(preset.cvv);
    setCardBrand(preset.brand);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!amount || Number(amount) <= 0) {
      setErrorText("Please specify a valid transaction amount.");
      return;
    }

    const cleanNum = cardNumber.replace(/\s+/g, "");
    if (cleanNum.length < 13 || cleanNum.length > 19) {
      setErrorText("Card number is invalid.");
      return;
    }

    if (!expiry || !expiry.includes("/")) {
      setErrorText("Expiry must be in MM/YY format.");
      return;
    }

    if (cvv.length < 3 || cvv.length > 4) {
      setErrorText("CVV must be 3 or 4 digits.");
      return;
    }

    try {
      // 1. Perform Secure Encryption via client keys
      const key = await window.crypto.subtle.importKey(
        "jwk",
        publicKeyJwk,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["encrypt"]
      );

      const secretPayload = JSON.stringify({ number: cardNumber, cvv, expiry });
      const encoder = new TextEncoder();
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        key,
        encoder.encode(secretPayload)
      );

      const base64Encrypted = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));

      // 2. Dispatch secure payment to full-stack gateway
      await onPay({
        encryptedPayload: base64Encrypted,
        amount: parseFloat(amount),
        cardholderName,
        cardBrand,
        clientCountry,
        clientIp
      });

    } catch (err: any) {
      setErrorText(`Encryption failure: ${err.message || err}`);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full justify-between text-slate-900" id="sandbox-payment-terminal">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-sans font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="text-blue-600 w-5 h-5" />
            Sandbox Payment Terminal
          </h2>
          <span className="text-[10px] font-sans px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            2D Checkout Mode
          </span>
        </div>

        {/* Merchant Selector */}
        <div className="mb-5">
          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-bold">
            Gateway Merchant Profile
          </label>
          <select 
            value={activeMerchant.id}
            onChange={(e) => {
              const matched = merchants.find(m => m.id === e.target.value);
              if (matched) setActiveMerchant(matched);
            }}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name} (Cred: ...{merchant.publishableKey.slice(-6)})
              </option>
            ))}
          </select>
        </div>

        {/* Visual Simulated Credit Card */}
        <div className="relative h-44 w-full rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-slate-950 p-5 shadow-lg flex flex-col justify-between overflow-hidden mb-6 text-white">
          {/* Decorative Security Chip */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-start justify-between z-10">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded bg-amber-450/20 border border-amber-400/30 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-0.5 w-3 h-3">
                  <div className="border border-amber-400/50 rounded-sm"></div>
                  <div className="border border-amber-400/50 rounded-sm"></div>
                  <div className="border border-amber-400/50 rounded-sm"></div>
                  <div className="border border-amber-400/50 rounded-sm"></div>
                </div>
              </div>
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest ml-1">Secure chip</span>
            </div>
            
            {/* Live brand badge */}
            <div className="font-sans font-bold italic text-slate-200 text-sm tracking-wider uppercase">
              {cardBrand}
            </div>
          </div>

          <div className="z-10 mt-2">
            {/* Number Display */}
            <div className="font-mono text-base tracking-widest text-slate-100 font-medium">
              {cardNumber || "•••• •••• •••• ••••"}
            </div>
          </div>

          <div className="flex justify-between items-end z-10 mt-3">
            <div>
              <div className="text-[8px] font-mono text-slate-400 uppercase">Cardholder</div>
              <div className="font-sans text-xs text-slate-200 capitalize truncate max-w-[150px]">
                {cardholderName || "Guest Customer"}
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-[8px] font-mono text-slate-400 uppercase">Expires</div>
                <div className="font-mono text-xs text-slate-200">{expiry || "MM/YY"}</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-slate-400 uppercase">CVV</div>
                <div className="font-mono text-xs text-slate-200">
                  {cvv ? "•••" : "•••"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Scenarios Quick Prefill */}
        <div className="mb-5">
          <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Educational Test Presets
          </span>
          <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
            {TEST_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="mr-2">
                  <div className="font-semibold text-slate-800 font-sans flex items-center gap-2">
                    {preset.name}
                    <span className="text-[8px] px-1.5 py-0.2 rounded font-mono bg-slate-200/85 text-slate-700">
                      CVV {preset.cvv}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans leading-tight mt-0.5">
                    {preset.description}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Input Checkout Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {errorText && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorText}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                Transaction Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                Country ID
              </label>
              <select
                value={clientCountry}
                onChange={(e) => setClientCountry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="US">US - USA</option>
                <option value="GB">GB - UK</option>
                <option value="RU">RU - Russia</option>
                <option value="NG">NG - Nigeria</option>
                <option value="JP">JP - Japan</option>
                <option value="DE">DE - Germany</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
              Card Number
            </label>
            <input
              type="text"
              maxLength={19}
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4111 2222 3333 4444"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                Expiry (MM/YY)
              </label>
              <input
                type="text"
                maxLength={5}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="12/28"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                Security Code (CVV)
              </label>
              <input
                type="password"
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                Mock IP Address
              </label>
              <input
                type="text"
                value={clientIp}
                onChange={(e) => setClientIp(e.target.value)}
                placeholder="127.0.0.1"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-sans font-semibold text-xs py-2.5 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer"
          >
            {isProcessing ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Authenticating payment network...
              </span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                Encrypt & Charge ${parseFloat(amount || "0").toFixed(2)}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Live Client Cryptography Visualizer Pane */}
      <div className="mt-5 bg-slate-900 border border-slate-800 rounded-lg p-3 text-white">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
            <Lock className="w-3 h-3 text-blue-400" />
            Client-Side Ciphertext Package (RSA-OAEP-256)
          </span>
          <span className="text-[8px] font-mono text-slate-500">Secure Pre-flight</span>
        </div>
        <div className="bg-slate-950 border border-slate-900 p-2 rounded max-h-[85px] overflow-y-auto overflow-x-hidden font-mono text-[9px] text-blue-300 break-all leading-normal select-all">
          {encryptedValuePreview ? (
            encryptedValuePreview
          ) : (
            <span className="text-slate-600 italic">Card details required to generate cryptographic frame...</span>
          )}
        </div>
        <p className="text-[8px] text-slate-400 leading-normal mt-1.5 font-sans">
          This secure block gets posted over TLS. Decryption happens strictly in the secure payment hardware vault (the API server), bypassing standard merchant storage visibility.
        </p>
      </div>
    </div>
  );
}
