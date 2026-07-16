import React, { useState } from "react";
import { 
  BarChart3, 
  ShieldAlert, 
  TrendingUp, 
  Clock, 
  Database,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  PlusCircle,
  Copy,
  Sliders,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronDown,
  Info
} from "lucide-react";
import { Transaction, Merchant, RiskConfig, Stats } from "../types";

interface AdminDashboardProps {
  transactions: Transaction[];
  merchants: Merchant[];
  riskConfig: RiskConfig;
  stats: Stats;
  onUpdateRiskConfig: (newConfig: Partial<RiskConfig>) => Promise<void>;
  onClearTransactions: () => Promise<void>;
  onCreateMerchant: (name: string) => Promise<void>;
  onSelectTransaction: (tx: Transaction) => void;
  selectedTx: Transaction | null;
}

export default function AdminDashboard({
  transactions,
  merchants,
  riskConfig,
  stats,
  onUpdateRiskConfig,
  onClearTransactions,
  onCreateMerchant,
  onSelectTransaction,
  selectedTx
}: AdminDashboardProps) {

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [brandFilter, setBrandFilter] = useState<string>("ALL");
  
  // Custom Merchant Creation state
  const [newMerchantName, setNewMerchantName] = useState("");
  const [isCreatingMerchant, setIsCreatingMerchant] = useState(false);
  const [merchantSuccessMsg, setMerchantSuccessMsg] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  // Reveal API Secret Keys toggles
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Local state for Risk slider configurations
  const [localRiskConfig, setLocalRiskConfig] = useState<RiskConfig>({ ...riskConfig });

  // Sync state when props update
  React.useEffect(() => {
    setLocalRiskConfig({ ...riskConfig });
  }, [riskConfig]);

  const toggleRevealSecret = (merchantId: string) => {
    setRevealedSecrets(prev => ({
      ...prev,
      [merchantId]: !prev[merchantId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyMessage("Copied to clipboard!");
    setTimeout(() => setCopyMessage(""), 2000);
  };

  const handleRiskSliderChange = (key: keyof RiskConfig, val: number | boolean) => {
    const updated = { ...localRiskConfig, [key]: val };
    setLocalRiskConfig(updated);
    onUpdateRiskConfig({ [key]: val });
  };

  const handleCreateMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchantName.trim()) return;
    await onCreateMerchant(newMerchantName);
    setNewMerchantName("");
    setMerchantSuccessMsg("Merchant credentials generated successfully!");
    setTimeout(() => setMerchantSuccessMsg(""), 3000);
  };

  // Filter transactions
  const filteredTx = transactions.filter((tx) => {
    const matchesSearch = 
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.cardholderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.cardNumberMasked.includes(searchTerm);

    const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;
    const matchesBrand = brandFilter === "ALL" || tx.cardBrand === brandFilter;

    return matchesSearch && matchesStatus && matchesBrand;
  });

  return (
    <div className="space-y-6 text-slate-900" id="admin-dashboard-section">
      
      {/* Transient Notification Alert (Bypassing native prompt blockages) */}
      {copyMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{copyMessage}</span>
        </div>
      )}

      {/* 1. Aggregate Stats Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition duration-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Settle Volume</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-sans text-slate-900 tracking-tight">
              ${stats.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-0.5">
              Approved transactions volume
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition duration-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Auth Requests</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-sans text-slate-900 tracking-tight">
              {stats.totalCount}
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-0.5">
              Total transaction traffic count
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition duration-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Approval Rate</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-sans text-emerald-600 tracking-tight">
              {stats.approvalRate}%
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-0.5">
              Successful authorized clears
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition duration-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Fraud Block Rate</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-sans text-rose-600 tracking-tight">
              {stats.fraudRate}%
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-0.5">
              Intercepted by risk rules engine
            </p>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Risk Rules Config & Merchant Accounts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sliders Risk Console */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-600" />
              Gateway Security Rules
            </h3>
            <span className="text-[10px] font-mono bg-blue-50 px-2.5 py-0.5 rounded text-blue-600 border border-blue-100">
              Active Scoring
            </span>
          </div>

          <div className="space-y-4 text-xs font-sans">
            {/* Rule 1 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>Fraud Threshold Score</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">{localRiskConfig.fraudThreshold}/100</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={localRiskConfig.fraudThreshold}
                onChange={(e) => handleRiskSliderChange("fraudThreshold", parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
              <p className="text-[10px] text-slate-500">
                Any transaction matching rules that sum above this risk value gets blocked before routing.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>Max Single Charge Limit</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">${localRiskConfig.maxAmount}</span>
              </div>
              <input
                type="range"
                min="500"
                max="25000"
                step="500"
                value={localRiskConfig.maxAmount}
                onChange={(e) => handleRiskSliderChange("maxAmount", parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
              <p className="text-[10px] text-slate-500">
                Transactions larger than this amount trigger immediate risk flags (+45 risk points).
              </p>
            </div>

            {/* Rule 3 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>Issuer Auto-Decline Rate</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">{localRiskConfig.simulatedBankDeclineRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={localRiskConfig.simulatedBankDeclineRate}
                onChange={(e) => handleRiskSliderChange("simulatedBankDeclineRate", parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
              <p className="text-[10px] text-slate-500">
                Randomized decline rate (simulates real-world customer issues like credit limit hits).
              </p>
            </div>

            {/* Toggles */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/50 transition">
                <span className="font-medium text-slate-700">Auto-block High Risk Countries</span>
                <input
                  type="checkbox"
                  checked={localRiskConfig.blockHighRiskCountries}
                  onChange={(e) => handleRiskSliderChange("blockHighRiskCountries", e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>
              <p className="text-[9px] text-slate-500 px-1 leading-normal">
                Strictly blocks transactions originating from Russia, Nigeria, or North Korea (+50 risk points).
              </p>
            </div>
          </div>
        </div>

        {/* Merchant Accounts Manager */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                Virtual Merchant Accounts & API Keys
              </h3>
              <button
                onClick={() => setIsCreatingMerchant(!isCreatingMerchant)}
                className="text-[10px] font-sans px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> New Merchant
              </button>
            </div>

            {/* Merchant Creation Form */}
            {isCreatingMerchant && (
              <form onSubmit={handleCreateMerchantSubmit} className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMerchantName}
                    onChange={(e) => setNewMerchantName(e.target.value)}
                    placeholder="Enter Merchant Business Name (e.g. Travel Express)"
                    className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-1.5 rounded font-semibold transition shadow-sm cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
              </form>
            )}

            {merchantSuccessMsg && (
              <div className="mb-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                {merchantSuccessMsg}
              </div>
            )}

            {/* Merchant key row lists */}
            <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1 custom-scrollbar">
              {merchants.map((merchant) => (
                <div key={merchant.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{merchant.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">ID: {merchant.id}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[10px]">
                    {/* Publishable Key */}
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <div className="truncate text-slate-600">
                        <span className="text-emerald-600 font-bold">pk:</span> {merchant.publishableKey}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(merchant.publishableKey)}
                        className="text-slate-400 hover:text-slate-600 shrink-0 ml-1.5 cursor-pointer"
                        title="Copy Publishable Key"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Secret Key */}
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <div className="truncate text-slate-600">
                        <span className="text-rose-600 font-bold">sk:</span> {
                          revealedSecrets[merchant.id] ? merchant.secretKey : "sk_test_••••••••••••••"
                        }
                      </div>
                      <div className="flex items-center gap-1.5 ml-1.5 shrink-0">
                        <button 
                          onClick={() => toggleRevealSecret(merchant.id)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          title={revealedSecrets[merchant.id] ? "Hide Secret" : "Reveal Secret"}
                        >
                          {revealedSecrets[merchant.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={() => copyToClipboard(merchant.secretKey)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Copy Secret Key"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-[10px] text-slate-500 leading-normal mt-3.5 border-t border-slate-100 pt-2 font-sans">
            Copy the <b>Publishable Key</b> to authenticate payments in your external testing headers, or use the Developer sandbox client below.
          </p>
        </div>
      </div>

      {/* 3. Transaction Logs Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              Secure Settlement Ledger
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Browse historical masking logs and status codes. Click row to drill down.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search ledger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED">APPROVED</option>
              <option value="DECLINED">DECLINED</option>
              <option value="FRAUD_BLOCKED">FRAUD_BLOCKED</option>
              <option value="ERROR">ERROR</option>
            </select>

            {/* Clear btn */}
            <button
              onClick={onClearTransactions}
              className="text-xs px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition flex items-center gap-1 cursor-pointer font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Clear Logs
            </button>
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-sans font-bold text-slate-600">
                <th className="p-3">TX_ID</th>
                <th className="p-3">Merchant</th>
                <th className="p-3">Cardholder</th>
                <th className="p-3">Masked Number</th>
                <th className="p-3">Geo</th>
                <th className="p-3">Amt</th>
                <th className="p-3">Latency</th>
                <th className="p-3">Risk</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500 italic font-sans text-xs bg-slate-50/20">
                    No matching transactions logged in this gateway instance.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => {
                  const statusColors = {
                    APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    DECLINED: "bg-amber-100 text-amber-800 border-amber-200",
                    FRAUD_BLOCKED: "bg-rose-100 text-rose-800 border-rose-200",
                    ERROR: "bg-slate-100 text-slate-800 border-slate-200",
                  };

                  const isSelected = selectedTx?.id === tx.id;

                  return (
                    <tr 
                      key={tx.id} 
                      onClick={() => onSelectTransaction(tx)}
                      className={`hover:bg-slate-50/80 transition cursor-pointer ${
                        isSelected ? "bg-blue-50/40 border-l-2 border-l-blue-600" : ""
                      }`}
                    >
                      <td className="p-3 font-mono text-[10px] text-blue-600 font-semibold">
                        tx_{tx.id.split("_")[1]}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 truncate max-w-[110px]">
                        {tx.merchantName}
                      </td>
                      <td className="p-3 text-slate-700 capitalize truncate max-w-[120px]">
                        {tx.cardholderName}
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[10px]">
                        <span className="text-slate-400 font-bold mr-1">{tx.cardBrand}</span> {tx.cardNumberMasked}
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[10px]">
                        {tx.country}
                      </td>
                      <td className="p-3 font-mono text-slate-900 font-bold">
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-500">
                        {tx.latencyMs}ms
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className={
                          tx.riskScore > 50 ? "text-rose-600 font-bold" : 
                          tx.riskScore > 30 ? "text-amber-600 font-semibold" : "text-emerald-600"
                        }>
                          {tx.riskScore}/100
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${statusColors[tx.status]}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Transaction Drill Down Details */}
        {selectedTx && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-inner">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-200/50">
                <span className="text-xs font-mono text-blue-600 font-bold uppercase">
                  Details: Transaction tx_{selectedTx.id.split("_")[1]}
                </span>
                <span className="text-[9px] font-sans text-slate-500">
                  {new Date(selectedTx.createdAt).toLocaleString()}
                </span>
              </div>
              
              <div className="space-y-1.5 text-xs font-sans text-slate-700">
                <p><span className="text-slate-500 font-mono">Merchant Profile:</span> {selectedTx.merchantName} ({selectedTx.merchantId})</p>
                <p><span className="text-slate-500 font-mono">Client Country:</span> {selectedTx.country} (IP: {selectedTx.ipAddress})</p>
                <p><span className="text-slate-500 font-mono">Card Holder:</span> {selectedTx.cardholderName}</p>
                <p>
                  <span className="text-slate-500 font-mono">Risk Scoring Engine Summary:</span>{" "}
                  <span className={selectedTx.riskScore > 50 ? "text-rose-600 font-bold" : "text-emerald-600 font-semibold"}>
                    {selectedTx.riskScore}/100 Risk points
                  </span>
                </p>

                {selectedTx.riskDetails.length > 0 && (
                  <div className="mt-2 bg-white border border-slate-200 p-2.5 rounded-lg">
                    <span className="text-[10px] font-mono text-amber-600 font-bold block mb-1">Risk Trigger Factors:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-600">
                      {selectedTx.riskDetails.map((det, idx) => (
                        <li key={idx}>{det}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTx.failureReason && (
                  <p className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[10px] font-mono mt-2 font-semibold">
                    <span className="font-bold uppercase">Decline Response Code:</span> {selectedTx.failureReason}
                  </p>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block mb-3 flex items-center gap-1.5 font-bold pb-1 border-b border-slate-200/50">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                Audit Trail Routing Timelines
              </span>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {selectedTx.routingLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-[10px]">
                    <span className="text-slate-600 font-mono">{log.stage}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-500">{log.duration}ms</span>
                      <span className={
                        log.status === "success" ? "text-emerald-600 font-bold" :
                        log.status === "warning" ? "text-amber-600 font-bold" : "text-rose-600 font-bold"
                      }>
                        [{log.status}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
