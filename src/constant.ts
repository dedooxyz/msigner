/**
 * msigner constants
 * Chain-agnostic configuration values
 */

// =============================================================================
// PSBT STRUCTURE CONSTANTS (based on 2-dummy algorithm)
// =============================================================================

/** Index of seller signature in buying PSBT */
export const BUYING_PSBT_SELLER_SIGNATURE_INDEX = 2;

/** Index of buyer receive output in buying PSBT */
export const BUYING_PSBT_BUYER_RECEIVE_INDEX = 1;

/** Index of platform fee output in buying PSBT */
export const BUYING_PSBT_PLATFORM_FEE_INDEX = 3;

/** Magic price indicating delisting (20M BTC in sats) */
export const DELIST_MAGIC_PRICE = 20 * 1_000_000 * 100_000_000;

// =============================================================================
// DEFAULT VALUES (can be overridden per-chain)
// =============================================================================

/** Default dummy UTXO value in satoshis */
export const DEFAULT_DUMMY_UTXO_VALUE = 600;

/** Maximum value for a dummy UTXO */
export const DEFAULT_DUMMY_UTXO_MAX_VALUE = 1000;

/** Minimum value for a dummy UTXO */
export const DEFAULT_DUMMY_UTXO_MIN_VALUE = 580;

/** Default ordinals postage value in satoshis */
export const DEFAULT_ORDINALS_POSTAGE_VALUE = 10000;

/** Default RPC timeout in milliseconds */
export const DEFAULT_RPC_TIMEOUT = 120000;

// =============================================================================
// RUNTIME CONFIGURATION (from environment, with defaults)
// =============================================================================

/**
 * Get a numeric environment variable with default
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? Number(value) : defaultValue;
}

/**
 * Get a string environment variable with default
 */
function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// Runtime values (read from env at module load)
export const DUMMY_UTXO_VALUE = getEnvNumber('DUMMY_UTXO_VALUE', DEFAULT_DUMMY_UTXO_VALUE);
export const DUMMY_UTXO_MAX_VALUE = getEnvNumber('DUMMY_UTXO_MAX_VALUE', DEFAULT_DUMMY_UTXO_MAX_VALUE);
export const DUMMY_UTXO_MIN_VALUE = getEnvNumber('DUMMY_UTXO_MIN_VALUE', DEFAULT_DUMMY_UTXO_MIN_VALUE);
export const ORDINALS_POSTAGE_VALUE = getEnvNumber('ORDINALS_POSTAGE_VALUE', DEFAULT_ORDINALS_POSTAGE_VALUE);

// Platform fee address (required for marketplace operations)
export const PLATFORM_FEE_ADDRESS = getEnvString('PLATFORM_FEE_ADDRESS', '');

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// These are deprecated and should not be used in new code
// =============================================================================

/** @deprecated Use network configuration instead */
export const BTC_NETWORK = getEnvString('BTC_NETWORK', 'mainnet');

/** @deprecated Use network configuration instead */
export const ORDINALS_API_URL =
  BTC_NETWORK === 'mainnet'
    ? 'https://ordinals.com'
    : 'https://explorer-signet.openordex.org';

/** @deprecated Use FullnodeRPC class with config instead */
export const BITCOIN_RPC_HOST = getEnvString('BITCOIN_RPC_HOST', 'http://localhost');

/** @deprecated Use FullnodeRPC class with config instead */
export const BITCOIN_RPC_PORT = getEnvNumber('BITCOIN_RPC_PORT', 38332);

/** @deprecated Use FullnodeRPC class with config instead */
export const BITCOIN_RPC_USER = getEnvString('BITCOIN_RPC_USER', '__cookie__');

/** @deprecated Use FullnodeRPC class with config instead */
export const BITCOIN_RPC_PASS = getEnvString('BITCOIN_RPC_PASS', '');

/** @deprecated Use FullnodeRPC class with config instead */
export const BITCOIN_RPC_TIMEOUT = getEnvNumber('BITCOIN_RPC_TIMEOUT', DEFAULT_RPC_TIMEOUT);
