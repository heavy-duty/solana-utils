import { Connection, VersionedTransaction } from '@solana/web3.js';

export interface SendAndConfirmTransaction {
  connection: Connection;
  transaction: VersionedTransaction;
  latestBlockhash: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
}

export async function sendAndConfirmTransaction(
  params: SendAndConfirmTransaction
) {
  const signature = await params.connection.sendTransaction(
    params.transaction,
    {
      maxRetries: 5,
    }
  );

  await params.connection.confirmTransaction(
    {
      signature,
      blockhash: params.latestBlockhash.blockhash,
      lastValidBlockHeight: params.latestBlockhash.lastValidBlockHeight,
    },
    'finalized'
  );

  return signature;
}
