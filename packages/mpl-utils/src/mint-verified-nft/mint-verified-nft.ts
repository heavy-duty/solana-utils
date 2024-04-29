import {
  PriorityLevel,
  createTransaction,
  sendAndConfirmTransaction,
} from '@heavy-duty/solana-utils';
import { Metaplex } from '@metaplex-foundation/js';
import { MintLayout } from '@solana/spl-token';
import { Connection, Keypair } from '@solana/web3.js';
import { findNftAddresses } from '../find-nft-addresses';
import { createMintVerifiedNftInstructions } from './create-mint-verified-nft-instructions';

export type MintVerifiedNftParams = {
  connection: Connection;
  metaplex: Metaplex;
  payerKeypair: Keypair;
  name: string;
  symbol: string;
  receiverAddress: string;
  collectionMintAddress: string;
  maxPriorityFee: number;
  priorityLevel: PriorityLevel;
  priorityFeeUrl: string;
  retryInterval?: number;
  memo?: string;
} & (
  | {
      metadata: {
        description: string;
        image: string;
        website: string;
        attributes: { trait_type: string; value: string }[];
      };
    }
  | { uri: string }
);

export async function mintVerifiedNft(params: MintVerifiedNftParams) {
  let uri: string;

  if ('uri' in params) {
    uri = params.uri;
  } else {
    const response = await params.metaplex.nfts().uploadMetadata({
      name: params.name,
      description: params.metadata.description,
      image: params.metadata.image,
      external_url: params.metadata.website,
      symbol: params.symbol,
      attributes: params.metadata.attributes,
    });

    uri = response.uri;
  }

  const mintKeypair = Keypair.generate();
  const lamportsForMint =
    await params.connection.getMinimumBalanceForRentExemption(MintLayout.span);
  const instructions = createMintVerifiedNftInstructions({
    collectionMintAddress: params.collectionMintAddress,
    name: params.name,
    symbol: params.symbol,
    lamportsForMint,
    mintAddress: mintKeypair.publicKey.toBase58(),
    payerAddress: params.payerKeypair.publicKey.toBase58(),
    receiverAddress: params.receiverAddress,
    uri,
    memo: params.memo,
  });
  const { transaction, latestBlockhash, slot } = await createTransaction({
    payerAddress: params.payerKeypair.publicKey.toBase58(),
    connection: params.connection,
    instructions,
    signers: [params.payerKeypair, mintKeypair],
    maxPriorityFee: params.maxPriorityFee,
    priorityLevel: params.priorityLevel,
    priorityFeeUrl: params.priorityFeeUrl,
  });
  const signature = await sendAndConfirmTransaction({
    connection: params.connection,
    latestBlockhash,
    transaction,
    retryInterval: params.retryInterval ?? 5000,
    slot,
  });
  const nftAddresses = findNftAddresses({
    ownerAddress: params.receiverAddress,
    mintAddress: mintKeypair.publicKey.toBase58(),
  });

  return {
    mintAddress: nftAddresses.mintAddress,
    ownerAddress: nftAddresses.ownerAddress,
    tokenAddress: nftAddresses.tokenAddress,
    metadataAddress: nftAddresses.metadataAddress,
    masterEditionAddress: nftAddresses.masterEditionAddress,
    signature,
  };
}
