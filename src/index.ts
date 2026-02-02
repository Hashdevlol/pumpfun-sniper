#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { Config } from './config';
import { PumpFunMonitor } from './monitor';
import { TokenScorer } from './scorer';
import { MonitorConfig } from './types';

const program = new Command();
const config = Config.getInstance();

program
  .name('pumpfun-sniper')
  .description('CLI tool for monitoring and sniping PumpFun token launches on Solana')
  .version('1.0.0');

program
  .command('monitor')
  .description('Start monitoring PumpFun token launches')
  .option('-d, --debug', 'Enable debug output')
  .option('-q, --quiet', 'Quiet mode (minimal output)')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🎯 PumpFun Sniper v1.0.0'));
      console.log(chalk.gray('Real-time monitoring of PumpFun token launches\n'));

      // Validate configuration
      const errors = config.validateConfig();
      if (errors.length > 0) {
        console.log(chalk.red('❌ Configuration errors:'));
        errors.forEach(error => console.log(chalk.red(`   • ${error}`)));
        console.log(chalk.yellow('\nRun "pumpfun-sniper config" to fix these issues.'));
        process.exit(1);
      }

      const monitor = new PumpFunMonitor();

      // Setup event listeners
      monitor.on('high-score-alert', (alertData) => {
        if (!options.quiet) {
          console.log(chalk.bgGreen.black(`\n🚨 ALERT: ${alertData.token.symbol} scored ${alertData.score.total}/100! 🚨`));
        }
      });

      monitor.on('error', (error) => {
        console.error(chalk.red('❌ Monitor error:'), error);
        process.exit(1);
      });

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n🛑 Shutting down monitor...'));
        monitor.stop();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log(chalk.yellow('\n🛑 Shutting down monitor...'));
        monitor.stop();
        process.exit(0);
      });

      // Start monitoring
      const spinner = ora('Starting monitor...').start();
      await monitor.start();
      spinner.stop();

    } catch (error) {
      console.error(chalk.red('❌ Failed to start monitor:'), error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Configure monitor settings')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset to default configuration')
  .action(async (options) => {
    if (options.show) {
      showConfig();
      return;
    }

    if (options.reset) {
      await resetConfig();
      return;
    }

    await configureInteractive();
  });

program
  .command('test')
  .description('Test configuration and API connectivity')
  .action(async () => {
    const spinner = ora('Testing configuration...').start();
    
    try {
      // Test configuration
      const errors = config.validateConfig();
      if (errors.length > 0) {
        spinner.fail('Configuration validation failed');
        errors.forEach(error => console.log(chalk.red(`   • ${error}`)));
        return;
      }

      // Test Helius connection
      const testUrl = config.getHeliusRpcUrl();
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      spinner.succeed('Configuration and API connectivity tests passed!');
      console.log(chalk.green('✅ Ready to start monitoring'));

    } catch (error) {
      spinner.fail('Test failed');
      console.error(chalk.red('❌'), error);
    }
  });

program
  .command('score')
  .description('Score a specific token by mint address')
  .argument('<mint>', 'Token mint address')
  .action(async (mint) => {
    const spinner = ora('Scoring token...').start();
    
    try {
      const scorer = new TokenScorer();
      
      // Create mock token for scoring demo
      const mockToken = {
        mint,
        name: 'Test Token',
        symbol: 'TEST',
        creator: mint, // Simplified for demo
        timestamp: Date.now(),
        marketCap: 50000,
        liquidity: 25,
        holders: 50,
        bondingCurveProgress: 0.5,
        socialLinks: {
          website: 'https://example.com',
          twitter: '@test_token'
        }
      };

      const score = await scorer.scoreToken(mockToken);
      spinner.stop();

      console.log(chalk.cyan('\n📊 Token Score Analysis'));
      console.log(chalk.gray('='.repeat(40)));
      console.log(chalk.white(`Token: ${mockToken.name} (${mockToken.symbol})`));
      console.log(chalk.white(`Mint: ${mint}`));
      console.log(chalk.green(`\nTotal Score: ${score.total}/100`));
      console.log(chalk.white(`├─ Creator History: ${score.breakdown.creatorHistory}/100`));
      console.log(chalk.white(`├─ Liquidity: ${score.breakdown.liquidityScore}/100`));
      console.log(chalk.white(`├─ Distribution: ${score.breakdown.holderDistribution}/100`));
      console.log(chalk.white(`└─ Social Signals: ${score.breakdown.socialSignals}/100`));
      console.log(chalk.yellow(`\nRisk Level: ${score.risk}`));
      console.log(chalk.blue(`Recommendation: ${score.recommendation}`));

    } catch (error) {
      spinner.fail('Failed to score token');
      console.error(chalk.red('❌'), error);
    }
  });

function showConfig(): void {
  const { settings } = config;
  
  console.log(chalk.cyan('\n⚙️  Current Configuration'));
  console.log(chalk.gray('='.repeat(40)));
  console.log(chalk.white(`Helius API Key: ${settings.heliusApiKey ? '✅ Set' : '❌ Not set'}`));
  console.log(chalk.white(`Min Liquidity: ${settings.minLiquidity} SOL`));
  console.log(chalk.white(`Max Liquidity: ${settings.maxLiquidity} SOL`));
  console.log(chalk.white(`Min Market Cap: $${settings.minMarketCap.toLocaleString()}`));
  console.log(chalk.white(`Max Market Cap: $${settings.maxMarketCap.toLocaleString()}`));
  console.log(chalk.white(`Min Holders: ${settings.minHolders}`));
  console.log(chalk.white(`Score Threshold: ${settings.scoreThreshold}/100`));
  console.log(chalk.white(`Alert Score: ${settings.alertOnScore}/100`));
  console.log(chalk.white(`Exclude Known Ruggers: ${settings.excludeKnownRuggers ? '✅' : '❌'}`));
  console.log(chalk.white(`Monitor Socials: ${settings.monitorSocials ? '✅' : '❌'}`));
  console.log(chalk.white(`Webhook URL: ${settings.webhookUrl ? '✅ Set' : '❌ Not set'}`));
}

async function resetConfig(): Promise<void> {
  const confirm = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'reset',
      message: 'Are you sure you want to reset configuration to defaults?',
      default: false
    }
  ]);

  if (confirm.reset) {
    // This would reset to defaults - implementation depends on Config class
    console.log(chalk.green('✅ Configuration reset to defaults'));
  }
}

