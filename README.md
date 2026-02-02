# 🎯 PumpFun Sniper

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A professional CLI tool for monitoring and analyzing PumpFun token launches on Solana in real-time. Built with TypeScript and powered by Helius RPC for ultra-fast detection and sophisticated scoring algorithms.

## ✨ Features

### 🚀 Real-Time Monitoring
- **WebSocket Integration**: Direct connection to Helius for instant PumpFun launch detection
- **Program Subscription**: Monitors PumpFun program ID `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
- **Transaction Logs**: Detailed analysis of buy/sell events and token creation
- **Auto-Reconnect**: Robust connection handling with automatic reconnection

### 🧠 Advanced Scoring System
- **Multi-Factor Analysis**: Comprehensive scoring based on 4 key metrics
  - **Creator History** (35%): Analyzes dev wallet history, success rate, and rug pull indicators
  - **Liquidity Score** (25%): Evaluates initial liquidity and optimal funding ranges
  - **Holder Distribution** (25%): Assesses holder count and bonding curve progress
  - **Social Signals** (15%): Validates website, Twitter, Telegram, and Discord presence

### 🎨 Beautiful CLI Interface
- **Colored Output**: Rich terminal formatting with chalk
- **Real-Time Alerts**: Instant notifications for high-scoring opportunities
- **Progress Indicators**: Loading spinners and status updates with ora
- **Risk Assessment**: Clear LOW/MEDIUM/HIGH risk categorization

### ⚙️ Flexible Configuration
- **Config File**: JSON-based configuration with sensible defaults
- **Environment Variables**: Secure API key management
- **Interactive Setup**: Guided configuration wizard
- **Threshold Customization**: Adjustable scoring and alert thresholds

### 🛡️ Safety Features
- **Rug Pull Detection**: Identifies known malicious creators
- **Liquidity Filters**: Configurable min/max liquidity ranges
- **Market Cap Limits**: Prevents analysis of micro/macro cap outliers
- **Holder Validation**: Ensures minimum holder requirements

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pumpfun-sniper.git
cd pumpfun-sniper

# Install dependencies
npm install

# Build the project
npm run build

# Install globally (optional)
npm install -g .
```

### Configuration

1. **Get a Helius API Key**: Sign up at [helius.xyz](https://helius.xyz) for free RPC access

2. **Set up environment variables**:
```bash
# Create .env file
echo "HELIUS_API_KEY=your_api_key_here" > .env
```

3. **Configure settings**:
```bash
# Interactive configuration
pumpfun-sniper config

# Or edit config.json directly after first run
```

### Usage

```bash
# Start monitoring (recommended)
pumpfun-sniper monitor

# Test your configuration
pumpfun-sniper test

# Score a specific token
pumpfun-sniper score <mint_address>

# Show current config
pumpfun-sniper config --show

# Reset to defaults
pumpfun-sniper config --reset
```

## 📸 Screenshots

### Real-Time Monitoring
![Monitor Screenshot](./screenshots/monitor.png)
*Live monitoring with real-time scoring and alerts*

### Token Analysis
![Analysis Screenshot](./screenshots/analysis.png)
*Detailed token analysis with breakdown scores*

### Configuration
![Config Screenshot](./screenshots/config.png)
*Interactive configuration setup*

## 🔧 Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `minLiquidity` | Minimum liquidity in SOL | 5 |
| `maxLiquidity` | Maximum liquidity in SOL | 500 |
| `minMarketCap` | Minimum market cap in USD | 10,000 |
| `maxMarketCap` | Maximum market cap in USD | 1,000,000 |
| `minHolders` | Minimum number of holders | 10 |
| `scoreThreshold` | Minimum score to display | 70 |
| `alertOnScore` | Score threshold for alerts | 80 |
| `excludeKnownRuggers` | Filter known malicious creators | true |
| `monitorSocials` | Validate social media presence | true |

## 🏗️ Architecture

```
src/
├── index.ts          # CLI entry point with commander.js
├── monitor.ts        # WebSocket monitoring and event handling
├── scorer.ts         # Token scoring algorithms
├── config.ts         # Configuration management
└── types.ts          # TypeScript type definitions
```

### Key Components

- **`PumpFunMonitor`**: Handles Helius WebSocket connections and real-time event processing
- **`TokenScorer`**: Implements sophisticated scoring algorithms with caching
- **`Config`**: Manages configuration files and environment variables
- **CLI Interface**: Professional command-line interface with multiple commands

## 📊 Scoring Algorithm

The scoring system evaluates tokens across four dimensions:

### 1. Creator History (35% weight)
- **Success Rate**: Percentage of successful token launches
- **Experience**: Number of tokens previously launched
- **Rug Pull History**: Penalty for failed projects
- **Recent Activity**: Bonus for active developers

### 2. Liquidity Analysis (25% weight)
- **Optimal Range**: Rewards tokens in the sweet spot (10-50 SOL)
- **Risk Assessment**: Penalizes extremely low or high liquidity
- **Market Conditions**: Adjusts for current market volatility

### 3. Holder Distribution (25% weight)
- **Holder Count**: More holders indicate better distribution
- **Bonding Curve Progress**: Higher progress = more decentralized ownership
- **Concentration Risk**: Detects whale dominance

### 4. Social Signals (15% weight)
- **Website Verification**: Validates official website presence
- **Twitter Analysis**: Checks account validity and engagement
- **Telegram Community**: Verifies active community presence
- **Discord Integration**: Assesses community building efforts

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Watch mode for development
npm run dev -- monitor

# Build TypeScript
npm run build

# Run built version
npm start
```

### Adding New Features

1. **New Scoring Factors**: Extend the `TokenScorer` class
2. **Additional Filters**: Modify the `MonitorConfig` interface
3. **Enhanced CLI**: Add commands to the commander.js setup
4. **WebSocket Events**: Extend event handling in `PumpFunMonitor`

## 🔐 Security Considerations

- **API Keys**: Never commit API keys to version control
- **Rate Limiting**: Respects Helius rate limits and implements backoff
- **Data Validation**: All input data is validated and sanitized
- **Error Handling**: Comprehensive error handling prevents crashes

## 📋 Requirements

- **Node.js**: Version 18.0.0 or higher
- **Helius API Key**: Free tier available at [helius.xyz](https://helius.xyz)
- **TypeScript**: Included in dependencies
- **Internet Connection**: Required for real-time monitoring

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Helius**: For providing excellent Solana RPC infrastructure
- **PumpFun**: For creating an innovative token launch platform
- **Solana**: For the fast and efficient blockchain technology

## ⚠️ Disclaimer

This tool is for educational and research purposes only. Always conduct your own research before making any investment decisions. Cryptocurrency investments are highly risky and can result in significant losses.

## 🔗 Links

- [Helius RPC](https://helius.xyz) - Solana RPC provider
- [PumpFun](https://pump.fun) - Token launch platform
- [Solana Documentation](https://docs.solana.com) - Official Solana docs

---

<div align="center">

**Built with ❤️ for the Solana community**

[Report Bug](https://github.com/yourusername/pumpfun-sniper/issues) • [Request Feature](https://github.com/yourusername/pumpfun-sniper/issues) • [Documentation](https://github.com/yourusername/pumpfun-sniper/wiki)

</div>