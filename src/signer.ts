/**
 * msigner - Multi-chain Ordinals PSBT Signer
 * 
 * Supports Bitcoin, Junkcoin, Litecoin, Dogecoin, and other Bitcoin-like chains.
 * Uses 2-Dummy UTXO algorithm for secure ordinal trades.
 */

import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

import {
  BUYING_PSBT_BUYER_RECEIVE_INDEX,
  BUYING_PSBT_PLATFORM_FEE_INDEX,
  BUYING_PSBT_SELLER_SIGNATURE_INDEX,
  DUMMY_UTXO_MAX_VALUE,
  DUMMY_UTXO_MIN_VALUE,
  DUMMY_UTXO_VALUE,
  ORDINALS_POSTAGE_VALUE,
  PLATFORM_FEE_ADDRESS,
} from './constant';

import {
  generateTxidFromHash,
  isP2SHAddress,
  mapUtxos,
  satToBtc,
  toXOnly,
  MappedUtxo,
} from './util';

import {
  calculateTxBytesFee,
  calculateTxBytesFeeWithRate,
  getSellerOrdOutputValue,
} from './vendors/feeprovider';

import {
  IRPCProvider,
  IFeeProvider,
  IItemProvider,
  IMarketplaceFeeProvider,
  IOrdItem,
} from './providers';

import { getDefaultRPC } from './vendors/fullnoderpc';
import { ChainNetwork, NETWORKS } from './networks';

// Initialize ECC library
bitcoin.initEccLib(ecc);

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface WitnessUtxo {
  script: Buffer;
  value: number;
}

export interface IListingState {
  /** Network configuration for the chain */
  network: bitcoin.Network;

  seller: {
    makerFeeBp: number;
    sellerOrdAddress: string;
    price: number;
    ordItem: IOrdItem;
    sellerReceiveAddress: string;
    unsignedListingPSBTBase64?: string;
    signedListingPSBTBase64?: string;
    tapInternalKey?: string;
  };

  buyer?: {
    takerFeeBp: number;
    buyerAddress: string;
    buyerTokenReceiveAddress: string;
    feeRateTier: string;
    buyerPublicKey?: string;
    unsignedBuyingPSBTBase64?: string;
    unsignedBuyingPSBTInputSize?: number;
    signedBuyingPSBTBase64?: string;
    buyerDummyUTXOs?: MappedUtxo[];
    buyerPaymentUTXOs?: AddressTxsUtxo[];
    mergedSignedBuyingPSBTBase64?: string;
  };
}

export interface IOrdAPIPostPSBTBuying {
  price: number;
  tokenId: string;
  buyerAddress: string;
  buyerTokenReceiveAddress: string;
  signedBuyingPSBTBase64: string;
}

export interface IOrdAPIPostPSBTListing {
  price: number;
  tokenId: string;
  sellerReceiveAddress: string;
  signedListingPSBTBase64: string;
  tapInternalKey?: string;
}

export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidArgumentError';
  }
}

// =============================================================================
// SIGNER CONFIGURATION
// =============================================================================

export interface SignerConfig {
  network: bitcoin.Network;
  rpcProvider: IRPCProvider;
  feeProvider: IFeeProvider;
  itemProvider: IItemProvider;
  marketplaceFeeProvider?: IMarketplaceFeeProvider;
  platformFeeAddress?: string;
}

/**
 * Create a signer configuration from a chain network
 */
export function createSignerConfig(
  chainNetwork: ChainNetwork | string,
  rpcProvider: IRPCProvider,
  feeProvider: IFeeProvider,
  itemProvider: IItemProvider,
  marketplaceFeeProvider?: IMarketplaceFeeProvider,
): SignerConfig {
  const chain = typeof chainNetwork === 'string'
    ? NETWORKS[chainNetwork]
    : chainNetwork;

  if (!chain) {
    throw new InvalidArgumentError(`Unknown network: ${chainNetwork}`);
  }

  return {
    network: chain.network,
    rpcProvider,
    feeProvider,
    itemProvider,
    marketplaceFeeProvider,
    platformFeeAddress: PLATFORM_FEE_ADDRESS,
  };
}

// =============================================================================
// SELLER SIGNER
// =============================================================================

