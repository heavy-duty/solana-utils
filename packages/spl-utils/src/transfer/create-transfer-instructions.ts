// Import necessary modules from @solana/spl-token and @solana/web3.js
import {
  TransferFeeConfig,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createHarvestWithheldTokensToMintInstruction,
  createTransferCheckedInstruction,
  createTransferCheckedWithFeeInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

/**
 * Defines the parameters required to create transfer instructions for SPL tokens.
 *
 * @property {string} senderAddress - The public key of the sender's wallet address.
 * @property {string} receiverAddress - The public key of the receiver's wallet address.
 * @property {string} mintAddress - The token mint address indicating the specific token to transfer.
 * @property {number} amount - The amount of tokens to transfer, expressed as an integer according to the token's decimals.
 * @property {number} decimals - The number of decimals for the token, used to accurately calculate the transfer amount.
 * @property {string} [memo] - An optional memo or note to attach with the transaction.
 * @property {boolean} [fundReceiver] - Indicates whether to fund the receiver's associated token account if it does not exist. Defaults to false.
 * @property {string} [payerAddress] - The address that will pay for the transaction and any necessary account creations. Defaults to the sender's address.
 * @property {string} [closeAddress] - An optional address to send the remaining SOL if the sender's associated token account is closed as part of this operation.
 * @property {string} [programId] - The SPL Token program ID to use for the transaction. If not specified, the default SPL Token program ID is used.
 * @property {TransferFeeConfig} [feeConfig] - Optional configuration for applying transfer fees, specifying the fee structure and amounts.
 */
export interface CreateTransferInstructionsParams {
  senderAddress: string;
  receiverAddress: string;
  mintAddress: string;
  amount: number;
  decimals: number;
  memo?: string;
  fundReceiver?: boolean;
  payerAddress?: string;
  closeAddress?: string;
  programId?: string;
  feeConfig?: TransferFeeConfig;
}

/**
 * Generates an array of `TransactionInstruction` objects for transferring SPL tokens, incorporating various optional features like creating the receiver's associated token account if it doesn't exist, applying transfer fees, optionally closing the sender's associated token account after the transfer, and attaching a memo to the transaction. This function is designed to handle complex scenarios involving SPL token transfers on the Solana blockchain.
 *
 * @param {CreateTransferInstructionsParams} params - The parameters required to create the transfer instructions, including details about the sender, receiver, the amount to be transferred, and any applicable fees.
 * @returns {TransactionInstruction[]} An array of transaction instructions that can be included in a Solana transaction.
 * @example
 *
 * ### Example 1: Simple Transfer
 * Transferring 100 tokens from a sender to a receiver without creating a new account for the receiver or applying any transfer fee:
 *
 * ```js
 * const transferInstructions = createTransferInstructions({
 *   senderAddress: 'SenderPublicKeyString',
 *   receiverAddress: 'ReceiverPublicKeyString',
 *   mintAddress: 'TokenMintAddressString',
 *   amount: 100,
 *   decimals: 0,
 *   fundReceiver: false,
 * });
 * ```
 *
 * ### Example 2: Transfer with Receiver Account Creation and Memo
 * Transferring 50 tokens and automatically creating the receiver's associated token account if it doesn't exist, with a "Happy Birthday!" memo:
 *
 * ```js
 * const transferInstructions = createTransferInstructions({
 *   senderAddress: 'SenderPublicKeyString',
 *   receiverAddress: 'ReceiverPublicKeyString',
 *   mintAddress: 'TokenMintAddressString',
 *   amount: 50,
 *   decimals: 2,
 *   fundReceiver: true,
 *   memo: 'Happy Birthday!',
 * });
 * ```
 *
 * ### Example 3: Transfer with Fee
 * Transferring 200 tokens with a specified transfer fee. This example assumes the token has 2 decimals and includes a fee configuration that specifies a transfer fee rate and a maximum fee cap:
 *
 * ```js
 * const feeConfig = {
 *   newerTransferFee: {
 *     transferFeeBasisPoints: 150, // Fee rate: 1.5%
 *     maximumFee: 500, // Maximum fee cap, assuming token has 2 decimals
 *   },
 * };
 *
 * const transferInstructions = createTransferInstructions({
 *   senderAddress: 'SenderPublicKeyString',
 *   receiverAddress: 'ReceiverPublicKeyString',
 *   mintAddress: 'TokenMintAddressString',
 *   amount: 200,
 *   decimals: 2,
 *   feeConfig: feeConfig,
 * });
 * ```
 *
 * These examples illustrate how to use the `createTransferInstructions` function for various transfer scenarios, including simple transfers, transfers requiring the creation of a new associated token account, and transfers involving transfer fees.
 */
export function createTransferInstructions(
  params: CreateTransferInstructionsParams
): TransactionInstruction[] {
  // Retrieve the associated token account public key for the sender
  const senderAssociatedTokenPubkey = getAssociatedTokenAddressSync(
    new PublicKey(params.mintAddress),
    new PublicKey(params.senderAddress),
    undefined,
    params.programId ? new PublicKey(params.programId) : undefined
  );

  // Retrieve the associated token account public key for the receiver
  const receiverAssociatedTokenPubkey = getAssociatedTokenAddressSync(
    new PublicKey(params.mintAddress),
    new PublicKey(params.receiverAddress),
    undefined,
    params.programId ? new PublicKey(params.programId) : undefined
  );

  // Initialize an array to hold the transfer instructions
  const transferInstructions = [];

  // If fundReceiver is true, add an instruction to create the receiver's associated token account idempotently
  if (params.fundReceiver) {
    transferInstructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        new PublicKey(params.payerAddress ?? params.senderAddress),
        receiverAssociatedTokenPubkey,
        new PublicKey(params.receiverAddress),
        new PublicKey(params.mintAddress),
        params.programId ? new PublicKey(params.programId) : undefined
      )
    );
  }

  // Add the transfer instruction
  if (params.feeConfig) {
    const calcFee =
      (BigInt(params.amount) *
        BigInt(params.feeConfig.newerTransferFee.transferFeeBasisPoints)) /
      BigInt(10_000); // expect 10 fee
    const fee =
      calcFee > params.feeConfig.newerTransferFee.maximumFee
        ? params.feeConfig.newerTransferFee.maximumFee
        : calcFee;

    transferInstructions.push(
      createTransferCheckedWithFeeInstruction(
        senderAssociatedTokenPubkey,
        new PublicKey(params.mintAddress),
        receiverAssociatedTokenPubkey,
        new PublicKey(params.senderAddress),
        BigInt(params.amount),
        params.decimals,
        fee,
        undefined,
        params.programId ? new PublicKey(params.programId) : undefined
      )
    );
  } else {
    transferInstructions.push(
      createTransferCheckedInstruction(
        senderAssociatedTokenPubkey,
        new PublicKey(params.mintAddress),
        receiverAssociatedTokenPubkey,
        new PublicKey(params.senderAddress),
        params.amount,
        params.decimals,
        undefined,
        params.programId ? new PublicKey(params.programId) : undefined
      )
    );
  }

  if (params.closeAddress) {
    if (params.feeConfig) {
      // Harverst fee tokens in order to be able to close the account
      transferInstructions.push(
        createHarvestWithheldTokensToMintInstruction(
          new PublicKey(params.mintAddress),
          [senderAssociatedTokenPubkey],
          params.programId ? new PublicKey(params.programId) : undefined
        )
      );
    }

    transferInstructions.push(
      createCloseAccountInstruction(
        new PublicKey(senderAssociatedTokenPubkey),
        new PublicKey(params.closeAddress),
        new PublicKey(params.senderAddress),
        undefined,
        params.programId ? new PublicKey(params.programId) : undefined
      )
    );
  }

  // If a memo is provided, add a memo instruction
  if (params.memo) {
    transferInstructions.push(
      new TransactionInstruction({
        keys: [
          {
            pubkey: new PublicKey(params.senderAddress),
            isSigner: true,
            isWritable: true,
          },
        ],
        data: Buffer.from(params.memo, 'utf-8'),
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      })
    );
  }

  // Return the array of transaction instructions
  return transferInstructions;
}
