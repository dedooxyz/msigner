/**
 * Legacy interfaces - Re-exports from providers.ts
 * @deprecated Use imports from './providers' instead
 */

// Re-export all provider interfaces for backward compatibility
export {
  IOrdItem,
  IOrdItemMeta,
  IOrdItemAttribute,
  IItemProvider,
  IMarketplaceFeeProvider,
  IRPCProvider,
  IFeeProvider,
  IUtxoProvider,
  IAnalyzePSBTResult,
  ITestMempoolAcceptResult,
  IGetRawTransactionVerboseResult,
  FeesRecommended,
  FeeRateTier,
} from './providers';

// Re-export signer interfaces
export {
  IListingState,
  IOrdAPIPostPSBTBuying,
  IOrdAPIPostPSBTListing,
  WitnessUtxo,
  InvalidArgumentError,
} from './signer';

// Re-export utility types
export type { MappedUtxo } from './util';

// Legacy type aliases for backward compatibility
/** @deprecated Use IMarketplaceFeeProvider instead */
export type FeeProvider = import('./providers').IMarketplaceFeeProvider;

/** @deprecated Use IItemProvider instead */
export type ItemProvider = import('./providers').IItemProvider;

// Legacy utxo type
import { TxStatus } from '@mempool/mempool.js/lib/interfaces/bitcoin/transactions';
import * as bitcoin from 'bitcoinjs-lib';

/** @deprecated Use MappedUtxo from './util' instead */
export interface utxo {
  txid: string;
  vout: number;
  value: number;
  status: TxStatus;
  tx: bitcoin.Transaction;
}
