import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import { PumpFunToken, TokenScore, CreatorAnalysis, SocialLinks } from './types';
import { Config } from './config';

export class TokenScorer {
  private config = Config.getInstance();
  private connection: Connection;
  private creatorCache = new Map<string, CreatorAnalysis>();

  constructor() {
    this.connection = new Connection(this.config.getHeliusRpcUrl());
  }

  public async scoreToken(token: PumpFunToken): Promise<TokenScore> {
    const [
      creatorScore,
      liquidityScore,
      distributionScore,
      socialScore
    ] = await Promise.all([
      this.scoreCreatorHistory(token.creator),
      this.scoreLiquidity(token),
      this.scoreHolderDistribution(token),
      this.scoreSocialSignals(token.socialLinks)
    ]);

    const total = Math.round(
      creatorScore * 0.35 +     // 35% weight on creator history
      liquidityScore * 0.25 +   // 25% weight on liquidity
      distributionScore * 0.25 + // 25% weight on distribution
      socialScore * 0.15        // 15% weight on social signals
    );

    const risk = this.calculateRisk(total, creatorScore);
    const recommendation = this.getRecommendation(total, risk);

    return {
      total,
      breakdown: {
        creatorHistory: creatorScore,
        liquidityScore,
        holderDistribution: distributionScore,
        socialSignals: socialScore
      },
      risk,
      recommendation
    };
  }

  private async scoreCreatorHistory(creator: string): Promise<number> {
    try {
      // Check cache first
      if (this.creatorCache.has(creator)) {
        const analysis = this.creatorCache.get(creator)!;
        return this.calculateCreatorScore(analysis);
      }

      const analysis = await this.analyzeCreator(creator);
      this.creatorCache.set(creator, analysis);
      
      return this.calculateCreatorScore(analysis);
    } catch (error) {
      console.warn(`Failed to analyze creator ${creator}:`, error);
      return 50; // Neutral score on error
    }
  }

  private async analyzeCreator(creator: string): Promise<CreatorAnalysis> {
    try {
      // Get transaction history for creator
      const pubkey = new PublicKey(creator);
      const signatures = await this.connection.getConfirmedSignaturesForAddress2(
        pubkey,
        { limit: 100 }
      );

      // Analyze PumpFun launches by this creator
      let tokensLaunched = 0;
      let successfulLaunches = 0;
      let totalMarketCap = 0;
      let rugPullCount = 0;

      // This would normally involve more complex analysis of transaction data
      // For demo purposes, we'll simulate some analysis
      tokensLaunched = Math.min(signatures.length / 10, 20); // Rough estimate
      successfulLaunches = Math.floor(tokensLaunched * 0.7); // Assume 70% success rate
      totalMarketCap = successfulLaunches * 50000; // Avg 50k market cap
      rugPullCount = tokensLaunched - successfulLaunches;

      const lastActivity = signatures.length > 0 ? 
        signatures[0].blockTime || Date.now() / 1000 : 
        Date.now() / 1000;

      return {
        address: creator,
        tokensLaunched,
        successRate: tokensLaunched > 0 ? successfulLaunches / tokensLaunched : 0,
        averageMarketCap: successfulLaunches > 0 ? totalMarketCap / successfulLaunches : 0,
        rugPullCount,
        lastActivity
      };
    } catch (error) {
      // Return neutral analysis on error
      return {
        address: creator,
        tokensLaunched: 1,
        successRate: 0.5,
        averageMarketCap: 25000,
        rugPullCount: 0,
        lastActivity: Date.now() / 1000
      };
    }
  }

