# msigner: Multi-Chain Ordinals Atomic Swap PSBT Signer

msigner is an open source Bitcoin Ordinals Partially Signed Bitcoin Transactions (PSBT) signer library. It supports atomic swap of inscriptions and provides a simple and secure way to structure Bitcoin transactions for marketplaces.

**GitHub**: [https://github.com/dedooxyz/msigner](https://github.com/dedooxyz/msigner)

## Multi-Chain Support

This fork adds support for **any Bitcoin-like blockchain**:

| Chain | Symbol | Status | SegWit | Taproot | Address Prefix |
|-------|--------|--------|--------|---------|----------------|
| Bitcoin | BTC | ✅ Full | ✅ | ✅ | 1, 3, bc1 |
| Junkcoin | JKC | ✅ Full | ❌ | ❌ | 7, J |
| Bitcoin Classic | XBT | ✅ Full | ❌ | ❌ | 1, 3, bc1 |
| Briskcoin | BKC | ✅ Full | ✅ | ❌ | B |
| Craftcoin | CRC | ✅ Full | ❌ | ❌ | Q, craft1 |
| DogecoinEV | DEV | ✅ Full | ❌ | ❌ | D |
| FRSC | FRSC | ✅ Full | ❌ | ❌ | F |
| Lebowski | LBW | ✅ Full | ❌ | ❌ | 6, lbw1 |
| Litecoin | LTC | ✅ Full | ✅ | ❌ | L, ltc1 |
| Dogecoin | DOGE | ✅ Full | ❌ | ❌ | D |

## Installation

```bash
# Install from GitHub
npm install github:dedooxyz/msigner

# Or add to package.json
"dependencies": {
  "msigner": "github:dedooxyz/msigner"
}
```

## Quick Start

### For Bitcoin (Original Usage)

```typescript
import { SellerSigner, BuyerSigner } from 'msigner';

// Use default Bitcoin mainnet configuration
const listing = await SellerSigner.generateUnsignedListingPSBTBase64({
  network: bitcoin.networks.bitcoin,
  seller: {
    makerFeeBp: 100,
    sellerOrdAddress: 'bc1p...',
    price: 100000, // satoshis
    ordItem: { ... },
    sellerReceiveAddress: 'bc1p...',
  },
});
```

### For Junkcoin

```typescript
import {
  SellerSigner,
  junkcoinMainnet,
  FullnodeRPC,
  StaticFeeProvider,
} from 'msigner';

// Create Junkcoin RPC provider
const rpcProvider = new FullnodeRPC({
  host: 'http://localhost',
  port: 9771,
  user: 'rpcuser',
  pass: 'rpcpass',
});

// Use static fees for chains without mempool.space
const feeProvider = new StaticFeeProvider({
  fastestFee: 10,
  halfHourFee: 5,
  hourFee: 2,
  minimumFee: 1,
});

// Create listing with Junkcoin network
const listing = await SellerSigner.generateUnsignedListingPSBTBase64(
  {
    network: junkcoinMainnet.network,
    seller: {
      makerFeeBp: 100,
      sellerOrdAddress: '7xxxxxxxxxxxxxxxxxxxxxxxxxxxxR4HN',
      price: 100000000, // 1 JKC in satoshis
      ordItem: { ... },
      sellerReceiveAddress: '7xxxxxxxxxxxxxxxxxxxxxxxxxxxxR4HN',
    },
  },
  rpcProvider,
);
```

### Adding a Custom Chain

```typescript
import { createNetwork, SellerSigner } from 'msigner';
import * as bitcoin from 'bitcoinjs-lib';

// Define your chain's network parameters
const myChain = createNetwork({
  name: 'mychain',
  symbol: 'MYC',
  network: {
    messagePrefix: '\x19MyChain Signed Message:\n',
    bech32: '', // Empty for legacy-only chains
    bip32: {
      public: 0x0488b21e,
      private: 0x0488ade4,
    },
    pubKeyHash: 0x1e, // Your chain's address prefix
    scriptHash: 0x05,
    wif: 0x80,
  },
  supportsSegwit: false,
  supportsTaproot: false,
  defaultRpcPort: 12345,
});

// Use with the signer
const listing = await SellerSigner.generateUnsignedListingPSBTBase64(
  { network: myChain.network, seller: { ... } },
  myRpcProvider,
);
```

## Features

- **2-Dummy UTXO algorithm**: Provides maximal protection to the offset of the ordinals
- **Seller-Buyer-friendly API**: SIGHASH_SINGLE|ANYONECANPAY for sellers, SIGHASH_DEFAULT for buyers
- **Trust-minimized PSBT combining**: Zero communication required between seller and buyer
- **Multi-chain support**: Bitcoin, Junkcoin, Briskcoin, Craftcoin, and more
- **Legacy address support**: Works with chains that don't support SegWit or Taproot

## How it Works

As a **seller**:
- Sign a single PSBT using `SIGHASH_SINGLE | ANYONECANPAY`

As a **buyer**:
- Sign a full PSBT using `SIGHASH_DEFAULT`

As a **platform combiner**:
- Verify seller and buyer signatures
- Merge seller and buyer signatures
- Finalize and run mempool acceptance test
- Broadcast the transaction

## API Reference

### Networks

```typescript
import {
  bitcoinMainnet,
  bitcoinTestnet,
  junkcoinMainnet,
  briskcoinMainnet,
  craftcoinMainnet,
  dogecoinEvMainnet,
  frscMainnet,
  lebowskiMainnet,
  litecoinMainnet,
  dogecoinMainnet,
  getNetwork,
  createNetwork,
} from 'msigner';

// Get network by name or symbol
const jkc = getNetwork('junkcoin');  // or 'jkc'
const bkc = getNetwork('briskcoin'); // or 'bkc'
```

### Providers

```typescript
import {
  FullnodeRPC,       // RPC provider for full nodes
  MempoolProvider,   // Mempool.space API provider
  StaticFeeProvider, // Fixed fee rates (for chains without mempool API)
} from 'msigner';
```

### Signers

```typescript
import { SellerSigner, BuyerSigner } from 'msigner';

// Seller operations
SellerSigner.generateUnsignedListingPSBTBase64(listing, rpcProvider);
SellerSigner.verifySignedListingPSBTBase64(req, config);

// Buyer operations
BuyerSigner.selectDummyUTXOs(utxos, itemProvider, rpcProvider);
BuyerSigner.selectPaymentUTXOs(utxos, amount, ...);
BuyerSigner.generateUnsignedBuyingPSBTBase64(listing, feeProvider, rpcProvider);
BuyerSigner.mergeSignedBuyingPSBTBase64(sellerPsbt, buyerPsbt, network);
```

## Development

```bash
# Clone the repository
git clone https://github.com/dedooxyz/msigner.git
cd msigner

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Format code
npm run format
```

## License

Apache 2.0