export namespace SellerSigner {
  /**
   * Generate unsigned listing PSBT
   */
  export async function generateUnsignedListingPSBTBase64(
    listing: IListingState,
    rpcProvider?: IRPCProvider,
  ): Promise<IListingState> {
    const rpc = rpcProvider ?? getDefaultRPC();
    const network = listing.network;
    const psbt = new bitcoin.Psbt({ network });

    const [ordinalUtxoTxId, ordinalUtxoVout] =
      listing.seller.ordItem.output.split(':');

    const tx = bitcoin.Transaction.fromHex(
      await rpc.getrawtransaction(ordinalUtxoTxId),
    );

    // Clear witness data for non-taproot
    if (!listing.seller.tapInternalKey) {
      for (const output in tx.outs) {
        try {
          tx.setWitness(parseInt(output), []);
        } catch { }
      }
    }

    const input: any = {
      hash: ordinalUtxoTxId,
      index: parseInt(ordinalUtxoVout),
      nonWitnessUtxo: tx.toBuffer(),
      witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
      sighashType:
        bitcoin.Transaction.SIGHASH_SINGLE |
        bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    };

    // Add taproot internal key if using taproot
    if (listing.seller.tapInternalKey) {
      input.tapInternalKey = toXOnly(
        Buffer.from(listing.seller.tapInternalKey, 'hex'),
      );
    }

    psbt.addInput(input);

    const sellerOutput = getSellerOrdOutputValue(
      listing.seller.price,
      listing.seller.makerFeeBp,
      listing.seller.ordItem.outputValue,
    );

    psbt.addOutput({
      address: listing.seller.sellerReceiveAddress,
      value: sellerOutput,
    });

    listing.seller.unsignedListingPSBTBase64 = psbt.toBase64();
    return listing;
  }

  /**
   * Verify signed listing PSBT
   */
  export async function verifySignedListingPSBTBase64(
    req: IOrdAPIPostPSBTListing,
    config: SignerConfig,
  ): Promise<void> {
    const { network, rpcProvider, itemProvider, marketplaceFeeProvider } = config;
    const psbt = bitcoin.Psbt.fromBase64(req.signedListingPSBTBase64, { network });

    // Verify taproot signature if present
    psbt.data.inputs.forEach((input) => {
      if (input.tapInternalKey) {
        const finalScriptWitness = input.finalScriptWitness;
        if (finalScriptWitness && finalScriptWitness.length > 0) {
          if (finalScriptWitness.toString('hex') === '0141') {
            throw new InvalidArgumentError(
              'Invalid signature - no taproot signature present',
            );
          }
        } else {
          throw new InvalidArgumentError('Invalid signature - no finalScriptWitness');
        }
      }
    });

    // Verify signature via RPC
    const analyzeResult = await rpcProvider.analyzepsbt(req.signedListingPSBTBase64);
    if (analyzeResult?.inputs[0]?.is_final !== true) {
      throw new InvalidArgumentError('Invalid signature');
    }

    // Verify single input
    if (psbt.inputCount !== 1) {
      throw new InvalidArgumentError('Invalid number of inputs');
    }

    const utxoOutput =
      generateTxidFromHash(psbt.txInputs[0].hash) + ':' + psbt.txInputs[0].index;

    // Verify ordItem
    const ordItem = await itemProvider.getTokenByOutput(utxoOutput);
    if (ordItem?.id !== req.tokenId) {
      throw new InvalidArgumentError('Invalid tokenId');
    }

    // Verify price
    const makerFeeBp = marketplaceFeeProvider
      ? await marketplaceFeeProvider.getMakerFeeBp(ordItem.owner)
      : 0;
    const output = psbt.txOutputs[0];
    const expectedOutput = getSellerOrdOutputValue(
      req.price,
      makerFeeBp,
      ordItem.outputValue,
    );
    if (output.value !== expectedOutput) {
      throw new InvalidArgumentError('Invalid price');
    }

    // Verify receive address
    if (output.address !== req.sellerReceiveAddress) {
      throw new InvalidArgumentError('Invalid sellerReceiveAddress');
    }

    // Verify seller address
    const txHex = await rpcProvider.getrawtransaction(
      generateTxidFromHash(psbt.txInputs[0].hash),
    );
    const sellerAddressFromPSBT = bitcoin.address.fromOutputScript(
      bitcoin.Transaction.fromHex(txHex).outs[psbt.txInputs[0].index].script,
      network,
    );
    if (ordItem.owner !== sellerAddressFromPSBT) {
      throw new InvalidArgumentError('Invalid seller address');
    }
  }
}

// =============================================================================
// BUYER SIGNER
// =============================================================================

