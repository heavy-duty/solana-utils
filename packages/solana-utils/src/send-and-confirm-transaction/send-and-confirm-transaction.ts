import { Connection, VersionedTransaction } from '@solana/web3.js';
import {
  combineLatest,
  concatMap,
  exhaustMap,
  filter,
  first,
  interval,
  lastValueFrom,
  map,
  startWith,
} from 'rxjs';

interface ConfirmTransactionParams {
  latestBlockhash: {
    lastValidBlockHeight: number;
    blockhash: string;
  };
  slot: number;
  transaction: VersionedTransaction;
  connection: Connection;
  retryInterval: number;
  signature: string;
}

const SLOT_BACKOFF = 100;
const POLL_INTERVAL = 1000;

function confirmTransaction(params: ConfirmTransactionParams) {
  // Try to send the transaction with a retry provided by the user.
  const sendTransactionWithRetry$ = interval(params.retryInterval).pipe(
    concatMap(async () => {
      const signature = await params.connection.sendEncodedTransaction(
        Buffer.from(params.transaction.serialize()).toString('base64'),
        {
          maxRetries: 0,
          minContextSlot: params.slot - SLOT_BACKOFF,
          preflightCommitment: 'confirmed',
          skipPreflight: true,
        }
      );

      return signature;
    })
  );

  // Validate the blockheight with a retry provided by the user
  const blockHeightWithRetry$ = interval(params.retryInterval).pipe(
    concatMap(async () => {
      const blockHeight = await params.connection.getBlockHeight();

      return blockHeight;
    })
  );

  // This emits when the signatures is processed by polling every 1s.
  const signatureProcessed$ = interval(POLL_INTERVAL).pipe(
    concatMap(() => params.connection.getSignatureStatus(params.signature)),
    filter((signatureStatus) => signatureStatus.value !== null),
    first()
  );

  // This emits when the signatures is confirmed by polling every 1s.
  const signatureConfirmed$ = interval(POLL_INTERVAL).pipe(
    concatMap(() => params.connection.getSignatureStatus(params.signature)),
    filter(
      (signatureStatus) =>
        signatureStatus.value !== null &&
        signatureStatus.value.confirmationStatus === 'confirmed'
    ),
    first()
  );

  // This will start retrying until the signature is processed and confirmed.
  const confirmTransaction$ = sendTransactionWithRetry$.pipe(
    exhaustMap(() => signatureProcessed$.pipe(map(() => true))),
    exhaustMap(() => signatureConfirmed$.pipe(map(() => true))),
    startWith(false)
  );

  // Wait for either confirmation or block heigh expiration
  const signature$ = combineLatest([
    confirmTransaction$,
    blockHeightWithRetry$,
  ]).pipe(
    filter(([isConfirmed, blockHeight]) => {
      if (blockHeight >= params.latestBlockhash.lastValidBlockHeight) {
        throw new Error('Block Height Exceeded');
      }

      return isConfirmed;
    }),
    map(() => params.signature),
    first()
  );

  // Turns observable into promise
  return lastValueFrom(signature$);
}

export interface SendAndConfirmTransactionParams {
  latestBlockhash: {
    lastValidBlockHeight: number;
    blockhash: string;
  };
  slot: number;
  transaction: VersionedTransaction;
  connection: Connection;
  retryInterval: number;
}

export async function sendAndConfirmTransaction(
  params: SendAndConfirmTransactionParams
) {
  await params.connection.simulateTransaction(params.transaction, {
    commitment: 'confirmed',
    minContextSlot: params.slot - SLOT_BACKOFF,
    sigVerify: true,
  });

  const signature = await params.connection.sendEncodedTransaction(
    Buffer.from(params.transaction.serialize()).toString('base64'),
    {
      maxRetries: 0,
      minContextSlot: params.slot - SLOT_BACKOFF,
      preflightCommitment: 'confirmed',
      skipPreflight: true,
    }
  );

  await confirmTransaction({
    connection: params.connection,
    latestBlockhash: params.latestBlockhash,
    retryInterval: params.retryInterval,
    signature,
    slot: params.slot,
    transaction: params.transaction,
  });

  return signature;
}
