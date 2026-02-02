import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { MonitorConfig } from './types';

// Load environment variables
dotenv.config();

const CONFIG_PATH = join(process.cwd(), 'config.json');

const DEFAULT_CONFIG: MonitorConfig = {
  heliusApiKey: process.env.HELIUS_API_KEY,
  minLiquidity: 5, // Minimum 5 SOL liquidity
  maxLiquidity: 500, // Maximum 500 SOL liquidity
  minMarketCap: 10000, // Minimum $10k market cap
  maxMarketCap: 1000000, // Maximum $1M market cap
  minHolders: 10, // Minimum 10 holders
  scoreThreshold: 70, // Minimum score of 70/100
  alertOnScore: 80, // Alert when score >= 80
  excludeKnownRuggers: true,
  monitorSocials: true,
  webhookUrl: process.env.WEBHOOK_URL,
};

export class Config {
  private static instance: Config;
  public settings: MonitorConfig;

  private constructor() {
    this.settings = this.loadConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): MonitorConfig {
    if (existsSync(CONFIG_PATH)) {
      try {
        const configData = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
        return { ...DEFAULT_CONFIG, ...configData };
      } catch (error) {
        console.warn('Failed to parse config.json, using defaults');
        return DEFAULT_CONFIG;
      }
    }
    
    // Create default config file
    this.saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  public saveConfig(config: Partial<MonitorConfig>): void {
    this.settings = { ...this.settings, ...config };
    writeFileSync(CONFIG_PATH, JSON.stringify(this.settings, null, 2));
  }

  public updateConfig(updates: Partial<MonitorConfig>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveConfig(this.settings);
  }

  public validateConfig(): string[] {
    const errors: string[] = [];

    if (!this.settings.heliusApiKey) {
      errors.push('HELIUS_API_KEY environment variable or config.heliusApiKey is required');
    }

    if (this.settings.minLiquidity < 0) {
      errors.push('minLiquidity must be >= 0');
    }

    if (this.settings.maxLiquidity < this.settings.minLiquidity) {
      errors.push('maxLiquidity must be >= minLiquidity');
    }

    if (this.settings.minMarketCap < 0) {
      errors.push('minMarketCap must be >= 0');
    }

    if (this.settings.maxMarketCap < this.settings.minMarketCap) {
      errors.push('maxMarketCap must be >= minMarketCap');
    }

    if (this.settings.scoreThreshold < 0 || this.settings.scoreThreshold > 100) {
      errors.push('scoreThreshold must be between 0 and 100');
    }

    return errors;
  }

  public getHeliusWsUrl(): string {
    if (!this.settings.heliusApiKey) {
      throw new Error('Helius API key not configured');
    }
    return `wss://atlas-mainnet.helius-rpc.com/?api-key=${this.settings.heliusApiKey}`;
  }

  public getHeliusRpcUrl(): string {
    if (!this.settings.heliusApiKey) {
      throw new Error('Helius API key not configured');
    }
    return `https://rpc.helius.xyz/?api-key=${this.settings.heliusApiKey}`;
  }
}