export namespace BuyerSigner {
  /**
   * Select dummy UTXOs for the 2-dummy algorithm
   */
  export async function selectDummyUTXOs(
    utxos: AddressTxsUtxo[],
    itemProvider: IItemProvider,
    rpcProvider?: IRPCProvider,
  ): Promise<MappedUtxo[] | null> {
    const result: MappedUtxo[] = [];

    for (const utxo of utxos) {
      if (await doesUtxoContainInscription(utxo, itemProvider, rpcProvider)) {
        continue;
      }

      if (utxo.value >= DUMMY_UTXO_MIN_VALUE && utxo.value <= DUMMY_UTXO_MAX_VALUE) {
        const mapped = await mapUtxos([utxo], rpcProvider);
        result.push(mapped[0]);
        if (result.length === 2) return result;
      }
    }

    return null;
  }

  /**
   * Select payment UTXOs
   */
  export async function selectPaymentUTXOs(
    utxos: AddressTxsUtxo[],
    amount: number,
    vinsLength: number,
    voutsLength: number,
    feeRateTier: string,
    itemProvider: IItemProvider,
    feeProvider: IFeeProvider,
    rpcProvider?: IRPCProvider,
  ): Promise<AddressTxsUtxo[]> {
    const selectedUtxos: AddressTxsUtxo[] = [];
    let selectedAmount = 0;

    // Sort by value descending, filter out dummy UTXOs
    const filteredUtxos = utxos
      .filter((x) => x.value > DUMMY_UTXO_VALUE)
      .sort((a, b) => b.value - a.value);

    for (const utxo of filteredUtxos) {
      if (await doesUtxoContainInscription(utxo, itemProvider, rpcProvider)) {
        continue;
      }

      selectedUtxos.push(utxo);
      selectedAmount += utxo.value;

      const fee = await calculateTxBytesFee(
        vinsLength + selectedUtxos.length,
        voutsLength,
        feeRateTier,
        feeProvider,
      );

      if (selectedAmount >= amount + fee) {
        break;
      }
    }

    if (selectedAmount < amount) {
      throw new InvalidArgumentError(
        `Not enough cardinal spendable funds.\n` +
        `Address has:  ${satToBtc(selectedAmount)} BTC\n` +
        `Needed:       ${satToBtc(amount)} BTC`,
      );
    }

    return selectedUtxos;
  }

  /**
   * Check if a UTXO contains an inscription
   */
  async function doesUtxoContainInscription(
    utxo: AddressTxsUtxo,
    itemProvider: IItemProvider,
    rpcProvider?: IRPCProvider,
  ): Promise<boolean> {
    const rpc = rpcProvider ?? getDefaultRPC();

    if (utxo.status.confirmed) {
      try {
        return (
          (await itemProvider.getTokenByOutput(`${utxo.txid}:${utxo.vout}`)) !== null
        );
      } catch {
        return true; // Assume contains inscription on error
      }
    }

    // Check unconfirmed transaction inputs
    const tx = await rpc.getrawtransactionVerbose(utxo.txid);
    for (const input of tx.vin) {
      const prevTx = await rpc.getrawtransactionVerbose(input.txid);
      if (prevTx.confirmations === 0) {
        return true; // Treat as containing inscription for safety
      }

      const previousOutput = `${input.txid}:${input.vout}`;
      try {
        if ((await itemProvider.getTokenByOutput(previousOutput)) !== null) {
          return true;
        }
      } catch {
        return true;
      }
    }

    return false;
  }

  /**
   * Get seller input and output from listing
   */
  async function getSellerInputAndOutput(
    listing: IListingState,
    rpcProvider?: IRPCProvider,
  ) {
    const rpc = rpcProvider ?? getDefaultRPC();
    const [ordinalUtxoTxId, ordinalUtxoVout] =
      listing.seller.ordItem.output.split(':');

    const tx = bitcoin.Transaction.fromHex(
      await rpc.getrawtransaction(ordinalUtxoTxId),
    );

    if (!listing.seller.tapInternalKey) {
      for (let i = 0; i < tx.outs.length; i++) {
        try {
          tx.setWitness(i, []);
        } catch { }
      }
    }

    const sellerInput: any = {
      hash: ordinalUtxoTxId,
      index: parseInt(ordinalUtxoVout),
      nonWitnessUtxo: tx.toBuffer(),
      witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
    };

    if (listing.seller.tapInternalKey) {
      sellerInput.tapInternalKey = toXOnly(
        Buffer.from(listing.seller.tapInternalKey, 'hex'),
      );
    }

    return {
      sellerInput,
      sellerOutput: {
        address: listing.seller.sellerReceiveAddress,
        value: getSellerOrdOutputValue(
          listing.seller.price,
          listing.seller.makerFeeBp,
          listing.seller.ordItem.outputValue,
        ),
      },
    };
  }

