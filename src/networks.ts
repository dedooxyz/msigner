/**
 * Multi-chain network configurations for msigner
 * Supports Bitcoin, Junkcoin, and other Bitcoin-like chains
 * 
 * Chain configurations sourced from: -referensi-chainconstant/blockchains/built-in/
 */

import * as bitcoin from 'bitcoinjs-lib';

/**
 * Chain network configuration interface
 */
export interface ChainNetwork {
    name: string;
    symbol: string;
    network: bitcoin.Network;
    // Feature flags
    supportsSegwit: boolean;
    supportsTaproot: boolean;
    // Optional API endpoints
    mempoolUrl?: string;
    ordinalsUrl?: string;
    explorerUrl?: string;
    apiUrl?: string;
    // RPC configuration (optional defaults)
    defaultRpcPort?: number;
    // Fee configuration
    minimumFee?: number;
    dustLimit?: number;
}

/**
 * RPC connection configuration
 */
export interface RPCConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    timeout?: number;
}

// =============================================================================
// STANDARD BIP32 KEYS (used by most chains)
// =============================================================================

const STANDARD_BIP32 = {
    public: 0x0488b21e,   // xpub
    private: 0x0488ade4,  // xprv
};

// =============================================================================
// BITCOIN NETWORKS
// =============================================================================

export const bitcoinMainnet: ChainNetwork = {
    name: 'bitcoin',
    symbol: 'BTC',
    network: bitcoin.networks.bitcoin,
    supportsSegwit: true,
    supportsTaproot: true,
    mempoolUrl: 'https://mempool.space',
    ordinalsUrl: 'https://ordinals.com',
    defaultRpcPort: 8332,
};

export const bitcoinTestnet: ChainNetwork = {
    name: 'bitcoin-testnet',
    symbol: 'tBTC',
    network: bitcoin.networks.testnet,
    supportsSegwit: true,
    supportsTaproot: true,
    mempoolUrl: 'https://mempool.space/testnet',
    ordinalsUrl: 'https://explorer-signet.openordex.org',
    defaultRpcPort: 18332,
};

// =============================================================================
// JUNKCOIN (Legacy only - no SegWit/Taproot)
// Source: -referensi-chainconstant/blockchains/built-in/junkcoin.ts
// =============================================================================

export const junkcoinMainnet: ChainNetwork = {
    name: 'junkcoin',
    symbol: 'JKC',
    network: {
        messagePrefix: '\x19Junkcoin Signed Message:\n',
        bech32: 'jc',
        bip32: STANDARD_BIP32,
        pubKeyHash: 16,   // 'J' prefix
        scriptHash: 5,
        wif: 144,         // 'N' prefix for private keys
    },
    supportsSegwit: false,
    supportsTaproot: false,
    apiUrl: 'https://junk-api.s3na.xyz',
    explorerUrl: 'https://jkc-explorer.dedoo.xyz',
    ordinalsUrl: 'https://ord.junkiewally.xyz',
    defaultRpcPort: 9771,
    minimumFee: 100,
    dustLimit: 546,
};

// =============================================================================
// BITCOIN CLASSIC (Legacy only)
// Source: -referensi-chainconstant/blockchains/built-in/bitcoin-classic.ts
// =============================================================================

export const bitcoinClassicMainnet: ChainNetwork = {
    name: 'bitcoin-classic',
    symbol: 'XBT',
    network: {
        messagePrefix: '\x19Bitcoin Classic Signed Message:\n',
        bech32: 'bc',
        bip32: STANDARD_BIP32,
        pubKeyHash: 0,    // '1' prefix (same as Bitcoin)
        scriptHash: 5,
        wif: 128,
    },
    supportsSegwit: false,
    supportsTaproot: false,
    apiUrl: 'https://xbt-api.s3na.xyz',
    explorerUrl: 'https://xbt-explorer.s3na.xyz',
    ordinalsUrl: 'https://ord.classicxbt.com',
    defaultRpcPort: 8332,
    minimumFee: 100,
    dustLimit: 546,
};

// =============================================================================
// BRISKCOIN (SegWit supported)
// Source: -referensi-chainconstant/blockchains/built-in/briskcoin.ts
// =============================================================================

