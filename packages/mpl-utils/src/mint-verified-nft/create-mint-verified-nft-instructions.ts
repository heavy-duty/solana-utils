import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  createVerifySizedCollectionItemInstruction,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  MintLayout,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
} from '@solana/spl-token';
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { findNftAddresses } from '../find-nft-addresses/find-nft-addresses';

export interface CreateMintVerifiedNftInstructionsParams {
  mintAddress: string;
  receiverAddress: string;
  lamportsForMint: number;
  payerAddress: string;
  collectionMintAddress: string;
  uri: string;
  name: string;
  symbol: string;
  memo?: string;
}

export function createMintVerifiedNftInstructions(
  params: CreateMintVerifiedNftInstructionsParams
) {
  const collectionAddresses = findNftAddresses({
    mintAddress: params.collectionMintAddress,
    ownerAddress: params.payerAddress,
  });

  const nftAddresses = findNftAddresses({
    mintAddress: params.mintAddress,
    ownerAddress: params.receiverAddress,
  });

  const transactionInstructions = [
    SystemProgram.createAccount({
      programId: TOKEN_PROGRAM_ID,
      space: MintLayout.span,
      fromPubkey: new PublicKey(params.payerAddress),
      newAccountPubkey: new PublicKey(params.mintAddress),
      lamports: params.lamportsForMint,
    }),
    createInitializeMint2Instruction(
      new PublicKey(params.mintAddress),
      0,
      new PublicKey(params.payerAddress),
      new PublicKey(params.payerAddress)
    ),
    createAssociatedTokenAccountInstruction(
      new PublicKey(params.payerAddress),
      new PublicKey(nftAddresses.tokenAddress),
      new PublicKey(params.receiverAddress),
      new PublicKey(params.mintAddress)
    ),
    createMintToInstruction(
      new PublicKey(params.mintAddress),
      new PublicKey(nftAddresses.tokenAddress),
      new PublicKey(params.payerAddress),
      1
    ),
    createCreateMetadataAccountV3Instruction(
      {
        metadata: new PublicKey(nftAddresses.metadataAddress),
        mint: new PublicKey(params.mintAddress),
        mintAuthority: new PublicKey(params.payerAddress),
        payer: new PublicKey(params.payerAddress),
        updateAuthority: new PublicKey(params.payerAddress),
      },
      {
        createMetadataAccountArgsV3: {
          isMutable: false,
          collectionDetails: {
            __kind: 'V1',
            size: 0,
          },
          data: {
            collection: {
              key: new PublicKey(params.collectionMintAddress),
              verified: false,
            },
            creators: [
              {
                address: new PublicKey(params.payerAddress),
                share: 100,
                verified: true,
              },
            ],
            name: params.name,
            sellerFeeBasisPoints: 0,
            symbol: params.symbol,
            uri: params.uri,
            uses: null,
          },
        },
      }
    ),
    createCreateMasterEditionV3Instruction(
      {
        metadata: new PublicKey(collectionAddresses.metadataAddress),
        mint: new PublicKey(params.mintAddress),
        mintAuthority: new PublicKey(params.payerAddress),
        payer: new PublicKey(params.payerAddress),
        updateAuthority: new PublicKey(params.payerAddress),
        edition: new PublicKey(collectionAddresses.masterEditionAddress),
      },
      {
        createMasterEditionArgs: {
          maxSupply: 1,
        },
      }
    ),
    createVerifySizedCollectionItemInstruction({
      collectionMint: new PublicKey(params.collectionMintAddress),
      collection: new PublicKey(collectionAddresses.metadataAddress),
      collectionAuthority: new PublicKey(params.payerAddress),
      collectionMasterEditionAccount: new PublicKey(
        collectionAddresses.masterEditionAddress
      ),
      metadata: new PublicKey(collectionAddresses.metadataAddress),
      payer: new PublicKey(params.payerAddress),
    }),
  ];

  if (params.memo) {
    transactionInstructions.push(
      new TransactionInstruction({
        keys: [
          {
            pubkey: new PublicKey(params.payerAddress),
            isSigner: true,
            isWritable: true,
          },
        ],
        data: Buffer.from(params.memo, 'utf-8'),
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      })
    );
  }

  return transactionInstructions;
}
