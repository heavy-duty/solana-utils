import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

export type PriorityLevel =
  | 'Min'
  | 'Low'
  | 'Medium'
  | 'High'
  | 'VeryHigh'
  | 'UnsafeMax';

export async function estimatePriorityFee(
  priorityFeeUrl: string,
  priorityLevel: PriorityLevel,
  instructions: Array<TransactionInstruction>,
  payer: PublicKey,
  lookupTables: Array<AddressLookupTableAccount> | []
) {
  const transaction = new VersionedTransaction(
    new TransactionMessage({
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
        ...instructions,
      ],
      payerKey: payer,
      recentBlockhash: PublicKey.default.toString(),
    }).compileToV0Message(lookupTables)
  );

  const response = await fetch(priorityFeeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'getPriorityFeeEstimate',
      params: [
        {
          transaction: Buffer.from(transaction.serialize()).toString('base64'),
          options: { priorityLevel, transactionEncoding: 'base64' },
        },
      ],
    }),
  });
  const responseJson = (await response.json()) as {
    result: {
      priorityFeeEstimate: number;
    };
  };

  return responseJson.result.priorityFeeEstimate;
}
