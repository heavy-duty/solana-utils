import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

export interface CreateTransactionParams {
  connection: Connection;
  payerAddress: string;
  instructions: TransactionInstruction[];
  signers?: Keypair[];
}

export async function createTransaction(params: CreateTransactionParams) {
  const latestBlockhash = await params.connection.getLatestBlockhash(
    'finalized'
  );

  const transactionMessage = new TransactionMessage({
    payerKey: new PublicKey(params.payerAddress),
    recentBlockhash: latestBlockhash.blockhash,
    instructions: params.instructions,
  }).compileToV0Message();
  const transaction = new VersionedTransaction(transactionMessage);

  if (params.signers) {
    transaction.sign(params.signers);
  }

  return {
    latestBlockhash,
    transaction: new VersionedTransaction(transactionMessage),
  };
}
