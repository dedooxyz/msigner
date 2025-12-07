/**
 * Fee calculation utilities
 * Chain-agnostic fee calculations
 */

import { IFeeProvider, FeeRateTier } from '../providers';

/**
 * Calculate transaction fee based on inputs/outputs and fee rate
 * Uses legacy address sizes (for chains without SegWit)
 */
export function calculateTxBytesFeeWithRate(
  vinsLength: number,
  voutsLength: number,
  feeRate: number,
  includeChangeOutput: 0 | 1 = 1,
): number {
  // Legacy transaction sizes
  const baseTxSize = 10;
  const inSize = 180; // P2PKH input (legacy)
  const outSize = 34;  // P2PKH output (legacy)

  const txSize =
    baseTxSize +
    vinsLength * inSize +
    voutsLength * outSize +
    includeChangeOutput * outSize;

  return txSize * feeRate;
}

/**
 * Calculate transaction fee using a fee provider
 */
export async function calculateTxBytesFee(
  vinsLength: number,
  voutsLength: number,
  feeRateTier: FeeRateTier | string,
  feeProvider: IFeeProvider,
  includeChangeOutput: 0 | 1 = 1,
): Promise<number> {
  const feeRate = await feeProvider.getFees(feeRateTier);
  return calculateTxBytesFeeWithRate(
    vinsLength,
    voutsLength,
    feeRate,
    includeChangeOutput,
  );
}

/**
 * Calculate seller output value
 * @param price Listing price in satoshis
 * @param makerFeeBp Maker fee in basis points
 * @param prevUtxoValue Previous UTXO value (ordinal postage)
 */
export function getSellerOrdOutputValue(
  price: number,
  makerFeeBp: number,
  prevUtxoValue: number,
): number {
  return (
    price - // listing price
    Math.floor((price * makerFeeBp) / 10000) + // less maker fees
    prevUtxoValue // seller gets the ordinal UTXO value back
  );
}

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

import { getFees } from './mempool';

/**
 * @deprecated Use calculateTxBytesFee with explicit feeProvider instead
 */
export async function calculateTxBytesFeeWithLegacyProvider(
  vinsLength: number,
  voutsLength: number,
  feeRateTier: string,
  includeChangeOutput: 0 | 1 = 1,
): Promise<number> {
  const recommendedFeeRate = await getFees(feeRateTier);
  return calculateTxBytesFeeWithRate(
    vinsLength,
    voutsLength,
    recommendedFeeRate,
    includeChangeOutput,
  );
}

// Re-export with original name for backward compatibility
export { calculateTxBytesFeeWithLegacyProvider as calculateTxBytesFeeOld };
