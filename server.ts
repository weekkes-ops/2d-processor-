import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

// Interfaces
interface Transaction {
  id: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  currency: string;
  cardholderName: string;
  cardNumberMasked: string;
  cardBrand: string;
  status: "APPROVED" | "DECLINED" | "FRAUD_BLOCKED" | "ERROR";
  failureReason?: string;
  riskScore: number;
  riskDetails: string[];
  latencyMs: number;
  createdAt: string;
  routingLogs: RoutingLog[];
  ipAddress: string;
  country: string;
}

interface RoutingLog {
  stage: string;
  status: "success" | "warning" | "failed";
  duration: number;
  description: string;
  timestamp: string;
}

interface Merchant {
  id: string;
  name: string;
  publishableKey: string;
  secretKey: string;
  createdAt: string;
}

interface RiskConfig {
  maxAmount: number;
  blockHighRiskCountries: boolean;
  requireCvvMatch: boolean;
  fraudThreshold: number; // 0-100, if score > threshold, block as fraud
  simulatedBankDeclineRate: number; // 0-100 % chance to decline standard cards
}

// Generate RSA 2048-bit Key Pair for Secure Payload Encryption
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

// Cache JWK for fast client access
const publicKeyJwk = publicKey.export({ format: "jwk" });

// In-Memory Database (Persists for the lifetime of the dev server container)
const merchants: Merchant[] = [
  {
    id: "merch_acme",
    name: "Acme Department Store",
    publishableKey: "pk_test_acme_51n39Vhg087",
    secretKey: "sk_test_acme_99z31Plk742",
    createdAt: new Date().toISOString(),
  },
  {
    id: "merch_retro",
    name: "Pixel Arcade & Cafe",
    publishableKey: "pk_test_pixel_38k21Anu011",
    secretKey: "sk_test_pixel_41q19Jsk920",
    createdAt: new Date().toISOString(),
  }
];

const transactions: Transaction[] = [];

interface Withdrawal {
  id: string;
  coin: "USDC" | "USDT" | "DAI" | "USDS";
  network: string;
  address: string;
  amount: number;
  gasFee: number;
  txHash: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  createdAt: string;
}

interface TreasuryState {
  fiatBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  withdrawals: Withdrawal[];
}

let treasury: TreasuryState = {
  fiatBalance: 25000.00, // Starts with a mock $25,000 baseline in vault
  totalDeposited: 25000.00,
  totalWithdrawn: 0.00,
  withdrawals: []
};

// Default Risk Engine Configuration
let riskConfig: RiskConfig = {
  maxAmount: 10000,
  blockHighRiskCountries: true,
  requireCvvMatch: true,
  fraudThreshold: 75,
  simulatedBankDeclineRate: 5, // 5% default random decline
};

