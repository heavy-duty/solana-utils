import {
  createTransaction,
  sendAndConfirmTransaction,
} from '@heavy-duty/solana-utils';
import { TransferFeeConfig } from '@solana/spl-token';
import { Connection, Keypair } from '@solana/web3.js';
import { createTransferInstructions } from './create-transfer-instructions';

export interface TransferParams {
  connection: Connection;
  payerKeypair: Keypair;
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

export async function transfer(params: TransferParams) {
  const instructions = createTransferInstructions({
    amount: params.amount,
    mintAddress: params.mintAddress,
    receiverAddress: params.receiverAddress,
    senderAddress: params.payerKeypair.publicKey.toBase58(),
    fundReceiver: params.fundReceiver,
    memo: params.memo,
    decimals: params.decimals,
    closeAddress: params.closeAddress,
    feeConfig: params.feeConfig,
    payerAddress: params.payerAddress,
    programId: params.programId,
  });
  const { transaction, latestBlockhash } = await createTransaction({
    payerAddress: params.payerKeypair.publicKey.toBase58(),
    connection: params.connection,
    instructions,
    signers: [params.payerKeypair],
  });
  const signature = await sendAndConfirmTransaction({
    connection: params.connection,
    latestBlockhash,
    transaction,
  });

  return signature;
}