  /**
   * Generate unsigned buying PSBT
   */
  export async function generateUnsignedBuyingPSBTBase64(
    listing: IListingState,
    feeProvider: IFeeProvider,
    rpcProvider?: IRPCProvider,
    platformFeeAddress?: string,
  ): Promise<IListingState> {
    const network = listing.network;
    const psbt = new bitcoin.Psbt({ network });

    if (!listing.buyer?.buyerAddress || !listing.buyer.buyerTokenReceiveAddress) {
      throw new InvalidArgumentError('Buyer address is not set');
    }

    if (listing.buyer.buyerDummyUTXOs?.length !== 2 || !listing.buyer.buyerPaymentUTXOs) {
      throw new InvalidArgumentError('Buyer address has not enough utxos');
    }

    let totalInput = 0;

    // Add dummy UTXOs
    for (const dummyUtxo of listing.buyer.buyerDummyUTXOs) {
      const input: any = {
        hash: dummyUtxo.txid,
        index: dummyUtxo.vout,
        nonWitnessUtxo: dummyUtxo.tx.toBuffer(),
      };

      // Handle P2SH inputs
      if (isP2SHAddress(listing.buyer.buyerAddress, network)) {
        const redeemScript = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(listing.buyer.buyerPublicKey!, 'hex'),
        }).output;
        const p2sh = bitcoin.payments.p2sh({ redeem: { output: redeemScript } });
        input.witnessUtxo = { script: p2sh.output, value: dummyUtxo.value };
        input.redeemScript = p2sh.redeem?.output;
      }

