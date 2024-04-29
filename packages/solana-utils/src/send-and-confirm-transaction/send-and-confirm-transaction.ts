import {
  Commitment,
  Connection,
  SignatureResultCallback,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  combineLatest,
  concatMap,
  exhaustMap,
  filter,
  first,
  forkJoin,
  fromEventPattern,
  interval,
  lastValueFrom,
  map,
  merge,
  share,
  startWith,
  takeUntil,
} from 'rxjs';

interface FromSignatureParams {
  connection: Connection;
  signature: string;
  commitment: Commitment;
}

function fromSignature(params: FromSignatureParams) {
  return fromEventPattern<{
    result: Parameters<SignatureResultCallback>[0];
    context: Parameters<SignatureResultCallback>[1];
  }>(
    (handler) =>
      params.connection.onSignature(
        params.signature,
        (result, context) => handler({ result, context }),
        params.commitment
      ),
    (_, subscriptionId) =>
      params.connection.removeSignatureListener(subscriptionId)
  );
}

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
  // this simply attempts to send the transaction.
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
  const blockHeightWithRetry$ = interval(params.retryInterval).pipe(
    concatMap(async () => {
      const blockHeight = await params.connection.getBlockHeight();

      return blockHeight;
    })
  );
  const signatureProcessed$ = merge(
    fromSignature({
      connection: params.connection,
      signature: params.signature,
      commitment: 'processed',
    }),
    interval(POLL_INTERVAL).pipe(
      concatMap(() => params.connection.getSignatureStatus(params.signature)),
      filter((signatureStatus) => signatureStatus.value !== null)
    )
  ).pipe(share(), first());
  const signatureConfirmed$ = merge(
    fromSignature({
      connection: params.connection,
      signature: params.signature,
      commitment: 'confirmed',
    }),
    interval(POLL_INTERVAL).pipe(
      concatMap(() => params.connection.getSignatureStatus(params.signature)),
      filter(
        (signatureStatus) =>
          signatureStatus.value !== null &&
          signatureStatus.value.confirmationStatus === 'confirmed'
      )
    )
  ).pipe(first());
  const confirmTransaction$ = forkJoin([
    sendTransactionWithRetry$.pipe(takeUntil(signatureProcessed$)),
    signatureProcessed$,
  ]).pipe(
    exhaustMap(() => signatureConfirmed$.pipe(map(() => true))),
    startWith(false)
  );
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
