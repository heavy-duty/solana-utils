// Import necessary modules from @solana/spl-token and @solana/web3.js
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

/**
 * Interface defining the parameters for creating transfer instructions.
 * @interface
 * @property {string} sender - The public key of the sender.
 * @property {string} receiver - The public key of the receiver.
 * @property {string} mint - The mint address of the token being transferred.
 * @property {number} amount - The amount of tokens to transfer.
 * @property {string} [memo] - Optional memo to attach with the transfer.
 * @property {boolean} [fundReceiver] - Flag to indicate whether to fund the receiver account if it doesn't exist.
 * @property {string} [payerAddress] - Address of the payer for the ATA rent, defaults to senderAddress.
 */
export interface CreateTransferInstructionsParams {
  senderAddress: string;
  receiverAddress: string;
  mintAddress: string;
  amount: number;
  memo?: string;
  fundReceiver?: boolean;
  payerAddress?: string;
}

/**
 * Creates a list of transaction instructions for transferring SPL tokens, optionally creating the receiver's associated token account and attaching a memo.
 * @param {CreateTransferInstructionsParams} params - The parameters for creating the transfer instructions.
 * @returns {TransactionInstruction[]} An array of transaction instructions to be added to a transaction.
 */
export function createTransferInstructions(
  params: CreateTransferInstructionsParams
): TransactionInstruction[] {
  // Retrieve the associated token account public key for the sender
  const senderAssociatedTokenPubkey = getAssociatedTokenAddressSync(
    new PublicKey(params.mintAddress),
    new PublicKey(params.senderAddress)
  );

  // Retrieve the associated token account public key for the receiver
  const receiverAssociatedTokenPubkey = getAssociatedTokenAddressSync(
    new PublicKey(params.mintAddress),
    new PublicKey(params.receiverAddress)
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
        new PublicKey(params.mintAddress)
      )
    );
  }

  // Add the transfer instruction
  transferInstructions.push(
    createTransferInstruction(
      senderAssociatedTokenPubkey,
      receiverAssociatedTokenPubkey,
      new PublicKey(params.senderAddress),
      params.amount
    )
  );

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
