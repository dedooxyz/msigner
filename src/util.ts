/**
 * Utility functions for msigner
 * Chain-agnostic helpers
 */

import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import * as bitcoin from 'bitcoinjs-lib';
import { IRPCProvider } from './providers';
import { getDefaultRPC } from './vendors/fullnoderpc';

/**
 * UTXO with transaction data
 */
export interface MappedUtxo {
  txid: string;
  vout: number;
  value: number;
  status: AddressTxsUtxo['status'];
  tx: bitcoin.Transaction;
}

/**
 * Convert public key to x-only format (for Taproot)
 */
export const toXOnly = (pubKey: Buffer): Buffer =>
  pubKey.length === 32 ? pubKey : pubKey.subarray(1, 33);

/**
 * Convert satoshis to BTC
 */
export const satToBtc = (sat: number): number => sat / 100_000_000;

/**
 * Convert BTC to satoshis
 */
export const btcToSats = (btc: number): number => btc * 100_000_000;

/**
 * Generate txid from hash buffer (reverse byte order)
 */
export function generateTxidFromHash(hash: Buffer): string {
  return Buffer.from(hash).reverse().toString('hex');
}

/**
 * Map mempool UTXOs to include transaction data
 * @param utxosFromMempool UTXOs from mempool API
 * @param rpcProvider RPC provider to fetch transaction data (optional, uses default if not provided)
 */
export async function mapUtxos(
  utxosFromMempool: AddressTxsUtxo[],
  rpcProvider?: IRPCProvider,
): Promise<MappedUtxo[]> {
  const rpc = rpcProvider ?? getDefaultRPC();
  const ret: MappedUtxo[] = [];

  for (const utxoFromMempool of utxosFromMempool) {
    const txHex = await rpc.getrawtransaction(utxoFromMempool.txid);
    ret.push({
      txid: utxoFromMempool.txid,
      vout: utxoFromMempool.vout,
      value: utxoFromMempool.value,
      status: utxoFromMempool.status,
      tx: bitcoin.Transaction.fromHex(txHex),
    });
  }

  return ret;
}

/**
 * Check if an address is a P2SH address
 * @param address Address to check
 * @param network Bitcoin network configuration
 */
export function isP2SHAddress(
  address: string,
  network: bitcoin.Network,
): boolean {
  try {
    const { version, hash } = bitcoin.address.fromBase58Check(address);
    return version === network.scriptHash && hash.length === 20;
  } catch (error) {
    return false;
  }
}

/**
 * Check if an address is a P2PKH address
 * @param address Address to check
 * @param network Bitcoin network configuration
 */
export function isP2PKHAddress(
  address: string,
  network: bitcoin.Network,
): boolean {
  try {
    const { version, hash } = bitcoin.address.fromBase58Check(address);
    return version === network.pubKeyHash && hash.length === 20;
  } catch (error) {
    return false;
  }
}

/**
 * Check if an address is a legacy address (P2PKH or P2SH)
 * @param address Address to check
 * @param network Bitcoin network configuration
 */
export function isLegacyAddress(
  address: string,
  network: bitcoin.Network,
): boolean {
  return isP2PKHAddress(address, network) || isP2SHAddress(address, network);
}

/**
 * Check if an address is a SegWit (bech32) address
 * @param address Address to check
 * @param network Bitcoin network configuration
 */
export function isSegWitAddress(
  address: string,
  network: bitcoin.Network,
): boolean {
  if (!network.bech32) return false;
  try {
    bitcoin.address.fromBech32(address);
    return address.toLowerCase().startsWith(network.bech32.toLowerCase());
  } catch (error) {
    return false;
  }
}

/**
 * Check if an address is a Taproot (bech32m) address
 * @param address Address to check
 * @param network Bitcoin network configuration
 */
export function isTaprootAddress(
  address: string,
  network: bitcoin.Network,
): boolean {
  if (!network.bech32) return false;
  try {
    const decoded = bitcoin.address.fromBech32(address);
    // Taproot uses witness version 1
    return (
      decoded.version === 1 &&
      address.toLowerCase().startsWith(network.bech32.toLowerCase())
    );
  } catch (error) {
    return false;
  }
}

/**
 * Get the address type
 * @param address Address to check
 * @param network Bitcoin network configuration
 */
export function getAddressType(
  address: string,
  network: bitcoin.Network,
): 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | 'unknown' {
  if (isP2PKHAddress(address, network)) return 'p2pkh';
  if (isP2SHAddress(address, network)) return 'p2sh';

  if (network.bech32) {
    try {
      const decoded = bitcoin.address.fromBech32(address);
      if (decoded.version === 0) {
        return decoded.data.length === 20 ? 'p2wpkh' : 'p2wsh';
      }
      if (decoded.version === 1) {
        return 'p2tr';
      }
    } catch {
      // Not a bech32 address
    }
  }

  return 'unknown';
}

/**
 * Validate an address for a given network
 * @param address Address to validate
 * @param network Bitcoin network configuration
 */
export function isValidAddress(
  address: string,
  network: bitcoin.Network,
): boolean {
  return getAddressType(address, network) !== 'unknown';
}
