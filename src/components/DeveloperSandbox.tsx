import React, { useState, useEffect } from "react";
import { 
  Code2, 
  Terminal, 
  Play, 
  Copy, 
  CheckCircle,
  HelpCircle,
  Braces,
  Settings,
  ArrowRightLeft
} from "lucide-react";
import { Merchant } from "../types";

interface DeveloperSandboxProps {
  activeMerchant: Merchant;
  publicKeyJwk: any;
}

export default function DeveloperSandbox({ activeMerchant, publicKeyJwk }: DeveloperSandboxProps) {
  
  // Sandbox state
  const [amount, setAmount] = useState("129.50");
  const [currency, setCurrency] = useState("USD");
  const [holder, setHolder] = useState("Homer Simpson");
  const [rawCvv, setRawCvv] = useState("123");
  const [rawCardNumber, setRawCardNumber] = useState("4111222233334444");
  const [rawExpiry, setRawExpiry] = useState("08/29");
  
  // Encryption state for dynamic code snippets
  const [encryptedPayloadValue, setEncryptedPayloadValue] = useState("");
  const [activeTab, setActiveTab] = useState<"js" | "curl" | "python">("js");
  const [copiedCode, setCopiedCode] = useState(false);

  // REST Client test state
  const [customRequestJson, setCustomRequestJson] = useState("");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<number | null>(null);
  const [apiRoundtrip, setApiRoundtrip] = useState<number | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Re-generate encrypted payload when card data changes
  useEffect(() => {
    async function encryptData() {
      if (!publicKeyJwk || !rawCardNumber || !rawCvv) return;
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
        const payload = JSON.stringify({ number: rawCardNumber, cvv: rawCvv, expiry: rawExpiry });
        const encoder = new TextEncoder();
        const encryptedBuffer = await window.crypto.subtle.encrypt(
          { name: "RSA-OAEP" },
          key,
          encoder.encode(payload)
        );
        const base64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
        setEncryptedPayloadValue(base64);
      } catch (err) {
        setEncryptedPayloadValue("crypto_generation_error");
      }
    }
    
    encryptData();
  }, [rawCardNumber, rawCvv, rawExpiry, publicKeyJwk]);

  // Sync REST client raw request text box when factors change
  useEffect(() => {
    if (!encryptedPayloadValue) return;
    const body = {
      encryptedPayload: encryptedPayloadValue,
      amount: parseFloat(amount) || 0,
      currency,
      cardholderName: holder,
      cardBrand: rawCardNumber.startsWith("4") ? "Visa" : "Mastercard",
      clientIp: "192.168.1.1",
      clientCountry: "US"
    };
    setCustomRequestJson(JSON.stringify(body, null, 2));
  }, [encryptedPayloadValue, amount, currency, holder, rawCardNumber]);

  // Handle Send API Request
  const handleSendCustomRequest = async () => {
    setIsSendingRequest(true);
    setApiResponse(null);
    setApiStatus(null);
    setApiRoundtrip(null);
    
    const startTime = Date.now();
    try {
      let parsedBody;
      try {
        parsedBody = JSON.parse(customRequestJson);
      } catch (err) {
        throw new Error("Invalid JSON formatted body. Correct your brackets.");
      }

      const res = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": activeMerchant.publishableKey,
        },
        body: JSON.stringify(parsedBody),
      });

      const data = await res.json();
      setApiRoundtrip(Date.now() - startTime);
      setApiStatus(res.status);
      setApiResponse(data);
    } catch (err: any) {
      setApiRoundtrip(Date.now() - startTime);
      setApiStatus(400);
      setApiResponse({ error: err.message || "Network request failed" });
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Generate Code strings dynamically
  const codeSnippets = {
    js: `// Client-Side Integration Code using standard Web Crypto API (RSA-OAEP-256)
async function processGatewayPayment() {
  const amount = ${amount};
  const cardholderName = "${holder}";
  
  // 1. Fetch Gateway's RSA Public Key JWK
  const keyResponse = await fetch("/api/keys/public");
  const { jwk } = await keyResponse.json();

  // 2. Import Public Key using standard SubtleCrypto
  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );

  // 3. Package and Encrypt Card Credentials Client-Side
  const encoder = new TextEncoder();
  const cardPayload = JSON.stringify({
    number: "${rawCardNumber}",
    cvv: "${rawCvv}",
    expiry: "${rawExpiry}"
  });

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encoder.encode(cardPayload)
  );

  // Base64 encode the ciphertext payload
  const encryptedPayload = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));

  // 4. Post securely to 2D Gateway Decryption endpoint
  const chargeResponse = await fetch("/api/pay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "${activeMerchant.publishableKey}"
    },
    body: JSON.stringify({
      encryptedPayload,
      amount,
      currency: "${currency}",
      cardholderName,
      cardBrand: "Visa",
      clientCountry: "US",
      clientIp: "8.8.8.8"
    })
  });

  const settlement = await chargeResponse.json();
  console.log("Response:", settlement);
}`,
    curl: `curl -X POST /api/pay \\
  -H "Content-Type: application/json" \\
  -H "Authorization: ${activeMerchant.publishableKey}" \\
  -d '{
    "encryptedPayload": "${encryptedPayloadValue.slice(0, 40)}...",
    "amount": ${amount},
    "currency": "${currency}",
    "cardholderName": "${holder}",
    "cardBrand": "Visa",
    "clientIp": "127.0.0.1",
    "clientCountry": "US"
  }'`,
    python: `# Python Implementation using Cryptography package for client-side RSA
import requests
import json
import base64
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers

# 1. Fetch JWK public key from Server
jwk = requests.get("/api/keys/public").json()["jwk"]

# 2. Reconstruct Public Key object and encrypt
# (Standard Python crypt/JWK import sequence)
card_data = json.dumps({
    "number": "${rawCardNumber}",
    "cvv": "${rawCvv}",
    "expiry": "${rawExpiry}"
}).encode('utf-8')

# Post payload securely
response = requests.post(
    "/api/pay",
    headers={
        "Content-Type": "application/json",
        "Authorization": "${activeMerchant.publishableKey}"
    },
    json={
        "encryptedPayload": "BASE64_CIPHERTEXT",
        "amount": ${amount},
        "currency": "${currency}",
        "cardholderName": "${holder}"
    }
)
print(response.json())`
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" id="developer-sandbox-section">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-sans font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Code2 className="text-blue-600 w-5 h-5" />
            Developer Integration Playground
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Test custom client SDK encryption code or write raw-rest JSON calls directly into the payment loop.
          </p>
        </div>

        <span className="text-[10px] font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 border border-slate-200">
          REST API v1.0
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Side: API Parameters Builder */}
        <div className="xl:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
          <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-bold">
            <Settings className="w-3.5 h-3.5 text-blue-600" />
            SDK Request Builder Knobs
          </span>

          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1 font-bold">Amount</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1 font-bold">Currency</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1 font-bold">Cardholder Name</label>
              <input
                type="text"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1 font-bold">PAN Card Number</label>
                <input
                  type="text"
                  value={rawCardNumber}
                  onChange={(e) => setRawCardNumber(e.target.value.replace(/\s+/g, ""))}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1 font-bold">CVV Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={rawCvv}
                  onChange={(e) => setRawCvv(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 font-mono text-xs text-center focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Quick explanations */}
          <div className="text-[10px] text-slate-500 bg-white p-2.5 rounded border border-slate-200 leading-normal font-sans">
            Adjusting parameters instantly modifies both the <b>SDK Code generation tab</b> and the <b>REST Client payloads</b> to demonstrate real-time cryptographic compliance.
          </div>
        </div>

        {/* Right Side: Code Tabs & Interactive JSON Rest client */}
        <div className="xl:col-span-7 space-y-4">
          
          {/* Tabs header */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("js")}
              className={`px-4 py-2 text-xs font-mono border-b-2 transition cursor-pointer ${
                activeTab === "js" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Javascript (SubtleCrypto)
            </button>
            <button
              onClick={() => setActiveTab("curl")}
              className={`px-4 py-2 text-xs font-mono border-b-2 transition cursor-pointer ${
                activeTab === "curl" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              cURL (Command Line)
            </button>
            <button
              onClick={() => setActiveTab("python")}
              className={`px-4 py-2 text-xs font-mono border-b-2 transition cursor-pointer ${
                activeTab === "python" ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Python
            </button>
          </div>

          {/* Code Viewer Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative">
            <button
              onClick={handleCopyCode}
              className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition cursor-pointer"
              title="Copy Code"
            >
              {copiedCode ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <pre className="font-mono text-[10px] text-indigo-300 overflow-x-auto max-h-[220px] leading-relaxed custom-scrollbar pr-6">
              {codeSnippets[activeTab]}
            </pre>
          </div>

          {/* Interactive REST API Client Console */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                Interactive API REST client
              </span>
              <span className="text-[9px] font-mono text-slate-500">POST /api/pay</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Request JSON Edit */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-slate-500 block font-bold">Edit Request Payload (JSON):</span>
                <textarea
                  value={customRequestJson}
                  onChange={(e) => setCustomRequestJson(e.target.value)}
                  className="w-full h-40 bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[9px] text-emerald-400 focus:outline-none focus:border-blue-500 custom-scrollbar resize-none"
                />
              </div>

              {/* Response Viewer */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-500 font-bold">Response Payload:</span>
                  {apiStatus !== null && (
                    <span className="font-mono text-[9px] text-slate-600">
                      Status:{" "}
                      <span className={apiStatus === 200 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {apiStatus}
                      </span>{" "}
                      ({apiRoundtrip}ms)
                    </span>
                  )}
                </div>
                <div className="w-full h-40 bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[9px] text-indigo-300 overflow-auto custom-scrollbar leading-relaxed">
                  {apiResponse ? (
                    JSON.stringify(apiResponse, null, 2)
                  ) : (
                    <span className="text-slate-500 italic">Click "Send API Request" to execute HTTP packet transaction...</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleSendCustomRequest}
              disabled={isSendingRequest}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-mono font-semibold py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {isSendingRequest ? (
                <>Transmitting network request packets...</>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-white" />
                  Execute POST /api/pay Request
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
