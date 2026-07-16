import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  KeyRound, 
  Cpu, 
  Network, 
  Building2, 
  Receipt, 
  UserCheck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";
import { Transaction, RoutingLog } from "../types";

interface FlowVisualizerProps {
  activeTx: Transaction | null;
  isProcessing: boolean;
  activeStageIndex: number; // 0 to 7
  logs: RoutingLog[];
}

export default function FlowVisualizer({ activeTx, isProcessing, activeStageIndex, logs }: FlowVisualizerProps) {
  // Define the 7 processing stages of a 2D Secure Gateway
  const stages = [
    {
      id: "API_AUTH",
      title: "API Authentication",
      icon: UserCheck,
      color: "bg-blue-500",
      border: "border-blue-500",
      text: "text-blue-500",
      glow: "shadow-blue-500/20",
      description: "Verifies the publishable key and identifies the active merchant account.",
      detailedConcept: "API credentials prevent unauthorized systems from initiating charge requests. The gateway inspects 'pk_test_...' headers to resolve merchant profiles before processing."
    },
    {
      id: "PAYLOAD_DECRYPTION",
      title: "RSA-OAEP Decryption",
      icon: KeyRound,
      color: "bg-purple-500",
      border: "border-purple-500",
      text: "text-purple-500",
      glow: "shadow-purple-500/20",
      description: "Decrypts sensitive card data on the secure server using the private key.",
      detailedConcept: "Sensitive details like primary card numbers (PAN) and CVV are encrypted in the customer's browser with the server's 2048-bit RSA Public Key. This guarantees zero interception risk before decryption."
    },
    {
      id: "RISK_ASSESSMENT",
      title: "Risk & Fraud Scoring",
      icon: ShieldCheck,
      color: "bg-amber-500",
      border: "border-amber-500",
      text: "text-amber-500",
      glow: "shadow-amber-500/20",
      description: "Scans transaction metadata against a real-time risk scoring rule engine.",
      detailedConcept: "Analyzes geographical IP mismatches, card velocity, single-session limits, and watchlist names. Transactions exceeding the risk threshold are instantly blocked before network routing."
    },
    {
      id: "ROUTE_SELECTION",
      title: "Acquirer Routing",
      icon: Cpu,
      color: "bg-indigo-500",
      border: "border-indigo-500",
      text: "text-indigo-500",
      glow: "shadow-indigo-500/20",
      description: "Identifies the card BIN (brand) and routes the request to the target acquirer.",
      detailedConcept: "Directs transaction flows dynamically based on the card brand (Visa, Mastercard, Amex). Smart routing optimizes clearance paths to minimize network fees and transaction latency."
    },
    {
      id: "CLEARING_HANDSHAKE",
      title: "Card Network Link",
      icon: Network,
      color: "bg-sky-500",
      border: "border-sky-500",
      text: "text-sky-500",
      glow: "shadow-sky-500/20",
      description: "Converts payload into ISO 8583 standard frames for clearing interlinks.",
      detailedConcept: "ISO 8583 is the international standard message format for financial transaction exchanges. The gateway packages cardholder credentials and amount details securely for clearing houses."
    },
    {
      id: "ISSUER_VALIDATION",
      title: "Issuing Bank Ledger",
      icon: Building2,
      color: "bg-emerald-500",
      border: "border-emerald-500",
      text: "text-emerald-500",
      glow: "shadow-emerald-500/20",
      description: "Verifies available credit, expiration status, and authenticates the CVV.",
      detailedConcept: "The cardholder's issuing bank accesses their real-time ledger. It validates that the CVV is correct, limits are not exceeded, and marks the fund allocation."
    },
    {
      id: "LEDGER_SETTLEMENT",
      title: "Secure Settlement",
      icon: Receipt,
      color: "bg-teal-500",
      border: "border-teal-500",
      text: "text-teal-500",
      glow: "shadow-teal-500/20",
      description: "Stores final masked transactions in the ledger and returns status.",
      detailedConcept: "Once authorized, the gateway updates merchant balance logs, records a unique retrieval reference (RRN), and returns a secure, masked transaction payload."
    }
  ];

  const [selectedExplainer, setSelectedExplainer] = React.useState<typeof stages[0] | null>(null);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden" id="flow-visualizer-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-sans font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="text-blue-600 w-5 h-5" />
            2D Real-Time Transaction Visualizer
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Watch encrypted payloads migrate through security protocols, risk analyses, and clearing banks.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Gateway</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 text-[10px]">RSA 2048-bit</span>
        </div>
      </div>

      {/* 2D Interactive Node Flow Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 relative mb-6">
        {stages.map((stage, idx) => {
          const isCurrent = isProcessing && activeStageIndex === idx;
          const isPassed = isProcessing && activeStageIndex > idx;
          const isCompletedSuccess = activeTx && activeTx.status === "APPROVED" && !isProcessing;
          const isCompletedFailed = activeTx && activeTx.status !== "APPROVED" && !isProcessing;
          
          // Determine status state styling
          let borderStyle = "border-slate-200 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-300 text-slate-800";
          let iconColor = "text-slate-400";
          let bgIconStyle = "bg-white border border-slate-200/60";
          let textTitleStyle = "text-slate-700 font-medium";

          if (isCurrent) {
            borderStyle = "border-blue-500 shadow-md shadow-blue-500/10 bg-blue-50 text-slate-900 animate-pulse";
            iconColor = "text-white";
            bgIconStyle = stage.color;
            textTitleStyle = "text-blue-900 font-bold";
          } else if (isPassed) {
            borderStyle = "border-emerald-500/35 bg-emerald-50/15 text-slate-800";
            iconColor = "text-emerald-600";
            bgIconStyle = "bg-emerald-100/70 border border-emerald-200/50";
            textTitleStyle = "text-slate-700 font-semibold";
          } else if (isCompletedSuccess) {
            borderStyle = "border-emerald-500/25 bg-emerald-50/10 text-slate-800";
            iconColor = "text-emerald-600";
            bgIconStyle = "bg-emerald-100/60 border border-emerald-200/40";
            textTitleStyle = "text-slate-700 font-semibold";
          } else if (isCompletedFailed) {
            // Highlight where it failed
            const failedAtStage = 
              (activeTx.status === "FRAUD_BLOCKED" && stage.id === "RISK_ASSESSMENT") ||
              (activeTx.status === "DECLINED" && stage.id === "ISSUER_VALIDATION") ||
              (activeTx.status === "ERROR" && (stage.id === "API_AUTH" || stage.id === "PAYLOAD_DECRYPTION"));

            if (failedAtStage) {
              borderStyle = "border-rose-500 shadow-md shadow-rose-500/10 bg-rose-50 text-rose-900";
              iconColor = "text-white";
              bgIconStyle = "bg-rose-600 border border-rose-700";
              textTitleStyle = "text-rose-950 font-bold";
            } else {
              const currentStageIndexObj = stages.findIndex(s => s.id === 
                (activeTx.status === "FRAUD_BLOCKED" ? "RISK_ASSESSMENT" : 
                 activeTx.status === "DECLINED" ? "ISSUER_VALIDATION" : "API_AUTH")
              );
              if (idx < currentStageIndexObj) {
                borderStyle = "border-emerald-500/20 bg-emerald-50/5 text-slate-700";
                iconColor = "text-emerald-600/60";
                bgIconStyle = "bg-emerald-55 border border-emerald-100";
                textTitleStyle = "text-slate-600 font-medium";
              } else {
                borderStyle = "border-slate-100 bg-slate-50/20 opacity-40 text-slate-400";
                iconColor = "text-slate-300";
                bgIconStyle = "bg-slate-50";
                textTitleStyle = "text-slate-400";
              }
            }
          }

          const IconComponent = stage.icon;

          return (
            <div key={stage.id} className="relative flex flex-col justify-between">
              {/* Box */}
              <div 
                className={`flex flex-col p-4 rounded-xl border transition-all duration-300 text-left h-full group relative cursor-pointer ${borderStyle}`}
                onClick={() => setSelectedExplainer(stage)}
              >
                {/* Node Number */}
                <span className="absolute top-2 right-2 font-mono text-[9px] text-slate-400 group-hover:text-slate-600">
                  0{idx + 1}
                </span>

                <div className="flex items-center lg:flex-col lg:items-start gap-3 lg:gap-0 h-full">
                  <div className={`p-2 rounded-lg flex items-center justify-center transition-all ${bgIconStyle} lg:mb-3`}>
                    <IconComponent className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  
                  <div>
                    <h3 className={`text-xs font-sans tracking-tight leading-tight ${textTitleStyle}`}>
                      {stage.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-sans mt-1 line-clamp-2 leading-snug lg:block hidden">
                      {stage.description}
                    </p>
                  </div>
                </div>

                {/* Micro Animated Glow Bar */}
                {isCurrent && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-b-xl"
                    layoutId="activeGlowBar"
                  />
                )}
              </div>

              {/* Connector Arrow (Hidden on mobile grid, shown between elements on desktop lg) */}
              {idx < stages.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-2.5 transform -translate-y-1/2 z-10 text-slate-300">
                  <ArrowRight className={`w-3.5 h-3.5 ${isPassed || isCompletedSuccess ? "text-emerald-500/50" : "text-slate-300"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Explainer Modal/Banner */}
      <AnimatePresence>
        {selectedExplainer && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 relative text-slate-800"
          >
            <button 
              onClick={() => setSelectedExplainer(null)}
              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 cursor-pointer shadow-xs"
            >
              Close [x]
            </button>
            <div className={`p-2.5 rounded-xl h-fit w-fit ${selectedExplainer.color} text-white shadow-sm`}>
              <selectedExplainer.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-900 font-sans">
                  {selectedExplainer.title}
                </h4>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                  Secure Protocol Stage
                </span>
              </div>
              <p className="text-xs text-slate-600 font-sans mt-1 leading-relaxed">
                {selectedExplainer.detailedConcept}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Processing Details */}
      <div className="bg-slate-900 border border-slate-950 rounded-xl p-5 shadow-inner">
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
          <span className="font-semibold text-slate-300">Real-Time Gateway Activity Ledger</span>
          {isProcessing ? (
            <span className="flex items-center gap-1.5 text-blue-400 animate-pulse font-mono lowercase font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              processing...
            </span>
          ) : activeTx ? (
            <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold ${
              activeTx.status === "APPROVED" ? "text-emerald-400" : "text-rose-400"
            }`}>
              {activeTx.status === "APPROVED" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {activeTx.status} (tx_{activeTx.id.split("_")[1]})
            </span>
          ) : (
            <span className="text-slate-550 font-mono text-[10px]">idle / waiting for payment</span>
          )}
        </h3>

        {/* Console / Stack Log Output */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto font-mono text-[11px] text-slate-300 pr-2 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic py-8 text-center font-sans text-xs">
              Submit a card transaction in the terminal to watch cryptography, fraud checks, and clearing networks interact.
            </div>
          ) : (
            logs.map((log, index) => {
              const stageColors = {
                success: "text-emerald-400",
                warning: "text-amber-400",
                failed: "text-rose-400"
              };
              
              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 py-1.5 border-b border-slate-950/40 leading-relaxed"
                >
                  <span className="text-slate-500 shrink-0 select-none">
                    [{log.timestamp.split("T")[1].slice(0, 8)}]
                  </span>
                  <span className={`font-semibold shrink-0 select-none ${stageColors[log.status]}`}>
                    {log.stage.padEnd(20)}
                  </span>
                  <span className="text-slate-400 shrink-0 select-none font-bold">
                    ({log.duration}ms)
                  </span>
                  <span className="text-slate-200">
                    {log.description}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
