import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

export interface FindNftAddresses {
  mintAddress: string;
  ownerAddress: string;
}

export function findNftAddresses(params: FindNftAddresses) {
  const tokenPublicKey = getAssociatedTokenAddressSync(
    new PublicKey(params.mintAddress),
    new PublicKey(params.ownerAddress)
  );

  const [metadataPublicKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata', 'utf-8'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      new PublicKey(params.mintAddress).toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const [masterEditionPublicKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata', 'utf-8'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      new PublicKey(params.mintAddress).toBuffer(),
      Buffer.from('edition', 'utf-8'),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  return {
    mintAddress: params.mintAddress,
    ownerAddress: params.ownerAddress,
    tokenAddress: tokenPublicKey.toBase58(),
    metadataAddress: metadataPublicKey.toBase58(),
    masterEditionAddress: masterEditionPublicKey.toBase58(),
  };
}
