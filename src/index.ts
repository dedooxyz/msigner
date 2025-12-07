/**
 * msigner - Multi-chain Ordinals PSBT Signer
 * 
 * A Bitcoin Ordinals Partially Signed Bitcoin Transactions (PSBT) signer library
 * that supports atomic swap of inscriptions for marketplaces.
 * 
 * Features:
 * - Multi-chain support (Bitcoin, Junkcoin, Litecoin, Dogecoin, etc.)
 * - 2-Dummy UTXO algorithm for ordinal protection
 * - Trust-minimized PSBT combining
 * - Support for P2PKH, P2SH, P2WPKH, and P2TR addresses
 * 
 * @example
 * ```typescript
 * import { SellerSigner, BuyerSigner, junkcoinMainnet, FullnodeRPC, StaticFeeProvider } from '@magiceden-oss/msigner';
 * 
 * // Create configuration for Junkcoin
 * const rpcProvider = new FullnodeRPC({
 *   host: 'http://localhost',
 *   port: 9771,
 *   user: 'rpcuser',
 *   pass: 'rpcpass',
 * });
 * 
 * const feeProvider = new StaticFeeProvider({ fastestFee: 10 });
 * 
 * // Create listing
 * const listing = await SellerSigner.generateUnsignedListingPSBTBase64({
 *   network: junkcoinMainnet.network,
 *   seller: { ... },
 * }, rpcProvider);
 * ```
 */

// =============================================================================
// CORE EXPORTS
// =============================================================================

export * from './signer';
export * from './providers';
export * from './networks';

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export * from './util';
export * from './constant';

// =============================================================================
// VENDOR EXPORTS
// =============================================================================

export { FullnodeRPC, getDefaultRPC, setDefaultRPC, LegacyFullnodeRPC } from './vendors/fullnoderpc';
export { MempoolProvider, StaticFeeProvider } from './vendors/mempool';
export {
    calculateTxBytesFee,
    calculateTxBytesFeeWithRate,
    getSellerOrdOutputValue,
} from './vendors/feeprovider';

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

// Re-export legacy mempool functions
export {
    getFeesRecommended,
    getUtxosByAddress,
    getMempoolTxIds,
    getFees,
} from './vendors/mempool';
