import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Settings, 
  Code2, 
  CreditCard, 
  Cpu, 
  Layers, 
  Activity, 
  Lock, 
  HelpCircle,
  Database,
  RefreshCw,
  Sparkles,
  Info,
  Coins
} from "lucide-react";
import { Transaction, Merchant, RiskConfig, Stats, RoutingLog } from "./types";
import FlowVisualizer from "./components/FlowVisualizer";
import TerminalSimulator from "./components/TerminalSimulator";
import AdminDashboard from "./components/AdminDashboard";
import DeveloperSandbox from "./components/DeveloperSandbox";
import TreasurySettlement from "./components/TreasurySettlement";

export default function App() {
  // Tabs: "VISUALIZER" | "DASHBOARD" | "PLAYGROUND" | "TREASURY"
  const [activeTab, setActiveTab] = useState<"VISUALIZER" | "DASHBOARD" | "PLAYGROUND" | "TREASURY">("VISUALIZER");

  // Server state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null);
  const [riskConfig, setRiskConfig] = useState<RiskConfig | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [publicKeyJwk, setPublicKeyJwk] = useState<any>(null);

  // Simulation / Sequencer State
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  const [sequencerLogs, setSequencerLogs] = useState<RoutingLog[]>([]);
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);

  // Initial Boot loader
  useEffect(() => {
    async function initGateway() {
      try {
        // 1. Fetch Server's RSA Public Key
        const keyRes = await fetch("/api/keys/public");
        const keyData = await keyRes.json();
        setPublicKeyJwk(keyData.jwk);

        // 2. Fetch Merchants
        const merchRes = await fetch("/api/merchants");
        const merchData = await merchRes.json();
        setMerchants(merchData.merchants);
        if (merchData.merchants.length > 0) {
          setActiveMerchant(merchData.merchants[0]);
        }

        // 3. Fetch Risk config
        const riskRes = await fetch("/api/config/risk");
        const riskData = await riskRes.json();
        setRiskConfig(riskData);

        // 4. Fetch initial ledger history
        await refreshTransactionsData();

      } catch (err) {
        console.error("Initialization failure. Gateway server offline?", err);
      }
    }
    initGateway();
  }, []);

  // Fetch updated records from server
  const refreshTransactionsData = async () => {
    try {
      const txRes = await fetch("/api/transactions");
      const txData = await txRes.json();
      setTransactions(txData.transactions);

      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to refresh ledger data", err);
    }
  };

  // Submit payment handler from the Terminal Card form
  const handleProcessPayment = async (cardPayload: {
    encryptedPayload: string;
    amount: number;
    cardholderName: string;
    cardBrand: string;
    clientCountry: string;
    clientIp: string;
  }) => {
    if (isProcessing || !activeMerchant) return;
    
    setIsProcessing(true);
    setActiveStageIndex(0);
    setSequencerLogs([]);
    setActiveTx(null);

    // Swap to visualizer tab so they can watch the flow!
    setActiveTab("VISUALIZER");

    try {
      // 1. Fire post payload to backend gateway API
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": activeMerchant.publishableKey,
        },
        body: JSON.stringify(cardPayload),
      });

      const responseData = await res.json();
      const finalTx: Transaction = responseData.transaction || responseData;

      // 2. Start visual sequencer
      // Since processing is almost instantaneous server-side, we pace the UI state animations 
      // through the 7 stages (each taking ~350ms) to let the developer follow the packet's path.
      const serverLogs = finalTx.routingLogs || [];
      
      let currentStageIdx = 0;
      const totalStages = 7;

      const runSequencer = () => {
        if (currentStageIdx < totalStages) {
          setActiveStageIndex(currentStageIdx);
          
          // Pull matching logs from the server response up to this index
          const logsSlice = serverLogs.slice(0, currentStageIdx + 1);
          setSequencerLogs(logsSlice);

          currentStageIdx++;
          setTimeout(runSequencer, 450); // Delay between visual nodes lighting up
        } else {
          // Finalize sequence
          setActiveTx(finalTx);
          setIsProcessing(false);
          refreshTransactionsData(); // reload stats and ledger log
        }
      };

      // Kick off sequencer
      runSequencer();

    } catch (err: any) {
      console.error("Network error during payment processing", err);
      setIsProcessing(false);
    }
  };

  // Handle Clear Logs
  const handleClearTransactions = async () => {
    if (!confirm("Are you sure you want to delete all transaction logs in this sandbox ledger?")) return;
    try {
      await fetch("/api/transactions", { method: "DELETE" });
      setTransactions([]);
      setSelectedTxDetail(null);
      setSequencerLogs([]);
      setActiveTx(null);
      await refreshTransactionsData();
    } catch (err) {
      console.error("Clear failed", err);
    }
  };

  // Handle Risk configurations update
  const handleUpdateRiskConfig = async (newConfig: Partial<RiskConfig>) => {
    try {
      const res = await fetch("/api/config/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      const data = await res.json();
      setRiskConfig(data.config);
    } catch (err) {
      console.error("Update risk failed", err);
    }
  };

  // Handle creating a new merchant profile
  const handleCreateMerchant = async (name: string) => {
    try {
      const res = await fetch("/api/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const newMerch = await res.json();
      setMerchants((prev) => [...prev, newMerch]);
      setActiveMerchant(newMerch);
    } catch (err) {
      console.error("Create merchant failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Upper Navigation Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 px-4 py-3.5 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg text-white">
              N
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold tracking-tight uppercase">
                  NEXUS <span className="font-light opacity-85">2D GATEWAY</span>
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-bold text-green-400 uppercase tracking-widest">v1.0 Secure</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                Cryptographic Card Processing Sandbox & Routing Engine Visualizer
              </p>
            </div>
          </div>

          {/* Main View Tabs selectors & system state */}
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveTab("VISUALIZER")}
                className={`px-3 py-1.5 rounded-lg font-sans font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "VISUALIZER" 
                    ? "bg-slate-800 text-white border border-slate-700/55 shadow-sm" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Gateway Visualizer
              </button>
              <button
                onClick={() => setActiveTab("DASHBOARD")}
                className={`px-3 py-1.5 rounded-lg font-sans font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "DASHBOARD" 
                    ? "bg-slate-800 text-white border border-slate-700/55 shadow-sm" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Ledger & Risk
              </button>
              <button
                onClick={() => setActiveTab("PLAYGROUND")}
                className={`px-3 py-1.5 rounded-lg font-sans font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "PLAYGROUND" 
                    ? "bg-slate-800 text-white border border-slate-700/55 shadow-sm" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Developer Sandbox
              </button>
              <button
                onClick={() => setActiveTab("TREASURY")}
                className={`px-3 py-1.5 rounded-lg font-sans font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "TREASURY" 
                    ? "bg-slate-800 text-white border border-slate-700/55 shadow-sm" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                Treasury & Crypto
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/15 border border-green-500/25 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-[10px] font-medium text-green-400 uppercase tracking-wider">System Online</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {activeTab === "VISUALIZER" ? (
          /* Gateway Visualizer Split Screen (Split into Simulator form and the Visual flowchart) */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* Left: Interactive checkout terminal card */}
            <div className="xl:col-span-5 h-full">
              {publicKeyJwk && activeMerchant ? (
                <TerminalSimulator
                  onPay={handleProcessPayment}
                  isProcessing={isProcessing}
                  publicKeyJwk={publicKeyJwk}
                  merchants={merchants}
                  activeMerchant={activeMerchant}
                  setActiveMerchant={setActiveMerchant}
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm h-96 flex flex-col items-center justify-center text-xs text-slate-500 gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                  <span>Negotiating cryptographic handshake keys...</span>
                </div>
              )}
            </div>

            {/* Right: Flowchart diagram + active step console logger */}
            <div className="xl:col-span-7 h-full">
              <FlowVisualizer
                activeTx={activeTx}
                isProcessing={isProcessing}
                activeStageIndex={activeStageIndex}
                logs={sequencerLogs}
              />
            </div>

          </div>
        ) : activeTab === "DASHBOARD" ? (
          /* Metrics and Settlement Ledger page */
          stats && riskConfig ? (
            <AdminDashboard
              transactions={transactions}
              merchants={merchants}
              riskConfig={riskConfig}
              stats={stats}
              onUpdateRiskConfig={handleUpdateRiskConfig}
              onClearTransactions={handleClearTransactions}
              onCreateMerchant={handleCreateMerchant}
              onSelectTransaction={setSelectedTxDetail}
              selectedTx={selectedTxDetail}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 italic flex flex-col items-center justify-center gap-3 shadow-sm">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>Compiling ledger analytics database...</span>
            </div>
          )
        ) : activeTab === "PLAYGROUND" ? (
          /* Python/JS cURL Sandbox play module */
          activeMerchant && publicKeyJwk ? (
            <DeveloperSandbox
              activeMerchant={activeMerchant}
              publicKeyJwk={publicKeyJwk}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 italic flex flex-col items-center justify-center gap-3 shadow-sm">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>Loading merchant environment configs...</span>
            </div>
          )
        ) : (
          /* Treasury and Decentralised Settlements panel */
          <TreasurySettlement onRefreshLedger={refreshTransactionsData} />
        )}

        {/* Informative Educational Footer */}
        <footer className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">Payment Gateway Security Standard:</span> Client card data is fully encrypted with <b>RSA-OAEP-256</b> using browser subtle crypto, and decrypted solely on our secure memory container.
          </div>
          <div className="flex gap-4 font-mono text-[10px]">
            <span>PCI DSS COMPLIANT v4.0</span>
            <span>SOC2 TYPE II CERTIFIED</span>
            <div className="flex items-center gap-1 text-slate-700 font-bold">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              SECURE NODE 12
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