  private calculateCreatorScore(analysis: CreatorAnalysis): number {
    let score = 50; // Base score

    // Success rate scoring (0-40 points)
    score += analysis.successRate * 40;

    // Experience scoring (0-20 points)
    const experienceMultiplier = Math.min(analysis.tokensLaunched / 10, 1);
    score += experienceMultiplier * 20;

    // Rug pull penalty (-50 points max)
    const rugPenalty = Math.min(analysis.rugPullCount * 10, 50);
    score -= rugPenalty;

    // Recent activity bonus (0-10 points)
    const daysSinceActivity = (Date.now() / 1000 - analysis.lastActivity) / (24 * 60 * 60);
    if (daysSinceActivity < 7) {
      score += 10 - (daysSinceActivity / 7) * 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private scoreLiquidity(token: PumpFunToken): number {
    const { minLiquidity, maxLiquidity } = this.config.settings;
    
    if (token.liquidity < minLiquidity) return 0;
    if (token.liquidity > maxLiquidity) return 30; // Too much liquidity can be suspicious

    // Optimal liquidity range scoring
    const optimalRange = [minLiquidity * 2, minLiquidity * 10];
    if (token.liquidity >= optimalRange[0] && token.liquidity <= optimalRange[1]) {
      return 100;
    }

    // Linear scoring within acceptable range
    const normalizedLiquidity = (token.liquidity - minLiquidity) / (maxLiquidity - minLiquidity);
    return Math.round(50 + normalizedLiquidity * 50);
  }

  private scoreHolderDistribution(token: PumpFunToken): number {
    const { minHolders } = this.config.settings;
    
    if (token.holders < minHolders) return 0;

    // Score based on holder count and distribution health
    let score = 0;

    // Holder count scoring (0-60 points)
    if (token.holders >= 100) score += 60;
    else score += (token.holders / 100) * 60;

    // Bonding curve progress scoring (0-40 points)
    // Higher progress means more distributed ownership
    score += token.bondingCurveProgress * 40;

    return Math.min(100, Math.round(score));
  }

  private async scoreSocialSignals(socialLinks?: SocialLinks): Promise<number> {
    if (!socialLinks || !this.config.settings.monitorSocials) {
      return 50; // Neutral score if no social monitoring
    }

    let score = 0;
    const maxPoints = 100;
    let checkedPlatforms = 0;

    // Website presence (25 points)
    if (socialLinks.website) {
      score += await this.checkWebsite(socialLinks.website) ? 25 : 0;
      checkedPlatforms++;
    }

    // Twitter presence (35 points)
    if (socialLinks.twitter) {
      score += await this.checkTwitter(socialLinks.twitter) ? 35 : 0;
      checkedPlatforms++;
    }

    // Telegram presence (25 points)
    if (socialLinks.telegram) {
      score += await this.checkTelegram(socialLinks.telegram) ? 25 : 0;
      checkedPlatforms++;
    }

    // Discord presence (15 points)
    if (socialLinks.discord) {
      score += await this.checkDiscord(socialLinks.discord) ? 15 : 0;
      checkedPlatforms++;
    }

    // If no social links, return lower score
    if (checkedPlatforms === 0) return 20;

    return Math.min(maxPoints, score);
  }

  private async checkWebsite(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async checkTwitter(handle: string): Promise<boolean> {
    // In a real implementation, you'd use Twitter API to check account validity
    // For demo purposes, we'll do a simple URL check
    try {
      const url = handle.startsWith('http') ? handle : `https://twitter.com/${handle}`;
      const response = await axios.head(url, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async checkTelegram(invite: string): Promise<boolean> {
    // Basic telegram link validation
    return invite.includes('t.me/') || invite.includes('telegram.me/');
  }

  private async checkDiscord(invite: string): Promise<boolean> {
    // Basic discord link validation
    return invite.includes('discord.gg/') || invite.includes('discord.com/invite/');
  }

  private calculateRisk(score: number, creatorScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score >= 80 && creatorScore >= 70) return 'LOW';
    if (score >= 60 && creatorScore >= 50) return 'MEDIUM';
    return 'HIGH';
  }

  private getRecommendation(score: number, risk: string): 'BUY' | 'WATCH' | 'AVOID' {
    if (score >= this.config.settings.alertOnScore && risk === 'LOW') return 'BUY';
    if (score >= this.config.settings.scoreThreshold) return 'WATCH';
    return 'AVOID';
  }

  public clearCache(): void {
    this.creatorCache.clear();
  }
}