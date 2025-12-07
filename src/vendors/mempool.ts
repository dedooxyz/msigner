/**
 * Mempool provider implementation
 * Configurable mempool.space API client for multi-chain support
 */

import mempoolJS from '@mempool/mempool.js';
import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import { IFeeProvider, IUtxoProvider, FeesRecommended, FeeRateTier } from '../providers';

/**
 * Mempool provider configuration
 */
export interface MempoolProviderConfig {
  hostname: string;
  network?: string;
}

/**
 * Mempool.space API provider
 * Implements IFeeProvider and IUtxoProvider
 */
export class MempoolProvider implements IFeeProvider, IUtxoProvider {
  private api: ReturnType<typeof mempoolJS>['bitcoin'];
  private config: MempoolProviderConfig;

  constructor(config: MempoolProviderConfig) {
    this.config = config;
    const client = mempoolJS({
      hostname: config.hostname.replace(/^https?:\/\//, ''),
      network: config.network,
    });
    this.api = client.bitcoin;
  }

  /**
   * Create a mempool provider for Bitcoin mainnet
   */
  static bitcoin(): MempoolProvider {
    return new MempoolProvider({
      hostname: 'mempool.space',
      network: 'mainnet',
    });
  }

  /**
   * Create a mempool provider for Bitcoin testnet
   */
  static bitcoinTestnet(): MempoolProvider {
    return new MempoolProvider({
      hostname: 'mempool.space',
      network: 'testnet',
    });
  }

  /**
   * Create a mempool provider for Litecoin
   */
  static litecoin(): MempoolProvider {
    return new MempoolProvider({
      hostname: 'litecoinspace.org',
    });
  }

  /**
   * Get fee rate for a specific tier
   */
  async getFees(feeRateTier: FeeRateTier | string): Promise<number> {
    const res = await this.getFeesRecommended();
    switch (feeRateTier) {
      case 'fastestFee':
        return res.fastestFee;
      case 'halfHourFee':
        return res.halfHourFee;
      case 'hourFee':
        return res.hourFee;
      case 'minimumFee':
        return res.minimumFee;
      default:
        return res.hourFee;
    }
  }

  /**
   * Get all recommended fees
   */
  async getFeesRecommended(): Promise<FeesRecommended> {
    return await this.api.fees.getFeesRecommended();
  }

  /**
   * Get UTXOs for an address
   */
  async getAddressUtxos(address: string): Promise<AddressTxsUtxo[]> {
    return await this.api.addresses.getAddressTxsUtxo({ address });
  }

  /**
   * Get mempool transaction IDs
   */
  async getMempoolTxIds(): Promise<string[]> {
    return await this.api.mempool.getMempoolTxids();
  }

  /**
   * Get the configuration
   */
  getConfig(): MempoolProviderConfig {
    return { ...this.config };
  }
}

// =============================================================================
// STATIC FEE PROVIDER (for chains without mempool.space)
// =============================================================================

/**
 * Static fee provider for chains without a mempool API
 * Returns fixed fee rates
 */
export class StaticFeeProvider implements IFeeProvider {
  private fees: FeesRecommended;

  constructor(fees: Partial<FeesRecommended> = {}) {
    this.fees = {
      fastestFee: fees.fastestFee ?? 20,
      halfHourFee: fees.halfHourFee ?? 10,
      hourFee: fees.hourFee ?? 5,
      minimumFee: fees.minimumFee ?? 1,
    };
  }

  async getFees(feeRateTier: FeeRateTier | string): Promise<number> {
    switch (feeRateTier) {
      case 'fastestFee':
        return this.fees.fastestFee;
      case 'halfHourFee':
        return this.fees.halfHourFee;
      case 'hourFee':
        return this.fees.hourFee;
      case 'minimumFee':
        return this.fees.minimumFee;
      default:
        return this.fees.hourFee;
    }
  }

  async getFeesRecommended(): Promise<FeesRecommended> {
    return this.fees;
  }

  /**
   * Update fee rates
   */
  setFees(fees: Partial<FeesRecommended>): void {
    this.fees = { ...this.fees, ...fees };
  }
}

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

let defaultMempoolProvider: MempoolProvider | undefined;

/**
 * Get the default mempool provider (legacy support)
 * @deprecated Use new MempoolProvider(config) instead
 */
function getDefaultMempoolProvider(): MempoolProvider {
  if (!defaultMempoolProvider) {
    const network = process.env.BTC_NETWORK || 'mainnet';
    defaultMempoolProvider = new MempoolProvider({
      hostname: 'mempool.space',
      network,
    });
  }
  return defaultMempoolProvider;
}

/**
 * Legacy exports for backward compatibility
 */
export const mempoolBitcoin = {
  get fees() {
    return getDefaultMempoolProvider()['api'].fees;
  },
  get addresses() {
    return getDefaultMempoolProvider()['api'].addresses;
  },
  get mempool() {
    return getDefaultMempoolProvider()['api'].mempool;
  },
};

export async function getFeesRecommended() {
  return getDefaultMempoolProvider().getFeesRecommended();
}

export async function getUtxosByAddress(address: string) {
  return getDefaultMempoolProvider().getAddressUtxos(address);
}

export async function getMempoolTxIds() {
  return getDefaultMempoolProvider().getMempoolTxIds();
}

export async function getFees(feeRateTier: string) {
  return getDefaultMempoolProvider().getFees(feeRateTier);
}
