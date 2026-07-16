export interface Transaction {
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

export interface RoutingLog {
  stage: string;
  status: "success" | "warning" | "failed";
  duration: number;
  description: string;
  timestamp: string;
}

export interface Merchant {
  id: string;
  name: string;
  publishableKey: string;
  secretKey: string;
  createdAt: string;
}

export interface RiskConfig {
  maxAmount: number;
  blockHighRiskCountries: boolean;
  requireCvvMatch: boolean;
  fraudThreshold: number;
  simulatedBankDeclineRate: number;
}

export interface Stats {
  totalCount: number;
  totalVolume: number;
  approvalRate: number;
  fraudRate: number;
  averageLatencyMs: number;
  brandStats: Record<string, { count: number; volume: number }>;
}

export interface Withdrawal {
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

export interface TreasuryState {
  fiatBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  withdrawals: Withdrawal[];
}

