import {
  createTransaction,
  sendAndConfirmTransaction,
} from '@heavy-duty/solana-utils';
import { Connection, Keypair } from '@solana/web3.js';
import { createTransferInstructions } from './create-transfer-instructions';

export interface TransferParams {
  connection: Connection;
  payerKeypair: Keypair;
  receiverAddress: string;
  mintAddress: string;
  amount: number;
  memo?: string;
  fundReceiver?: boolean;
}

export async function transfer(params: TransferParams) {
  const instructions = createTransferInstructions({
    amount: params.amount,
    mintAddress: params.mintAddress,
    receiverAddress: params.receiverAddress,
    senderAddress: params.payerKeypair.publicKey.toBase58(),
    fundReceiver: params.fundReceiver,
    memo: params.memo,
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