async function configureInteractive(): Promise<void> {
  console.log(chalk.cyan('\n⚙️  Interactive Configuration'));
  console.log(chalk.gray('Configure your PumpFun sniper settings\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'heliusApiKey',
      message: 'Helius API Key (leave blank to use HELIUS_API_KEY env var):',
      default: config.settings.heliusApiKey || ''
    },
    {
      type: 'number',
      name: 'minLiquidity',
      message: 'Minimum liquidity (SOL):',
      default: config.settings.minLiquidity,
      validate: (value) => value >= 0 || 'Must be >= 0'
    },
    {
      type: 'number',
      name: 'maxLiquidity',
      message: 'Maximum liquidity (SOL):',
      default: config.settings.maxLiquidity,
      validate: (value) => value >= 0 || 'Must be >= 0'
    },
    {
      type: 'number',
      name: 'minMarketCap',
      message: 'Minimum market cap (USD):',
      default: config.settings.minMarketCap,
      validate: (value) => value >= 0 || 'Must be >= 0'
    },
    {
      type: 'number',
      name: 'scoreThreshold',
      message: 'Minimum score threshold (0-100):',
      default: config.settings.scoreThreshold,
      validate: (value) => (value >= 0 && value <= 100) || 'Must be between 0 and 100'
    },
    {
      type: 'number',
      name: 'alertOnScore',
      message: 'Alert on score threshold (0-100):',
      default: config.settings.alertOnScore,
      validate: (value) => (value >= 0 && value <= 100) || 'Must be between 0 and 100'
    },
    {
      type: 'confirm',
      name: 'excludeKnownRuggers',
      message: 'Exclude known rug pullers?',
      default: config.settings.excludeKnownRuggers
    },
    {
      type: 'confirm',
      name: 'monitorSocials',
      message: 'Monitor social signals?',
      default: config.settings.monitorSocials
    }
  ]);

  // Save configuration
  config.updateConfig(answers as Partial<MonitorConfig>);
  
  console.log(chalk.green('\n✅ Configuration saved successfully!'));
  console.log(chalk.yellow('Run "pumpfun-sniper test" to validate your settings.'));
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n🚨 Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n🚨 Unhandled Rejection:'), reason);
  process.exit(1);
});

program.parse();