// Start Express App
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // 1. Get Public Key (JWK Format) for Client-Side Encryption
  app.get("/api/keys/public", (req, res) => {
    res.json({
      jwk: publicKeyJwk,
      algorithm: "RSA-OAEP-256",
    });
  });

  // 2. Get Merchant List & API Keys
  app.get("/api/merchants", (req, res) => {
    res.json({ merchants });
  });

  // Create a new merchant
  app.post("/api/merchants", (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Merchant name is required." });
    }
    const id = `merch_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${crypto.randomBytes(3).toString("hex")}`;
    const newMerchant: Merchant = {
      id,
      name,
      publishableKey: `pk_test_${crypto.randomBytes(8).toString("hex")}`,
      secretKey: `sk_test_${crypto.randomBytes(12).toString("hex")}`,
      createdAt: new Date().toISOString(),
    };
    merchants.push(newMerchant);
    res.status(201).json(newMerchant);
  });

  // 3. Get Risk Configuration
  app.get("/api/config/risk", (req, res) => {
    res.json(riskConfig);
  });

  // Update Risk Configuration
  app.post("/api/config/risk", (req, res) => {
    const { maxAmount, blockHighRiskCountries, requireCvvMatch, fraudThreshold, simulatedBankDeclineRate } = req.body;
    
    if (typeof maxAmount === "number") riskConfig.maxAmount = maxAmount;
    if (typeof blockHighRiskCountries === "boolean") riskConfig.blockHighRiskCountries = blockHighRiskCountries;
    if (typeof requireCvvMatch === "boolean") riskConfig.requireCvvMatch = requireCvvMatch;
    if (typeof fraudThreshold === "number") riskConfig.fraudThreshold = fraudThreshold;
    if (typeof simulatedBankDeclineRate === "number") riskConfig.simulatedBankDeclineRate = simulatedBankDeclineRate;

    res.json({ message: "Risk configuration updated successfully", config: riskConfig });
  });

  // 3.5. Treasury and Stablecoin Settlement Routes
  app.get("/api/treasury", (req, res) => {
    res.json(treasury);
  });

  app.post("/api/treasury/deposit", (req, res) => {
    const { amount, method = "Simulated Card Transfer", cardholderName = "Treasury Admin" } = req.body;
    const depAmt = parseFloat(amount);
    if (isNaN(depAmt) || depAmt <= 0) {
      return res.status(400).json({ error: "Invalid deposit amount." });
    }
    treasury.fiatBalance += depAmt;
    treasury.totalDeposited += depAmt;
    res.json({ message: "Funds deposited successfully", treasury });
  });

  app.post("/api/treasury/withdraw", (req, res) => {
    const { coin, network, address, amount } = req.body;
    const withdrawAmt = parseFloat(amount);

    if (!coin || !["USDC", "USDT", "DAI", "USDS"].includes(coin)) {
      return res.status(400).json({ error: "Invalid or unsupported stablecoin." });
    }
    if (!network || !["Ethereum Mainnet", "Arbitrum One", "Solana", "Polygon PoS", "Optimism", "Tron TRC-20"].includes(network)) {
      return res.status(400).json({ error: "Invalid or unsupported network." });
    }
    if (isNaN(withdrawAmt) || withdrawAmt <= 0) {
      return res.status(400).json({ error: "Invalid withdrawal amount." });
    }
    if (withdrawAmt > treasury.fiatBalance) {
      return res.status(400).json({ error: "Insufficient treasury funds available for withdrawal." });
    }

    // Clean and normalize the address
    let finalAddress = (address || "").trim();

    // Auto-normalize EVM addresses (some might paste without '0x' prefix)
    const isEvmNetwork = ["Ethereum Mainnet", "Arbitrum One", "Polygon PoS", "Optimism"].includes(network);
    if (isEvmNetwork && !finalAddress.startsWith("0x") && /^[a-fA-F0-9]{40}$/.test(finalAddress)) {
      finalAddress = "0x" + finalAddress;
    }

    // Validate crypto wallet address format based on network type
    const isSolana = network === "Solana";
    const isTron = network === "Tron TRC-20";
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const tronRegex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;

    if (isSolana) {
      if (!solanaRegex.test(finalAddress)) {
        return res.status(400).json({ error: "Invalid Solana address format." });
      }
    } else if (isTron) {
      if (!tronRegex.test(finalAddress)) {
        return res.status(400).json({ error: "Invalid Tron TRC-20 address format. (Must start with 'T' followed by 33 base58 characters)." });
      }
    } else {
      if (!evmRegex.test(finalAddress)) {
        return res.status(400).json({ error: "Invalid EVM (0x...) wallet address format for " + network + "." });
      }
    }

    // Calculate a simulated gas fee
    let gasFee = 0.25;
    if (network === "Ethereum Mainnet") gasFee = 12.50;
    else if (network === "Arbitrum One") gasFee = 0.85;
    else if (network === "Solana") gasFee = 0.05;
    else if (network === "Polygon PoS") gasFee = 0.15;
    else if (network === "Optimism") gasFee = 0.40;
    else if (network === "Tron TRC-20") gasFee = 1.20;

    // Generate a beautiful, realistic transaction hash
    let txHash = "";
    if (isSolana) {
      // Solana signature
      const base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      txHash = Array.from({ length: 88 }, () => base58Chars[Math.floor(Math.random() * base58Chars.length)]).join("");
    } else if (isTron) {
      // Tron tx hash is a 64 hex characters string (capitalized)
      txHash = crypto.randomBytes(32).toString("hex").toUpperCase();
    } else {
      // EVM tx hash
      txHash = "0x" + crypto.randomBytes(32).toString("hex");
    }

    const newWithdrawal: Withdrawal = {
      id: `wth_${crypto.randomBytes(6).toString("hex")}`,
      coin,
      network,
      address: finalAddress,
      amount: withdrawAmt,
      gasFee,
      txHash,
      status: "CONFIRMED",
      createdAt: new Date().toISOString()
    };

    treasury.fiatBalance -= withdrawAmt;
    treasury.totalWithdrawn += withdrawAmt;
    treasury.withdrawals.push(newWithdrawal);

    res.json({
      message: "Withdrawal processed and confirmed on-chain successfully.",
      withdrawal: newWithdrawal,
      treasury
    });
  });

  // 4. Get Transactions
  app.get("/api/transactions", (req, res) => {
    res.json({ transactions: transactions.slice().reverse() });
  });

  // Clear Transactions
  app.delete("/api/transactions", (req, res) => {
    transactions.length = 0;
    treasury = {
      fiatBalance: 25000.00,
      totalDeposited: 25000.00,
      totalWithdrawn: 0.00,
      withdrawals: []
    };
    res.json({ message: "Transactions history and treasury database cleared." });
  });

  // 5. Get Aggregate Statistics
  app.get("/api/stats", (req, res) => {
    const total = transactions.length;
    if (total === 0) {
      return res.json({
        totalCount: 0,
        totalVolume: 0,
        approvalRate: 0,
        fraudRate: 0,
        averageLatencyMs: 0,
        brandStats: {},
        hourlyVolume: [],
      });
    }

    const approved = transactions.filter((t) => t.status === "APPROVED");
    const fraud = transactions.filter((t) => t.status === "FRAUD_BLOCKED");
    const totalVolume = approved.reduce((sum, t) => sum + t.amount, 0);
    const approvalRate = parseFloat(((approved.length / total) * 100).toFixed(1));
    const fraudRate = parseFloat(((fraud.length / total) * 100).toFixed(1));
    const totalLatency = transactions.reduce((sum, t) => sum + t.latencyMs, 0);
    const averageLatencyMs = Math.round(totalLatency / total);

    // Group by Brand
    const brandStats: Record<string, { count: number; volume: number }> = {};
    transactions.forEach((t) => {
      if (!brandStats[t.cardBrand]) {
        brandStats[t.cardBrand] = { count: 0, volume: 0 };
      }
      brandStats[t.cardBrand].count += 1;
      if (t.status === "APPROVED") {
        brandStats[t.cardBrand].volume += t.amount;
      }
    });

    res.json({
      totalCount: total,
      totalVolume,
      approvalRate,
      fraudRate,
      averageLatencyMs,
      brandStats,
    });
  });

  // 6. CORE Gateway Payment Processor Endpoint (Supports Secure 2D Processing Flow)
  app.post("/api/pay", (req, res) => {
    const startTime = Date.now();
    const routingLogs: RoutingLog[] = [];
    const riskDetails: string[] = [];

    // Extract request headers & body
    const publishableKey = req.headers["authorization"] || req.body.publishableKey;
    const {
      encryptedPayload, // Base64 ciphertext encrypted with server's RSA public key
      amount,
      currency = "USD",
      cardholderName,
      cardBrand,
      clientIp = "127.0.0.1",
      clientCountry = "US",
    } = req.body;

    const logStage = (stage: string, status: "success" | "warning" | "failed", duration: number, description: string) => {
      routingLogs.push({
        stage,
        status,
        duration,
        description,
        timestamp: new Date().toISOString(),
      });
    };

    // Stage 1: API Authentication
    const authStart = Date.now();
    const merchant = merchants.find((m) => m.publishableKey === publishableKey);
    const authLatency = Date.now() - authStart + 8; // add minor realistic timing noise
    
    if (!merchant) {
      logStage("API_AUTH", "failed", authLatency, "Invalid merchant credentials or Publishable Key provided.");
      const errorTx: Transaction = {
        id: `tx_${crypto.randomBytes(8).toString("hex")}`,
        merchantId: "unknown",
        merchantName: "Unknown Merchant",
        amount: Number(amount) || 0,
        currency,
        cardholderName: cardholderName || "Unknown",
        cardNumberMasked: "**** **** **** ****",
        cardBrand: cardBrand || "Unknown",
        status: "ERROR",
        failureReason: "API_AUTHENTICATION_FAILED",
        riskScore: 0,
        riskDetails: ["Authentication failed: publishable key not found"],
        latencyMs: authLatency,
        createdAt: new Date().toISOString(),
        routingLogs,
        ipAddress: clientIp,
        country: clientCountry,
      };
      transactions.push(errorTx);
      return res.status(401).json({ error: "Invalid Publishable Key.", transaction: errorTx });
    }
    logStage("API_AUTH", "success", authLatency, `Merchant validated: ${merchant.name} (${merchant.id})`);

    // Stage 2: Payload Decryption & Integrity Check
    const decryptStart = Date.now();
    let decryptedCardNumber = "";
    let decryptedCvv = "";
    let decryptedExpiry = "";
    let decryptError = null;

    try {
      if (!encryptedPayload) {
        throw new Error("Missing encrypted credit card payload.");
      }

      // Decrypt the RSA encrypted block
      const buffer = Buffer.from(encryptedPayload, "base64");
      const decryptedBuffer = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        buffer
      );

      // Expecting JSON payload: {"number": "4111...", "cvv": "123", "expiry": "12/28"}
      const decryptedData = JSON.parse(decryptedBuffer.toString("utf8"));
      decryptedCardNumber = decryptedData.number;
      decryptedCvv = decryptedData.cvv;
      decryptedExpiry = decryptedData.expiry;

      if (!decryptedCardNumber || !decryptedCvv) {
        throw new Error("Decrypted payload is missing card number or CVV.");
      }
    } catch (err: any) {
      decryptError = err.message || "Decryption failed";
    }

    const decryptLatency = Date.now() - decryptStart + 12;

    if (decryptError) {
      logStage("PAYLOAD_DECRYPTION", "failed", decryptLatency, `Secure Decryption failed: ${decryptError}`);
      const errorTx: Transaction = {
        id: `tx_${crypto.randomBytes(8).toString("hex")}`,
        merchantId: merchant.id,
        merchantName: merchant.name,
        amount: Number(amount) || 0,
        currency,
        cardholderName: cardholderName || "Unknown",
        cardNumberMasked: "**** **** **** ****",
        cardBrand: cardBrand || "Unknown",
        status: "ERROR",
        failureReason: "PAYLOAD_DECRYPTION_FAILED",
        riskScore: 0,
        riskDetails: [`Cryptographic fail: ${decryptError}`],
        latencyMs: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        routingLogs,
        ipAddress: clientIp,
        country: clientCountry,
      };
      transactions.push(errorTx);
      return res.status(400).json({ error: `Cryptographic Handshake Failed: ${decryptError}`, transaction: errorTx });
    }

    // Mask card number for PCI compliance
    const cleanCardNum = decryptedCardNumber.replace(/\s+/g, "");
    const maskedCard = `${cleanCardNum.slice(0, 4)} ${cleanCardNum.slice(4, 6)}** **** ${cleanCardNum.slice(-4)}`;
    logStage("PAYLOAD_DECRYPTION", "success", decryptLatency, `Encrypted package received. Securely decrypted via RSA-OAEP-256. Card masked as: ${maskedCard}`);

    // Stage 3: Risk & Fraud Engine Checklist
    const riskStart = Date.now();
    let riskScore = 10; // baseline

    // Risk Rule 1: High Transaction Value
    if (amount > 1000) {
      riskScore += 25;
      riskDetails.push("Transaction amount exceeds $1,000 threshold (+25)");
    }
    if (amount > riskConfig.maxAmount) {
      riskScore += 45;
      riskDetails.push(`Transaction amount exceeds merchant limit of $${riskConfig.maxAmount} (+45)`);
    }

    // Risk Rule 2: Country / Geolocation Anomalies (High-risk countries simulation)
    const highRiskCountries = ["RU", "NG", "KP", "IR", "UA"];
    if (highRiskCountries.includes(clientCountry)) {
      if (riskConfig.blockHighRiskCountries) {
        riskScore += 50;
        riskDetails.push(`High-risk geolocation country code detected [${clientCountry}] (+50)`);
      } else {
        riskScore += 20;
        riskDetails.push(`Unusual billing country detected [${clientCountry}] (+20)`);
      }
    }

    // Risk Rule 3: Bad card CVV / Expiry structures or names
    if (cardholderName.toLowerCase().includes("test fraud") || cardholderName.toLowerCase().includes("anonymous")) {
      riskScore += 65;
      riskDetails.push("Cardholder name matches international fraud watchlist profiles (+65)");
    }
    
    // Simulating specific CVVs for testing fraud triggering
    if (decryptedCvv === "999") {
      riskScore += 80;
      riskDetails.push("Simulated security trigger CVV 999 (+80)");
    }

    const riskLatency = Date.now() - riskStart + 22;

    const isFraudBlocked = riskScore >= riskConfig.fraudThreshold;
    logStage(
      "RISK_ASSESSMENT",
      isFraudBlocked ? "failed" : riskScore > 40 ? "warning" : "success",
      riskLatency,
      `Risk evaluated. Score: ${riskScore}/100 (Threshold: ${riskConfig.fraudThreshold}). Rules executed: ${riskDetails.length || "None (Standard User)"}`
    );

    if (isFraudBlocked) {
      const fraudTx: Transaction = {
        id: `tx_${crypto.randomBytes(8).toString("hex")}`,
        merchantId: merchant.id,
        merchantName: merchant.name,
        amount: Number(amount),
        currency,
        cardholderName,
        cardNumberMasked: maskedCard,
        cardBrand,
        status: "FRAUD_BLOCKED",
        failureReason: "RISK_SCORE_EXCEEDED_THRESHOLD",
        riskScore,
        riskDetails,
        latencyMs: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        routingLogs,
        ipAddress: clientIp,
        country: clientCountry,
      };
      transactions.push(fraudTx);
      return res.json({ success: false, reason: "FRAUD_BLOCKED", transaction: fraudTx });
    }

    // Stage 4: Processing Route Selection & Acquirer Interconnect
    const routeStart = Date.now();
    let selectedRoute = "";
    if (cardBrand.toLowerCase() === "visa") {
      selectedRoute = "VisaNet Clearing (US-East Router)";
    } else if (cardBrand.toLowerCase() === "mastercard") {
      selectedRoute = "MC-Nexus Interconnect (US-Central Gateway)";
    } else if (cardBrand.toLowerCase() === "american express" || cardBrand.toLowerCase() === "amex") {
      selectedRoute = "Amex Centurion Direct (US-Phoenix Cloud)";
    } else {
      selectedRoute = "Standard Clearing Network Link (Global)";
    }
    const routeLatency = Date.now() - routeStart + 15;
    logStage("ROUTE_SELECTION", "success", routeLatency, `Acquirer link established. Routed transaction to: ${selectedRoute}`);

    // Stage 5: Clearing Network Handshake (ISO 8583 Message Conversion)
    const clearingStart = Date.now();
    const refNum = Math.floor(100000 + Math.random() * 900000);
    const clearingLatency = Date.now() - clearingStart + 65;
    logStage("CLEARING_HANDSHAKE", "success", clearingLatency, `Transmitted ISO 8583 AuthRequest (MTI 0100). Reference Retrieval Number: ${refNum}`);

    // Stage 6: Issuing Bank Ledger Validation (Check CVV, Expiry, Funds)
    const bankStart = Date.now();
    let bankStatus: "APPROVED" | "DECLINED" = "APPROVED";
    let bankDeclineReason = "";

    // Test Scenarios based on CVV/Card inputs
    if (decryptedCvv === "000") {
      bankStatus = "DECLINED";
      bankDeclineReason = "INSUFFICIENT_FUNDS";
    } else if (decryptedCvv === "111") {
      bankStatus = "DECLINED";
      bankDeclineReason = "SUSPECTED_FRAUD_BY_ISSUER";
    } else if (decryptedCvv === "222") {
      bankStatus = "DECLINED";
      bankDeclineReason = "EXPIRED_CARD";
    } else if (decryptedCvv === "333") {
      bankStatus = "DECLINED";
      bankDeclineReason = "INCORRECT_CVV";
    } else {
      // Apply configured simulated decline rate for random card processing
      const roll = Math.random() * 100;
      if (roll < riskConfig.simulatedBankDeclineRate) {
        bankStatus = "DECLINED";
        const randomReasons = ["INSUFFICIENT_FUNDS", "EXCEEDS_DAILY_LIMIT", "RESTRICTED_CARD"];
        bankDeclineReason = randomReasons[Math.floor(Math.random() * randomReasons.length)];
      }
    }

    const bankLatency = Date.now() - bankStart + 115; // Simulates bank's processing delay

    if (bankStatus === "DECLINED") {
      logStage("ISSUER_VALIDATION", "failed", bankLatency, `Issuing Bank rejected transaction. Reason: ${bankDeclineReason}`);
      const declineTx: Transaction = {
        id: `tx_${crypto.randomBytes(8).toString("hex")}`,
        merchantId: merchant.id,
        merchantName: merchant.name,
        amount: Number(amount),
        currency,
        cardholderName,
        cardNumberMasked: maskedCard,
        cardBrand,
        status: "DECLINED",
        failureReason: bankDeclineReason,
        riskScore,
        riskDetails,
        latencyMs: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        routingLogs,
        ipAddress: clientIp,
        country: clientCountry,
      };
      transactions.push(declineTx);
      return res.json({ success: false, reason: bankDeclineReason, transaction: declineTx });
    }

    logStage("ISSUER_VALIDATION", "success", bankLatency, `Issuing Bank authorized funds. Auth Code: AUTH-${Math.floor(100000 + Math.random() * 900000)}`);

    // Stage 7: Ledger Logging & Return Complete
    const totalLatency = Date.now() - startTime;
    const finalTx: Transaction = {
      id: `tx_${crypto.randomBytes(8).toString("hex")}`,
      merchantId: merchant.id,
      merchantName: merchant.name,
      amount: Number(amount),
      currency,
      cardholderName,
      cardNumberMasked: maskedCard,
      cardBrand,
      status: "APPROVED",
      riskScore,
      riskDetails,
      latencyMs: totalLatency,
      createdAt: new Date().toISOString(),
      routingLogs,
      ipAddress: clientIp,
      country: clientCountry,
    };

    transactions.push(finalTx);
    treasury.fiatBalance += finalTx.amount;
    treasury.totalDeposited += finalTx.amount;
    res.json({ success: true, transaction: finalTx });
  });

  // Vite Integration for Client-Side Assets serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
