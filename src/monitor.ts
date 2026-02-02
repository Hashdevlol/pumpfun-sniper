import WebSocket from 'ws';
import { EventEmitter } from 'events';
import chalk from 'chalk';
import { PublicKey } from '@solana/web3.js';
import { PumpFunToken, PumpFunEvent, WebSocketMessage, TokenScore, AlertData } from './types';
import { Config } from './config';
import { TokenScorer } from './scorer';

const PUMPFUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

export class PumpFunMonitor extends EventEmitter {
  private ws: WebSocket | null = null;
  private config = Config.getInstance();
  private scorer = new TokenScorer();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupErrorHandling();
  }

  public async start(): Promise<void> {
    console.log(chalk.blue('🚀 Starting PumpFun Monitor...'));
    
    const configErrors = this.config.validateConfig();
    if (configErrors.length > 0) {
      throw new Error(`Configuration errors:\n${configErrors.join('\n')}`);
    }

    await this.connect();
    this.setupSubscriptions();
    this.startHeartbeat();
    
    console.log(chalk.green('✅ Monitor started successfully!'));
    console.log(chalk.yellow('Monitoring PumpFun launches...'));
  }

  public stop(): void {
    console.log(chalk.blue('🛑 Stopping monitor...'));
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    console.log(chalk.green('✅ Monitor stopped'));
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.getHeliusWsUrl();
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log(chalk.green('🔗 Connected to Helius WebSocket'));
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', (code: number, reason: string) => {
          console.log(chalk.red(`❌ WebSocket closed: ${code} - ${reason}`));
          this.isConnected = false;
          this.handleReconnect();
        });

        this.ws.on('error', (error: Error) => {
          console.error(chalk.red('🚨 WebSocket error:'), error);
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.ws.on('pong', () => {
          // Handle pong response for heartbeat
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupSubscriptions(): void {
    if (!this.ws || !this.isConnected) return;

    // Subscribe to PumpFun program account changes
    const subscribeMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'programSubscribe',
      params: [
        PUMPFUN_PROGRAM_ID,
        {
          encoding: 'base64',
          commitment: 'confirmed'
        }
      ]
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    console.log(chalk.blue('📡 Subscribed to PumpFun program updates'));

    // Subscribe to logs for more detailed transaction info
    const logsSubscribeMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'logsSubscribe',
      params: [
        {
          mentions: [PUMPFUN_PROGRAM_ID]
        },
        {
          commitment: 'confirmed'
        }
      ]
    };

    this.ws.send(JSON.stringify(logsSubscribeMessage));
    console.log(chalk.blue('📜 Subscribed to PumpFun transaction logs'));
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle subscription confirmations
      if (message.result && typeof message.result === 'number') {
        console.log(chalk.green(`✅ Subscription confirmed: ${message.result}`));
        return;
      }

      // Handle program notifications
      if (message.method === 'programNotification') {
        this.handleProgramNotification(message.params);
      }

      // Handle log notifications
      if (message.method === 'logsNotification') {
        this.handleLogsNotification(message.params);
      }

    } catch (error) {
      console.error(chalk.red('Failed to parse WebSocket message:'), error);
    }
  }

  private async handleProgramNotification(params: any): Promise<void> {
    try {
      const { value } = params;
      const { account, pubkey } = value;

      // Parse account data to extract token information
      const tokenInfo = await this.parseTokenData(account.data, pubkey);
      if (!tokenInfo) return;

      console.log(chalk.cyan(`\n🎯 New token detected: ${tokenInfo.symbol} (${tokenInfo.name})`));
      console.log(chalk.gray(`   Mint: ${tokenInfo.mint}`));
      console.log(chalk.gray(`   Creator: ${tokenInfo.creator}`));

      // Score the token
      const score = await this.scorer.scoreToken(tokenInfo);
      await this.handleScoredToken(tokenInfo, score);

    } catch (error) {
      console.error(chalk.red('Error handling program notification:'), error);
    }
  }

  private async handleLogsNotification(params: any): Promise<void> {
    try {
      const { value } = params;
      const { logs, signature } = value;

      // Parse logs for specific PumpFun events
      const event = this.parseLogsForEvents(logs, signature);
      if (event) {
        this.emit('pumpfun-event', event);
        console.log(chalk.blue(`📈 PumpFun event: ${event.type} for ${event.mint}`));
      }

    } catch (error) {
      console.error(chalk.red('Error handling logs notification:'), error);
    }
  }

  private async parseTokenData(data: [string, string], pubkey: string): Promise<PumpFunToken | null> {
    try {
      // This is a simplified parser - in reality, you'd need to properly
      // decode the account data based on PumpFun's data structure
      
      // For demonstration, we'll create mock token data
      const mockToken: PumpFunToken = {
        mint: pubkey,
        name: `Token${Math.random().toString(36).substring(7)}`,
        symbol: `TKN${Math.random().toString(36).substring(7, 10).toUpperCase()}`,
        creator: new PublicKey(pubkey).toBase58(), // Simplified
        timestamp: Date.now(),
        marketCap: Math.random() * 100000 + 10000,
        liquidity: Math.random() * 50 + 5,
        holders: Math.floor(Math.random() * 100) + 10,
        bondingCurveProgress: Math.random(),
        socialLinks: {
          website: Math.random() > 0.7 ? 'https://example.com' : undefined,
          twitter: Math.random() > 0.6 ? '@example_token' : undefined,
          telegram: Math.random() > 0.5 ? 'https://t.me/example' : undefined
        }
      };

      return mockToken;
    } catch (error) {
      console.error('Failed to parse token data:', error);
      return null;
    }
  }

  private parseLogsForEvents(logs: string[], signature: string): PumpFunEvent | null {
    // Parse logs to identify specific events
    // This is simplified - you'd need to parse actual PumpFun instruction logs
    
    for (const log of logs) {
      if (log.includes('CreateTokenEvent')) {
        return {
          type: 'create',
          mint: signature.substring(0, 44), // Simplified
          timestamp: Date.now(),
          slot: 0
        };
      }
      if (log.includes('BuyEvent')) {
        return {
          type: 'buy',
          mint: signature.substring(0, 44),
          timestamp: Date.now(),
          slot: 0
        };
      }
    }

    return null;
  }

  private async handleScoredToken(token: PumpFunToken, score: TokenScore): Promise<void> {
    const { settings } = this.config;
    
    // Apply filters
    if (token.liquidity < settings.minLiquidity || token.liquidity > settings.maxLiquidity) {
      console.log(chalk.gray(`❌ ${token.symbol}: Liquidity outside range (${token.liquidity} SOL)`));
      return;
    }

    if (token.marketCap < settings.minMarketCap || token.marketCap > settings.maxMarketCap) {
      console.log(chalk.gray(`❌ ${token.symbol}: Market cap outside range ($${token.marketCap})`));
      return;
    }

    if (token.holders < settings.minHolders) {
      console.log(chalk.gray(`❌ ${token.symbol}: Too few holders (${token.holders})`));
      return;
    }

    if (score.total < settings.scoreThreshold) {
      console.log(chalk.gray(`❌ ${token.symbol}: Score too low (${score.total}/100)`));
      return;
    }

    // Display scored token
    this.displayTokenAlert(token, score);

    // Emit alert for high-scoring tokens
    if (score.total >= settings.alertOnScore) {
      const alertData: AlertData = {
        token,
        score,
        event: {
          type: 'create',
          mint: token.mint,
          creator: token.creator,
          timestamp: token.timestamp,
          slot: 0
        },
        timestamp: Date.now()
      };

      this.emit('high-score-alert', alertData);
      console.log(chalk.bgGreen.black(`\n🚨 HIGH SCORE ALERT: ${token.symbol} - Score: ${score.total}/100 🚨\n`));
    }
  }

  private displayTokenAlert(token: PumpFunToken, score: TokenScore): void {
    const riskColor = score.risk === 'LOW' ? 'green' : score.risk === 'MEDIUM' ? 'yellow' : 'red';
    const scoreColor = score.total >= 80 ? 'green' : score.total >= 60 ? 'yellow' : 'red';
    const recommendationColor = score.recommendation === 'BUY' ? 'green' : 
                              score.recommendation === 'WATCH' ? 'yellow' : 'red';

    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan(`🎯 ${token.name} (${token.symbol})`));
    console.log(chalk.gray(`   Mint: ${token.mint}`));
    console.log(chalk.gray(`   Creator: ${token.creator}`));
    console.log(chalk.white(`   Market Cap: $${token.marketCap.toLocaleString()}`));
    console.log(chalk.white(`   Liquidity: ${token.liquidity} SOL`));
    console.log(chalk.white(`   Holders: ${token.holders}`));
    console.log(chalk.white(`   Bonding Progress: ${(token.bondingCurveProgress * 100).toFixed(1)}%`));
    
    console.log(chalk[scoreColor](`\n   📊 SCORE: ${score.total}/100`));
    console.log(chalk.white(`   ├─ Creator History: ${score.breakdown.creatorHistory}/100`));
    console.log(chalk.white(`   ├─ Liquidity: ${score.breakdown.liquidityScore}/100`));
    console.log(chalk.white(`   ├─ Distribution: ${score.breakdown.holderDistribution}/100`));
    console.log(chalk.white(`   └─ Social Signals: ${score.breakdown.socialSignals}/100`));
    
    console.log(chalk[riskColor](`   🎲 Risk: ${score.risk}`));
    console.log(chalk[recommendationColor](`   💡 Recommendation: ${score.recommendation}`));
    
    if (token.socialLinks) {
      console.log(chalk.blue('\n   🌐 Social Links:'));
      if (token.socialLinks.website) console.log(chalk.gray(`      Website: ${token.socialLinks.website}`));
      if (token.socialLinks.twitter) console.log(chalk.gray(`      Twitter: ${token.socialLinks.twitter}`));
      if (token.socialLinks.telegram) console.log(chalk.gray(`      Telegram: ${token.socialLinks.telegram}`));
    }
    
    console.log(chalk.cyan('='.repeat(60)));
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.ping();
      }
    }, 30000); // Send ping every 30 seconds
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(chalk.red('❌ Max reconnection attempts reached. Stopping monitor.'));
      this.emit('error', new Error('Failed to reconnect after maximum attempts'));
      return;
    }

    this.reconnectAttempts++;
    console.log(chalk.yellow(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`));

    setTimeout(async () => {
      try {
        await this.connect();
        this.setupSubscriptions();
        console.log(chalk.green('✅ Reconnected successfully!'));
      } catch (error) {
        console.error(chalk.red('❌ Reconnection failed:'), error);
        this.handleReconnect();
      }
    }, this.reconnectDelay);
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('🚨 Uncaught Exception:'), error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('🚨 Unhandled Rejection at:'), promise, 'reason:', reason);
    });
  }
}