      psbt.addInput(input);
      totalInput += dummyUtxo.value;
    }

    // Add dummy output
    psbt.addOutput({
      address: listing.buyer.buyerAddress,
      value:
        listing.buyer.buyerDummyUTXOs[0].value +
        listing.buyer.buyerDummyUTXOs[1].value +
        Number(listing.seller.ordItem.location.split(':')[2]),
    });

    // Add ordinal output
    psbt.addOutput({
      address: listing.buyer.buyerTokenReceiveAddress,
      value: ORDINALS_POSTAGE_VALUE,
    });

    // Add seller input and output
    const { sellerInput, sellerOutput } = await getSellerInputAndOutput(listing, rpcProvider);
    psbt.addInput(sellerInput);
    psbt.addOutput(sellerOutput);

    // Add payment inputs
    for (const utxo of listing.buyer.buyerPaymentUTXOs) {
      const mappedUtxos = await mapUtxos([utxo], rpcProvider);
      const mappedUtxo = mappedUtxos[0];

      const input: any = {
        hash: mappedUtxo.txid,
        index: mappedUtxo.vout,
        nonWitnessUtxo: mappedUtxo.tx.toBuffer(),
      };

      if (isP2SHAddress(listing.buyer.buyerAddress, network)) {
        const redeemScript = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(listing.buyer.buyerPublicKey!, 'hex'),
        }).output;
        const p2sh = bitcoin.payments.p2sh({ redeem: { output: redeemScript } });
        input.witnessUtxo = { script: p2sh.output, value: mappedUtxo.value };
        input.redeemScript = p2sh.redeem?.output;
      }

      psbt.addInput(input);
      totalInput += mappedUtxo.value;
    }

    // Platform fee
    const feeAddress = platformFeeAddress || PLATFORM_FEE_ADDRESS;
    let platformFeeValue = Math.floor(
      (listing.seller.price *
        (listing.buyer.takerFeeBp + listing.seller.makerFeeBp)) /
      10000,
    );
    platformFeeValue = platformFeeValue > DUMMY_UTXO_MIN_VALUE ? platformFeeValue : 0;

    if (platformFeeValue > 0 && feeAddress) {
      psbt.addOutput({
        address: feeAddress,
        value: platformFeeValue,
      });
    }

    // Create new dummy UTXOs for next purchase
    psbt.addOutput({ address: listing.buyer.buyerAddress, value: DUMMY_UTXO_VALUE });
    psbt.addOutput({ address: listing.buyer.buyerAddress, value: DUMMY_UTXO_VALUE });

    // Calculate fee
    const fee = await calculateTxBytesFee(
      psbt.txInputs.length,
      psbt.txOutputs.length,
      listing.buyer.feeRateTier,
      feeProvider,
    );

    const totalOutput = psbt.txOutputs.reduce((sum, o) => sum + o.value, 0);
    const changeValue = totalInput - totalOutput - fee;

    if (changeValue < 0) {
      throw new InvalidArgumentError(
        `Your wallet doesn't have enough funds to buy this inscription.\n` +
        `Price:      ${satToBtc(listing.seller.price)} BTC\n` +
        `Required:   ${satToBtc(totalOutput + fee)} BTC\n` +
        `Missing:    ${satToBtc(-changeValue)} BTC`,
      );
    }

    // Change output
    if (changeValue > DUMMY_UTXO_MIN_VALUE) {
      psbt.addOutput({
        address: listing.buyer.buyerAddress,
        value: changeValue,
      });
    }

    listing.buyer.unsignedBuyingPSBTBase64 = psbt.toBase64();
    listing.buyer.unsignedBuyingPSBTInputSize = psbt.data.inputs.length;
    return listing;
  }

  /**
   * Merge signed listing and buying PSBTs
   */
  export function mergeSignedBuyingPSBTBase64(
    signedListingPSBTBase64: string,
    signedBuyingPSBTBase64: string,
    network?: bitcoin.Network,
  ): string {
    const sellerSignedPsbt = bitcoin.Psbt.fromBase64(signedListingPSBTBase64, {
      network: network ?? bitcoin.networks.bitcoin,
    });
    const buyerSignedPsbt = bitcoin.Psbt.fromBase64(signedBuyingPSBTBase64, {
      network: network ?? bitcoin.networks.bitcoin,
    });

    // Merge seller signature into buyer PSBT
    (buyerSignedPsbt.data.globalMap.unsignedTx as any).tx.ins[
      BUYING_PSBT_SELLER_SIGNATURE_INDEX
    ] = (sellerSignedPsbt.data.globalMap.unsignedTx as any).tx.ins[0];

    buyerSignedPsbt.data.inputs[BUYING_PSBT_SELLER_SIGNATURE_INDEX] =
      sellerSignedPsbt.data.inputs[0];

    return buyerSignedPsbt.toBase64();
  }

  /**
   * Generate unsigned PSBT to create dummy UTXOs
   */
  export async function generateUnsignedCreateDummyUtxoPSBTBase64(
    address: string,
    buyerPublicKey: string | undefined,
    unqualifiedUtxos: AddressTxsUtxo[],
    feeRateTier: string,
    network: bitcoin.Network,
    feeProvider: IFeeProvider,
    itemProvider: IItemProvider,
    rpcProvider?: IRPCProvider,
  ): Promise<string> {
    const psbt = new bitcoin.Psbt({ network });
    const mappedUtxos = await mapUtxos(unqualifiedUtxos, rpcProvider);
    const recommendedFee = await feeProvider.getFees(feeRateTier);

    let totalValue = 0;
    let paymentUtxoCount = 0;

    for (const utxo of mappedUtxos) {
      if (await doesUtxoContainInscription(
        { txid: utxo.txid, vout: utxo.vout, value: utxo.value, status: utxo.status },
        itemProvider,
        rpcProvider,
      )) {
        continue;
      }

      const input: any = {
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: utxo.tx.toBuffer(),
      };

      if (isP2SHAddress(address, network)) {
        const redeemScript = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(buyerPublicKey!, 'hex'),
        }).output;
        const p2sh = bitcoin.payments.p2sh({ redeem: { output: redeemScript } });
        input.witnessUtxo = utxo.tx.outs[utxo.vout];
        input.redeemScript = p2sh.redeem?.output;
      }

      psbt.addInput(input);
      totalValue += utxo.value;
      paymentUtxoCount += 1;

      const fees = calculateTxBytesFeeWithRate(paymentUtxoCount, 2, recommendedFee);
      if (totalValue >= DUMMY_UTXO_VALUE * 2 + fees) {
        break;
      }
    }

    const finalFees = calculateTxBytesFeeWithRate(paymentUtxoCount, 2, recommendedFee);
    const changeValue = totalValue - DUMMY_UTXO_VALUE * 2 - finalFees;

    if (changeValue < 0) {
      throw new InvalidArgumentError(
        'You might have pending transactions or not enough funds',
      );
    }

    // Add dummy outputs
    psbt.addOutput({ address, value: DUMMY_UTXO_VALUE });
    psbt.addOutput({ address, value: DUMMY_UTXO_VALUE });

    // Add change if significant
    if (changeValue > DUMMY_UTXO_MIN_VALUE) {
      psbt.addOutput({ address, value: changeValue });
    }

    return psbt.toBase64();
  }
}
