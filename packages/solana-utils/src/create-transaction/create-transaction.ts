import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

export type CreateTransactionParams = {
  payerAddress: string;
  instructions: TransactionInstruction[];
  signers?: Keypair[];
} & (
  | {
      connection: Connection;
    }
  | {
      latestBlockhash: { blockhash: string; lastValidBlockHeight: number };
    }
);

export async function createTransaction(params: CreateTransactionParams) {
  let latestBlockhash: { blockhash: string; lastValidBlockHeight: number };

  if ('latestBlockhash' in params) {
    latestBlockhash = params.latestBlockhash;
  } else {
    latestBlockhash = await params.connection.getLatestBlockhash('finalized');
  }

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
