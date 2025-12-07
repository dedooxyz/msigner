/**
 * Full node RPC provider implementation
 * Instance-based RPC client for multi-chain support
 */

import { RPCClient } from 'rpc-bitcoin';
import {
  IRPCProvider,
  IAnalyzePSBTResult,
  ITestMempoolAcceptResult,
  IGetRawTransactionVerboseResult,
} from '../providers';
import { RPCConfig } from '../networks';

/**
 * RPC configuration with optional timeout
 */
export interface FullnodeRPCConfig extends RPCConfig {
  timeout?: number;
}

/**
 * Full node RPC provider
 * Instance-based client that implements IRPCProvider
 */
export class FullnodeRPC implements IRPCProvider {
  private client: RPCClient;
  private config: FullnodeRPCConfig;

  constructor(config: FullnodeRPCConfig) {
    this.config = config;
    this.client = new RPCClient({
      url: config.host,
      port: config.port,
      user: config.user,
      pass: config.pass,
      timeout: config.timeout ?? 120000,
    });
  }

  /**
   * Create a new FullnodeRPC instance from environment variables
   * Legacy support for existing code
   */
  static fromEnv(): FullnodeRPC {
    return new FullnodeRPC({
      host: process.env.BITCOIN_RPC_HOST || 'http://localhost',
      port: Number(process.env.BITCOIN_RPC_PORT ?? 8332),
      user: process.env.BITCOIN_RPC_USER || '__cookie__',
      pass: process.env.BITCOIN_RPC_PASS || '',
      timeout: Number(process.env.BITCOIN_RPC_TIMEOUT ?? 120000),
    });
  }

  /**
   * Get raw transaction hex
   */
  async getrawtransaction(txid: string): Promise<string> {
    const res = await this.client.getrawtransaction({ txid });
    return res as string;
  }

  /**
   * Get verbose transaction data
   */
  async getrawtransactionVerbose(
    txid: string,
  ): Promise<IGetRawTransactionVerboseResult> {
    const res = await this.client.getrawtransaction({ txid, verbose: true });
    return res as IGetRawTransactionVerboseResult;
  }

  /**
   * Analyze a PSBT
   */
  async analyzepsbt(psbt: string): Promise<IAnalyzePSBTResult> {
    const res = await this.client.analyzepsbt({ psbt });
    return res as IAnalyzePSBTResult;
  }

  /**
   * Finalize a PSBT
   */
  async finalizepsbt(
    psbt: string,
  ): Promise<{ hex: string; complete: boolean }> {
    const res = await this.client.finalizepsbt({ psbt, extract: true });
    return res as { hex: string; complete: boolean };
  }

  /**
   * Test mempool acceptance
   */
  async testmempoolaccept(rawtxs: string[]): Promise<ITestMempoolAcceptResult[]> {
    const res = await this.client.testmempoolaccept({ rawtxs });
    return res as ITestMempoolAcceptResult[];
  }

  /**
   * Send raw transaction
   */
  async sendrawtransaction(rawtx: string): Promise<string> {
    const res = await this.client.sendrawtransaction({ hexstring: rawtx });
    return res as string;
  }

  /**
   * Get raw mempool
   */
  async getrawmempool(): Promise<string[]> {
    const res = await this.client.getrawmempool();
    return res;
  }

  /**
   * Get the underlying RPC client for custom calls
   */
  getClient(): RPCClient {
    return this.client;
  }

  /**
   * Get the current configuration
   */
  getConfig(): FullnodeRPCConfig {
    return { ...this.config };
  }
}

// =============================================================================
// LEGACY SINGLETON SUPPORT (for backward compatibility)
// =============================================================================

let defaultInstance: FullnodeRPC | undefined;

/**
 * Get the default RPC instance (legacy support)
 * @deprecated Use new FullnodeRPC(config) instead
 */
export function getDefaultRPC(): FullnodeRPC {
  if (!defaultInstance) {
    defaultInstance = FullnodeRPC.fromEnv();
  }
  return defaultInstance;
}

/**
 * Set the default RPC instance
 * @deprecated Use new FullnodeRPC(config) instead
 */
export function setDefaultRPC(instance: FullnodeRPC): void {
  defaultInstance = instance;
}

// Legacy static exports (deprecated, for backward compatibility)
export const LegacyFullnodeRPC = {
  getrawtransaction: (txid: string) => getDefaultRPC().getrawtransaction(txid),
  getrawtransactionVerbose: (txid: string) =>
    getDefaultRPC().getrawtransactionVerbose(txid),
  analyzepsbt: (psbt: string) => getDefaultRPC().analyzepsbt(psbt),
  finalizepsbt: (psbt: string) => getDefaultRPC().finalizepsbt(psbt),
  testmempoolaccept: (rawtxs: string[]) =>
    getDefaultRPC().testmempoolaccept(rawtxs),
  sendrawtransaction: (rawtx: string) =>
    getDefaultRPC().sendrawtransaction(rawtx),
  getrawmempool: () => getDefaultRPC().getrawmempool(),
};