export const briskcoinMainnet: ChainNetwork = {
    name: 'briskcoin',
    symbol: 'BKC',
    network: {
        messagePrefix: '\x19Briskcoin Signed Message:\n',
        bech32: 'bc',
        bip32: STANDARD_BIP32,
        pubKeyHash: 25,   // 0x19 - 'B' prefix
        scriptHash: 33,   // 0x21
        wif: 153,         // 0x99
    },
    supportsSegwit: true,
    supportsTaproot: false,
    apiUrl: 'https://bkc-api.s3na.xyz',
    explorerUrl: 'https://bkc-explorer.dedoo.xyz',
    defaultRpcPort: 8332,
    minimumFee: 100,
    dustLimit: 546,
};

// =============================================================================
// CRAFTCOIN (Legacy only)
// Source: -referensi-chainconstant/blockchains/built-in/craftcoin.ts
// =============================================================================

export const craftcoinMainnet: ChainNetwork = {
    name: 'craftcoin',
    symbol: 'CRC',
    network: {
        messagePrefix: '\x19Craftcoin Signed Message:\n',
        bech32: 'crc',
        bip32: STANDARD_BIP32,
        pubKeyHash: 57,   // 'Q' or 'R' prefix
        scriptHash: 5,
        wif: 185,
    },
    supportsSegwit: false,
    supportsTaproot: false,
    apiUrl: 'https://crc-api.s3na.xyz',
    explorerUrl: 'https://crc-explorer.dedoo.xyz',
    ordinalsUrl: 'https://ord.craftcoin.xyz',
    defaultRpcPort: 8332,
    minimumFee: 100,
    dustLimit: 546,
};

// =============================================================================
// DOGECOINEV (Legacy only)
// Source: -referensi-chainconstant/blockchains/built-in/dogecoinev.ts
// =============================================================================

export const dogecoinEvMainnet: ChainNetwork = {
    name: 'dogecoinev',
    symbol: 'DEV',
    network: {
        messagePrefix: '\x19DogecoinEV Signed Message:\n',
        bech32: 'dev',
        bip32: STANDARD_BIP32,
        pubKeyHash: 30,   // 'D' prefix
        scriptHash: 22,
        wif: 158,
    },
    supportsSegwit: false,
    supportsTaproot: false,
    apiUrl: 'https://dev-api.s3na.xyz',
    explorerUrl: 'https://dev-explorer.dedoo.xyz',
    defaultRpcPort: 8332,
    minimumFee: 100,
    dustLimit: 546,
};

// =============================================================================
// FRSC - Federal Reserve System Coin (Legacy only)
// Source: -referensi-chainconstant/blockchains/built-in/frsc.ts
// =============================================================================

export const frscMainnet: ChainNetwork = {
    name: 'frsc',
    symbol: 'FRSC',
    network: {
        messagePrefix: '\x19Federal Reserve System Coin Signed Message:\n',
        bech32: 'frsc',
        bip32: STANDARD_BIP32,
        pubKeyHash: 48,   // 'F' prefix
        scriptHash: 176,
        wif: 176,
    },
    supportsSegwit: false,
    supportsTaproot: false,
    apiUrl: 'https://frsc-api.s3na.xyz',
    explorerUrl: 'https://frsc-explorer.dedoo.xyz',
    defaultRpcPort: 8332,
    minimumFee: 100,
    dustLimit: 546,
};

// =============================================================================
// LEBOWSKI (Legacy only)
// Source: -referensi-chainconstant/blockchains/built-in/lebowski.ts
// =============================================================================

export const lebowskiMainnet: ChainNetwork = {
    name: 'lebowski',
    symbol: 'LBW',
    network: {
        messagePrefix: '\x19Lebowski Signed Message:\n',
        bech32: 'lbw',
        bip32: STANDARD_BIP32,
        pubKeyHash: 12,   // 'B' or '6' prefix
        scriptHash: 8,
        wif: 140,
    },
    supportsSegwit: false,
    supportsTaproot: false,
    apiUrl: 'https://lbw-api.s3na.xyz',
    explorerUrl: 'https://lbw-explorer.dedoo.xyz',
    ordinalsUrl: 'https://ord.lebowski.com',
    defaultRpcPort: 8332,
    minimumFee: 100,
    dustLimit: 546,
};

