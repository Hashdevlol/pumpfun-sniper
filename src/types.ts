export interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  timestamp: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  bondingCurveProgress: number;
  uri?: string;
  socialLinks?: SocialLinks;
}

export interface SocialLinks {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

export interface TokenScore {
  total: number;
  breakdown: {
    creatorHistory: number;
    liquidityScore: number;
    holderDistribution: number;
    socialSignals: number;
  };
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: 'BUY' | 'WATCH' | 'AVOID';
}

export interface CreatorAnalysis {
  address: string;
  tokensLaunched: number;
  successRate: number;
  averageMarketCap: number;
  rugPullCount: number;
  lastActivity: number;
}

export interface MonitorConfig {
  heliusApiKey?: string;
  minLiquidity: number;
  maxLiquidity: number;
  minMarketCap: number;
  maxMarketCap: number;
  minHolders: number;
  scoreThreshold: number;
  alertOnScore: number;
  excludeKnownRuggers: boolean;
  monitorSocials: boolean;
  webhookUrl?: string;
}

export interface WebSocketMessage {
  type: 'accountInfo' | 'logs' | 'program';
  data: any;
  slot: number;
  timestamp: number;
}

export interface PumpFunEvent {
  type: 'create' | 'buy' | 'sell' | 'complete';
  mint: string;
  creator?: string;
  buyer?: string;
  amount?: number;
  solAmount?: number;
  timestamp: number;
  slot: number;
}

export interface AlertData {
  token: PumpFunToken;
  score: TokenScore;
  event: PumpFunEvent;
  timestamp: number;
}

export interface RPCFilter {
  memcmp: {
    offset: number;
    bytes: string;
  };
}

export interface RawAccountData {
  executable: boolean;
  owner: string;
  lamports: number;
  data: [string, string]; // [base64 data, encoding]
  rentEpoch?: number;
}