import React, { useState, useEffect } from "react";
import { 
  Coins, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  DollarSign, 
  Check, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  ArrowRight,
  Shield,
  Clock,
  HelpCircle,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { Withdrawal, TreasuryState } from "../types";

interface TreasurySettlementProps {
  onRefreshLedger: () => void;
}

export default function TreasurySettlement({ onRefreshLedger }: TreasurySettlementProps) {
  const [treasury, setTreasury] = useState<TreasuryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("ATM Card");
  const [depositorName, setDepositorName] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState("");

  // Withdrawal Form State
  const [selectedCoin, setSelectedCoin] = useState<"USDC" | "USDT" | "DAI" | "USDS">("USDC");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("Ethereum Mainnet");
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  
  // Blockchain Animation States
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalSuccessMsg, setWithdrawalSuccessMsg] = useState("");
  const [blockchainLogs, setBlockchainLogs] = useState<string[]>([]);
  const [currentAnimStage, setCurrentAnimStage] = useState(0);

  // Address validation feedback
  const [addressFeedback, setAddressFeedback] = useState<{ valid: boolean; message: string }>({
    valid: false,
    message: "Awaiting wallet address input..."
  });

  const fetchTreasury = async () => {
    try {
      const res = await fetch("/api/treasury");
      const data = await res.json();
      setTreasury(data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch treasury data", err);
      setError("Failed to sync with local gateway treasury database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasury();
  }, []);

  // Sync wallet address validation whenever inputs change
  useEffect(() => {
    const trimmed = (walletAddress || "").trim();
    if (!trimmed) {
      setAddressFeedback({ valid: false, message: "Awaiting wallet address input..." });
      return;
    }

    const isSolana = selectedNetwork === "Solana";
    const isTron = selectedNetwork === "Tron TRC-20";
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const tronRegex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;

    if (isSolana) {
      if (solanaRegex.test(trimmed)) {
        setAddressFeedback({ valid: true, message: "Valid Solana address format (Base58 signature)" });
      } else {
        setAddressFeedback({ valid: false, message: "Invalid Solana address format (32-44 base58 chars)" });
      }
    } else if (isTron) {
      if (tronRegex.test(trimmed)) {
        setAddressFeedback({ valid: true, message: "Valid Tron TRC-20 address format" });
      } else {
        setAddressFeedback({ valid: false, message: "Invalid Tron TRC-20 address format (Must start with 'T' and be 34 chars)" });
      }
    } else {
      // EVM check
      if (evmRegex.test(trimmed)) {
        setAddressFeedback({ valid: true, message: `Valid EVM address format for ${selectedNetwork}` });
      } else if (!trimmed.startsWith("0x") && /^[a-fA-F0-9]{40}$/.test(trimmed)) {
        setAddressFeedback({ valid: true, message: "Valid (will auto-prepend '0x')" });
      } else {
        setAddressFeedback({ valid: false, message: "Invalid EVM address format (Must start with '0x' followed by 40 hex chars)" });
      }
    }
  }, [walletAddress, selectedNetwork]);

  // Handle direct deposit submit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsDepositing(true);
    setDepositSuccessMsg("");

    try {
      const res = await fetch("/api/treasury/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          method: depositMethod,
          cardholderName: depositorName || "Treasury Liquidity Injector"
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process deposit");

      setTreasury(data.treasury);
      setDepositSuccessMsg(`Successfully loaded +$${amt.toLocaleString()} fiat capital via ${depositMethod}!`);
      setDepositAmount("");
      setDepositorName("");
      onRefreshLedger();
      
      setTimeout(() => setDepositSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to load deposit.");
    } finally {
      setIsDepositing(false);
    }
  };

  // Get network estimated gas fee
  const getGasFee = () => {
    if (selectedNetwork === "Ethereum Mainnet") return 12.50;
    if (selectedNetwork === "Arbitrum One") return 0.85;
    if (selectedNetwork === "Solana") return 0.05;
    if (selectedNetwork === "Polygon PoS") return 0.15;
    if (selectedNetwork === "Optimism") return 0.40;
    if (selectedNetwork === "Tron TRC-20") return 1.20;
    return 0.25;
  };

  // Handle Withdrawal submit with high-fidelity blockchain pipeline animation
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (!addressFeedback.valid) return;

    setIsWithdrawing(true);
    setWithdrawalSuccessMsg("");
    setCurrentAnimStage(0);
    setBlockchainLogs([
      "📡 Establishing connection to RPC Node Providers...",
    ]);

    // Pace step-by-step blockchain consensus logging to demonstrate high-fidelity processing
    const stages = [
      { delay: 600, log: "🔐 Initializing wallet connection and serializing payout proposal..." },
      { delay: 1200, log: `🧮 Simulating gas limit. Est. fee: $${getGasFee().toFixed(2)} USD equivalent.` },
      { delay: 1800, log: `📝 Minting/Releasing equivalent ${selectedCoin} on smart contract standard...` },
      { delay: 2400, log: `🧱 Broadcasting signed transaction block to ${selectedNetwork} validators...` },
      { delay: 3000, log: "🔗 Consensus finalized. Block committed to decentralized ledger." }
    ];

    stages.forEach((stage, index) => {
      setTimeout(() => {
        setBlockchainLogs(prev => [...prev, stage.log]);
        setCurrentAnimStage(index + 1);
      }, stage.delay);
    });

    // Execute server API post upon animation completion
    setTimeout(async () => {
      try {
        const res = await fetch("/api/treasury/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coin: selectedCoin,
            network: selectedNetwork,
            address: walletAddress,
            amount: amt
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to withdraw");

        setTreasury(data.treasury);
        setBlockchainLogs(prev => [
          ...prev, 
          `✅ SUCCESS! Confirmed TX Hash: ${data.withdrawal.txHash}`,
          `📥 Settled ${amt.toFixed(2)} USD into ${(amt - getGasFee()).toFixed(2)} ${selectedCoin} directly to target wallet.`
        ]);
        setWithdrawalSuccessMsg(`Successfully withdrawn $${amt.toLocaleString()} to ${selectedCoin}!`);
        setWithdrawAmount("");
        setWalletAddress("");
        onRefreshLedger();
      } catch (err: any) {
        setBlockchainLogs(prev => [...prev, `❌ ERROR: ${err.message}`]);
        alert(err.message || "Failed to process withdrawal.");
      } finally {
        setIsWithdrawing(false);
      }
    }, 3800);
  };

  const getShorthandAddress = (addr: string) => {
    if (!addr) return "";
    if (addr.length < 15) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 italic flex flex-col items-center justify-center gap-3 shadow-sm">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
        <span>Compiling decentralized treasury vault...</span>
      </div>
    );
  }

  if (error || !treasury) {
    return (
      <div className="bg-white border border-rose-100 rounded-xl p-8 text-center text-rose-800 flex flex-col items-center justify-center gap-3 shadow-sm">
        <AlertCircle className="w-6 h-6 text-rose-500 animate-bounce" />
        <span className="font-semibold">{error || "Server connection issues detected."}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900" id="treasury-settlement-section">
      
      {/* 1. Treasury High-Contrast Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Available Balance */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow transition duration-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Available Liquidity Vault</span>
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
              ${treasury.fiatBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-1">
              Fluid capital instantly withdrawable to Stablecoins
            </p>
          </div>
        </div>

        {/* Card 2: Total Deposited / Settled */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow transition duration-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Total Fluid Deposits</span>
            <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold font-sans text-emerald-600 tracking-tight">
              ${treasury.totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-1">
              Includes merchant checkout settlements & direct deposits
            </p>
          </div>
        </div>

        {/* Card 3: Total Withdrawn */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow transition duration-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Total Crypto Withdrawn</span>
            <ArrowUpRight className="w-5 h-5 text-rose-600" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold font-sans text-rose-600 tracking-tight">
              ${treasury.totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-1">
              Settled on-chain to decentralised USD tokens
            </p>
          </div>
        </div>

      </div>

      {/* 2. Interactive Columns for Deposits and Withdrawals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column Left: Direct User Deposit (ACH/FedNow/Wire/Cards) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                Capital Deposit Portal
              </h3>
              <span className="text-[10px] font-mono bg-emerald-50 px-2.5 py-0.5 rounded text-emerald-700 border border-emerald-100">
                Simulated Gateway
              </span>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">Funding Pipeline Method</label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ATM Card">ATM Debit/Credit Card</option>
                  <option value="SEPA Direct Debit">SEPA Euro Capital Rail</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">Depositor Reference / Entity</label>
                <input
                  type="text"
                  placeholder="e.g. Nexus Master Vault"
                  value={depositorName}
                  onChange={(e) => setDepositorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">Amount to Deposit (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1000.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isDepositing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-semibold text-xs py-2 rounded-lg transition duration-200 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDepositing ? (
                  <>Processing wire settlement...</>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Inject Deposited Capital
                  </>
                )}
              </button>
            </form>

            {depositSuccessMsg && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-start gap-2 animate-pulse font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{depositSuccessMsg}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px] text-slate-500 leading-normal">
            Directly injecting capital simulates fiat wire deposits into your Nexus gateway liquid vault. It instantly swells your available withdrawal capacity.
          </div>
        </div>

        {/* Column Right: Merchant Withdrawal (Crypto Stablecoins) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              On-Chain Stablecoin Settlement Withdrawals
            </h3>
            <span className="text-[10px] font-mono bg-blue-50 px-2.5 py-0.5 rounded text-blue-600 border border-blue-100">
              Contract Verified
            </span>
          </div>

          <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">Stablecoin Asset</label>
                <div className="flex gap-2">
                  {(["USDC", "USDT", "DAI", "USDS"] as const).map((coin) => (
                    <button
                      key={coin}
                      type="button"
                      onClick={() => setSelectedCoin(coin)}
                      className={`flex-1 px-2.5 py-2 text-xs font-bold rounded-lg border transition ${
                        selectedCoin === coin
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {coin}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">Blockchain Network</label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Ethereum Mainnet">Ethereum Mainnet (High Gas)</option>
                  <option value="Arbitrum One">Arbitrum One Layer-2 (Instant)</option>
                  <option value="Solana">Solana Base58 Protocol (Instant)</option>
                  <option value="Polygon PoS">Polygon PoS Network (Rapid)</option>
                  <option value="Optimism">Optimism Rollup (Instant)</option>
                  <option value="Tron TRC-20">Tron TRC-20 Network (Instant)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-bold">Target Wallet Address</label>
                <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded border ${
                  addressFeedback.valid 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {addressFeedback.message}
                </span>
              </div>
              <input
                type="text"
                placeholder={selectedNetwork === "Solana" ? "e.g. HN7cAB... (Solana Address)" : selectedNetwork === "Tron TRC-20" ? "e.g. TXvhY8S9Ff... (Tron Address)" : "e.g. 0x71C... (EVM Address)"}
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">Withdraw Amount (USD Value)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">$</span>
                  <input
                    type="number"
                    placeholder="1000"
                    step="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Live Conversion calculator */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-150 text-[10px] text-slate-600 font-mono space-y-0.5 h-[38px] flex flex-col justify-center">
                {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) ? (
                  <>
                    <div className="flex justify-between">
                      <span>Est. Gas Fee:</span>
                      <span className="font-bold text-slate-700">${getGasFee().toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Stablecoins:</span>
                      <span className="font-bold text-blue-600">
                        {Math.max(0, parseFloat(withdrawAmount) - getGasFee()).toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedCoin}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400 italic text-[9px]">Enter amount to compute conversion...</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isWithdrawing || !addressFeedback.valid || !withdrawAmount}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white font-semibold text-xs py-2 rounded-lg transition duration-200 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isWithdrawing ? (
                <>Simulating Blockchain Settlements...</>
              ) : (
                <>
                  <Coins className="w-3.5 h-3.5" />
                  Initiate Stablecoin Settlement Payout
                </>
              )}
            </button>
          </form>

          {/* Real-time blockchain pipeline stream logs */}
          {(isWithdrawing || blockchainLogs.length > 0) && (
            <div className="p-3 bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400 rounded-lg space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar shadow-inner leading-normal">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[9px] text-slate-500">
                <span>ON-CHAIN SETTLEMENT TERMINAL LINK</span>
                <span className="animate-pulse text-emerald-400">● LIVE RUNTIME</span>
              </div>
              {blockchainLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-1">
                  <span className="text-slate-600 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 3. Decentralized Settlement Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Decentralized On-Chain Settlement Ledger
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Comprehensive real-time immutable ledger logging all stablecoin withdrawal events in this gateway node.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-sans font-bold text-slate-600">
                <th className="p-3">WITHDRAWAL_ID</th>
                <th className="p-3">Stablecoin Asset</th>
                <th className="p-3">Network</th>
                <th className="p-3">Target Address</th>
                <th className="p-3">Amount (USD)</th>
                <th className="p-3 font-mono">Net Settled</th>
                <th className="p-3">On-chain TX Hash</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {treasury.withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                    No stablecoin withdrawal events logged on this gateway. Use the panel above to withdraw funds.
                  </td>
                </tr>
              ) : (
                treasury.withdrawals.slice().reverse().map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-[10px] text-blue-600 font-semibold">{w.id}</td>
                    <td className="p-3 font-bold text-slate-850">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {w.coin}
                      </span>
                    </td>
                    <td className="p-3 font-sans text-slate-600 font-semibold">{w.network}</td>
                    <td className="p-3 font-mono text-slate-500 text-[10px]" title={w.address}>
                      {getShorthandAddress(w.address)}
                    </td>
                    <td className="p-3 font-mono text-slate-900 font-bold">${w.amount.toFixed(2)}</td>
                    <td className="p-3 font-mono text-emerald-600 font-bold">
                      ${(w.amount - w.gasFee).toFixed(2)} {w.coin}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">
                      <span className="inline-flex items-center gap-1" title={w.txHash}>
                        {w.txHash.slice(0, 10)}...{w.txHash.slice(-6)}
                        <ExternalLink className="w-2.5 h-2.5 cursor-pointer text-slate-500 hover:text-blue-500" />
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