// =============================================================================
// LITECOIN (SegWit supported)
// =============================================================================

export const litecoinMainnet: ChainNetwork = {
    name: 'litecoin',
    symbol: 'LTC',
    network: {
        messagePrefix: '\x19Litecoin Signed Message:\n',
        bech32: 'ltc',
        bip32: {
            public: 0x019da462,
            private: 0x019d9cfe,
        },
        pubKeyHash: 0x30, // 48 = 'L' prefix
        scriptHash: 0x32, // 50
        wif: 0xb0,        // 176
    },
    supportsSegwit: true,
    supportsTaproot: false,
    mempoolUrl: 'https://litecoinspace.org',
    defaultRpcPort: 9332,
};

// =============================================================================
// DOGECOIN (Legacy only)
// =============================================================================

export const dogecoinMainnet: ChainNetwork = {
    name: 'dogecoin',
    symbol: 'DOGE',
    network: {
        messagePrefix: '\x19Dogecoin Signed Message:\n',
        bech32: '',
        bip32: {
            public: 0x02facafd,
            private: 0x02fac398,
        },
        pubKeyHash: 0x1e, // 30 = 'D' prefix
        scriptHash: 0x16, // 22
        wif: 0x9e,        // 158
    },
    supportsSegwit: false,
    supportsTaproot: false,
    defaultRpcPort: 22555,
};

// =============================================================================
// NETWORK REGISTRY
// =============================================================================

export const NETWORKS: Record<string, ChainNetwork> = {
    // Bitcoin
    bitcoin: bitcoinMainnet,
    'bitcoin-mainnet': bitcoinMainnet,
    'bitcoin-testnet': bitcoinTestnet,
    testnet: bitcoinTestnet,

    // Junkcoin
    junkcoin: junkcoinMainnet,
    'junkcoin-mainnet': junkcoinMainnet,
    jkc: junkcoinMainnet,

    // Bitcoin Classic
    'bitcoin-classic': bitcoinClassicMainnet,
    xbt: bitcoinClassicMainnet,

    // Briskcoin
    briskcoin: briskcoinMainnet,
    bkc: briskcoinMainnet,

    // Craftcoin
    craftcoin: craftcoinMainnet,
    crc: craftcoinMainnet,

    // DogecoinEV
    dogecoinev: dogecoinEvMainnet,
    dev: dogecoinEvMainnet,

    // FRSC
    frsc: frscMainnet,

    // Lebowski
    lebowski: lebowskiMainnet,
    lbw: lebowskiMainnet,

    // Litecoin
    litecoin: litecoinMainnet,
    'litecoin-mainnet': litecoinMainnet,
    ltc: litecoinMainnet,

    // Dogecoin
    dogecoin: dogecoinMainnet,
    'dogecoin-mainnet': dogecoinMainnet,
    doge: dogecoinMainnet,
};

/**
 * Get a network configuration by name
 * @param name Network name (e.g., 'bitcoin', 'junkcoin', 'briskcoin')
 * @returns ChainNetwork configuration
 * @throws Error if network not found
 */
export function getNetwork(name: string): ChainNetwork {
    const network = NETWORKS[name.toLowerCase()];
    if (!network) {
        throw new Error(
            `Unknown network: ${name}. Available: ${Object.keys(NETWORKS).join(', ')}`,
        );
    }
    return network;
}

/**
 * Create a custom network configuration
 * @param config Partial network configuration
 * @returns Complete ChainNetwork
 */
export function createNetwork(
    config: Partial<ChainNetwork> & { name: string; symbol: string; network: bitcoin.Network },
): ChainNetwork {
    return {
        supportsSegwit: false,
        supportsTaproot: false,
        minimumFee: 100,
        dustLimit: 546,
        ...config,
    };
}

/**
 * Get all available network names
 */
export function getAvailableNetworks(): string[] {
    return [...new Set(Object.values(NETWORKS).map(n => n.name))];
}
