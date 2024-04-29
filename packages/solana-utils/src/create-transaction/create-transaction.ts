import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { estimateComputeUnits } from './estimate-compute-units';
import { PriorityLevel, estimatePriorityFee } from './estimate-priority-fee';

export interface CreateTransactionParams {
  payerAddress: string;
  instructions: TransactionInstruction[];
  signers?: Keypair[];
  addressLookupTableAccounts?: AddressLookupTableAccount[] | undefined;
  connection: Connection;
  latestBlockhash?: { blockhash: string; lastValidBlockHeight: number };
  slot?: number;
  priorityFeeUrl: string;
  maxPriorityFee: number;
  priorityLevel: PriorityLevel;
}

export async function createTransaction(params: CreateTransactionParams) {
  let latestBlockhash: { blockhash: string; lastValidBlockHeight: number };
  let slot: number;

  if (params.latestBlockhash !== undefined && params.slot !== undefined) {
    latestBlockhash = params.latestBlockhash;
    slot = params.slot;
  } else {
    const latestBlockhashAndContext =
      await params.connection.getLatestBlockhashAndContext('confirmed');

    latestBlockhash = latestBlockhashAndContext.value;
    slot = latestBlockhashAndContext.context.slot;
  }

  const estimatedComputeUnits =
    (await estimateComputeUnits(
      params.connection,
      params.instructions,
      new PublicKey(params.payerAddress),
      params.addressLookupTableAccounts ?? []
    )) ?? 100000;

  let estimatedPriorityFee = 0;

  if (
    !params.connection.rpcEndpoint.includes('localhost') &&
    !params.connection.rpcEndpoint.includes('127.0.0.1')
  ) {
    estimatedPriorityFee = await estimatePriorityFee(
      params.priorityFeeUrl,
      params.priorityLevel,
      params.instructions,
      new PublicKey(params.payerAddress),
      params.addressLookupTableAccounts ?? []
    );
    const totalEstimatedPriorityFee =
      estimatedPriorityFee * estimatedComputeUnits;
    const totalEstimatedPriorityFeeInSol =
      totalEstimatedPriorityFee / 1000000 / LAMPORTS_PER_SOL;

    if (totalEstimatedPriorityFeeInSol > params.maxPriorityFee) {
      estimatedPriorityFee = Math.floor(
        params.maxPriorityFee / estimatedComputeUnits
      );
    }
  }

  const transactionMessage = new TransactionMessage({
    payerKey: new PublicKey(params.payerAddress),
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({
        units: estimatedComputeUnits,
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Math.floor(estimatedPriorityFee),
      }),
    ].concat(params.instructions),
  }).compileToV0Message(params.addressLookupTableAccounts);
  const transaction = new VersionedTransaction(transactionMessage);

  if (params.signers) {
    transaction.sign(params.signers);
  }

  return {
    latestBlockhash,
    transaction,
    slot,
  };
}
