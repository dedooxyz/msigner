/**
 * Provider interfaces for multi-chain msigner
 * Abstracts RPC, fee, and UTXO providers for different blockchains
 */

import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import * as bitcoin from 'bitcoinjs-lib';

// =============================================================================
// RPC PROVIDER INTERFACE
// =============================================================================

/**
 * Result of PSBT analysis
 */
export interface IAnalyzePSBTResult {
    inputs: {
        has_utxo: boolean;
        is_final: boolean;
        next: string;
    }[];
    next: string;
}

/**
 * Result of mempool acceptance test
 */
export interface ITestMempoolAcceptResult {
    txid: string;
    wtxid: string;
    allowed: boolean;
    vsize: number;
    fees: {
        base: number;
    };
    'reject-reason': string;
}

/**
 * Verbose transaction result
 */
export interface IGetRawTransactionVerboseResult {
    txid: string;
    hex: string;
    blockhash: string;
    blocktime: number;
    confirmations: number;
    vin: {
        txid: string;
        vout: number;
        scriptSig: {
            asm: string;
            hex: string;
        };
        sequence: number;
        txinwitness?: string[];
    }[];
    vout: {
        value: number;
        n: number;
    }[];
}

/**
 * RPC provider interface for blockchain node communication
 */
export interface IRPCProvider {
    /**
     * Get raw transaction hex
     */
    getrawtransaction(txid: string): Promise<string>;

    /**
     * Get verbose transaction data
     */
    getrawtransactionVerbose(txid: string): Promise<IGetRawTransactionVerboseResult>;

    /**
     * Analyze a PSBT
     */
    analyzepsbt(psbt: string): Promise<IAnalyzePSBTResult>;

    /**
     * Finalize a PSBT and optionally extract the transaction
     */
    finalizepsbt(psbt: string): Promise<{ hex: string; complete: boolean }>;

    /**
     * Test if a raw transaction would be accepted to mempool
     */
    testmempoolaccept(rawtxs: string[]): Promise<ITestMempoolAcceptResult[]>;

    /**
     * Broadcast a raw transaction
     */
    sendrawtransaction(rawtx: string): Promise<string>;

    /**
     * Get mempool transaction IDs
     */
    getrawmempool(): Promise<string[]>;
}

// =============================================================================
// FEE PROVIDER INTERFACE
// =============================================================================

/**
 * Fee recommendations structure
 */
export interface FeesRecommended {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    minimumFee: number;
}

/**
 * Fee rate tiers
 */
export type FeeRateTier = 'fastestFee' | 'halfHourFee' | 'hourFee' | 'minimumFee';

/**
 * Fee provider interface for getting network fees
 */
export interface IFeeProvider {
    /**
     * Get fee rate for a specific tier
     */
    getFees(feeRateTier: FeeRateTier | string): Promise<number>;

    /**
     * Get all recommended fees
     */
    getFeesRecommended(): Promise<FeesRecommended>;
}

// =============================================================================
// UTXO PROVIDER INTERFACE
// =============================================================================

/**
 * UTXO provider interface for getting address UTXOs
 */
export interface IUtxoProvider {
    /**
     * Get UTXOs for an address
     */
    getAddressUtxos(address: string): Promise<AddressTxsUtxo[]>;
}

// =============================================================================
// ITEM PROVIDER INTERFACE (Ordinals/Inscriptions)
// =============================================================================

/**
 * Ordinal item metadata
 */
export interface IOrdItemMeta {
    name: string;
    high_res_img_url?: string;
    status?: string;
    rank?: number;
    attributes?: IOrdItemAttribute[];
}

/**
 * Ordinal item attribute
 */
export interface IOrdItemAttribute {
    trait_type: string;
    value: string;
    status?: string;
    percent?: string;
}

/**
 * Ordinal/Inscription item
 */
export interface IOrdItem {
    // Fixed properties
    id: string;
    contentURI: string;
    contentType: string;
    contentPreviewURI: string;
    sat: number;
    satName: string;
    genesisTransaction: string;
    genesisTransactionBlockTime?: string;
    genesisTransactionBlockHash?: string;
    inscriptionNumber: number;
    meta?: IOrdItemMeta;
    chain: string;
    owner: string;

    // Dynamic properties
    location: string;
    locationBlockHeight?: number;
    locationBlockTime?: string;
    locationBlockHash?: string;
    outputValue: number;
    output: string;
    mempoolTxId?: string;

    // Listing properties
    listed: boolean;
    listedAt?: string;
    listedPrice?: number;
    listedMakerFeeBp?: number;
    listedSellerReceiveAddress?: string;
}

/**
 * Item provider interface for ordinals/inscriptions
 */
export interface IItemProvider {
    /**
     * Get token/inscription by UTXO output
     */
    getTokenByOutput(output: string): Promise<IOrdItem | null>;

    /**
     * Get token/inscription by ID
     */
    getTokenById(tokenId: string): Promise<IOrdItem | null>;
}

// =============================================================================
// FEE PROVIDER INTERFACE (Marketplace fees)
// =============================================================================

/**
 * Marketplace fee provider
 */
export interface IMarketplaceFeeProvider {
    /**
     * Get maker fee in basis points
     */
    getMakerFeeBp(maker: string): Promise<number>;

    /**
     * Get taker fee in basis points
     */
    getTakerFeeBp(taker: string): Promise<number>;
}

// =============================================================================
// COMBINED PROVIDER INTERFACE
// =============================================================================

/**
 * Combined provider for all blockchain operations
 */
export interface IBlockchainProvider {
    rpc: IRPCProvider;
    fees: IFeeProvider;
    utxos: IUtxoProvider;
    items?: IItemProvider;
    marketplaceFees?: IMarketplaceFeeProvider;
}
