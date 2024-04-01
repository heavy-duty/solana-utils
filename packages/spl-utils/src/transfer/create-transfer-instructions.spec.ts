import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  decodeCloseAccountInstruction,
  decodeHarvestWithheldTokensToMintInstruction,
  decodeTransferCheckedInstruction,
  decodeTransferCheckedWithFeeInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { createTransferInstructions } from './create-transfer-instructions';

describe('createTransferInstructions', () => {
  const senderKeypair = Keypair.generate();
  const receiverKeypair = Keypair.generate();
  const mintKeypair = Keypair.generate();

  it('should send transfer', () => {
    const amount = 1;
    const decimals = 0;
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount,
      decimals: 0,
      mintAddress: mintKeypair.publicKey.toBase58(),
    });
    const senderAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      senderKeypair.publicKey
    );
    const receiverAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      receiverKeypair.publicKey
    );

    expect(transferInstructions.length).toEqual(1);

    // Verify transfer instruction
    const decodedTransferCheckedInstruction = decodeTransferCheckedInstruction(
      transferInstructions[0],
      TOKEN_PROGRAM_ID
    );

    expect(
      decodedTransferCheckedInstruction.keys.owner.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.destination.pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.source.pubkey.equals(
        senderAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.mint.pubkey.equals(
        mintKeypair.publicKey
      )
    ).toBe(true);
    expect(decodedTransferCheckedInstruction.data.amount).toBe(BigInt(amount));
    expect(decodedTransferCheckedInstruction.data.decimals).toBe(decimals);
  });

  it('should send transfer with memo', () => {
    const amount = 1;
    const decimals = 0;
    const memo = 'hello world!';
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount,
      decimals,
      mintAddress: mintKeypair.publicKey.toBase58(),
      memo,
    });
    const senderAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      senderKeypair.publicKey
    );
    const receiverAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      receiverKeypair.publicKey
    );

    expect(transferInstructions.length).toEqual(2);

    // Verify transfer instruction
    const decodedTransferCheckedInstruction = decodeTransferCheckedInstruction(
      transferInstructions[0],
      TOKEN_PROGRAM_ID
    );

    expect(
      decodedTransferCheckedInstruction.keys.owner.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.destination.pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.source.pubkey.equals(
        senderAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.mint.pubkey.equals(
        mintKeypair.publicKey
      )
    ).toBe(true);
    expect(decodedTransferCheckedInstruction.data.amount).toBe(BigInt(amount));
    expect(decodedTransferCheckedInstruction.data.decimals).toBe(decimals);

    // Verify memo instruction
    expect(new TextDecoder().decode(transferInstructions[1].data)).toBe(memo);
  });

  it('should send transfer with funding recipient', () => {
    const amount = 1;
    const decimals = 0;
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount,
      decimals,
      mintAddress: mintKeypair.publicKey.toBase58(),
      fundReceiver: true,
    });
    const senderAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      senderKeypair.publicKey
    );
    const receiverAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      receiverKeypair.publicKey
    );

    expect(transferInstructions.length).toEqual(2);

    // Verify create account instruction
    expect(transferInstructions[0].keys.length).toBe(6);
    expect(
      transferInstructions[0].keys[0].pubkey.equals(senderKeypair.publicKey)
    ).toBe(true);
    expect(
      transferInstructions[0].keys[1].pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      transferInstructions[0].keys[2].pubkey.equals(receiverKeypair.publicKey)
    ).toBe(true);
    expect(
      transferInstructions[0].keys[3].pubkey.equals(mintKeypair.publicKey)
    ).toBe(true);
    expect(
      transferInstructions[0].keys[4].pubkey.equals(SystemProgram.programId)
    ).toBe(true);
    expect(
      transferInstructions[0].keys[5].pubkey.equals(TOKEN_PROGRAM_ID)
    ).toBe(true);

    // Verify transfer instruction
    const decodedTransferCheckedInstruction = decodeTransferCheckedInstruction(
      transferInstructions[1],
      TOKEN_PROGRAM_ID
    );

    expect(
      decodedTransferCheckedInstruction.keys.owner.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.destination.pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.source.pubkey.equals(
        senderAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.mint.pubkey.equals(
        mintKeypair.publicKey
      )
    ).toBe(true);
    expect(decodedTransferCheckedInstruction.data.amount).toBe(BigInt(amount));
    expect(decodedTransferCheckedInstruction.data.decimals).toBe(decimals);
  });

  it('should correctly calculate and apply transfer fee', () => {
    // Mock fee configuration: 0.25% fee with a maximum of 5 tokens (assuming tokens have 0 decimals for simplicity)
    const feeConfig = {
      newerTransferFee: {
        epoch: BigInt(100),
        maximumFee: BigInt(5),
        transferFeeBasisPoints: 25,
      },
      olderTransferFee: {
        epoch: BigInt(100),
        maximumFee: BigInt(5),
        transferFeeBasisPoints: 25,
      },
      transferFeeConfigAuthority: PublicKey.default,
      withdrawWithheldAuthority: PublicKey.default,
      withheldAmount: BigInt(0),
    };

    // Create transfer instructions with a specified amount that would trigger the fee calculation
    const amount = 10000; // Amount being transferred, triggers a fee calculation
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount,
      decimals: 0, // Assuming token has 0 decimals for simplicity
      mintAddress: mintKeypair.publicKey.toBase58(),
      feeConfig, // Apply the fee configuration
      programId: TOKEN_2022_PROGRAM_ID.toBase58(),
    });

    // Retrieve the associated token account public keys for verification
    const senderAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      senderKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const receiverAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      receiverKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const expectedFee = Math.floor(
      Math.min(
        (amount * feeConfig.newerTransferFee.transferFeeBasisPoints) / 10000,
        Number(feeConfig.newerTransferFee.maximumFee)
      )
    );

    expect(transferInstructions.length).toEqual(1);

    // Verify transfer instruction
    const decodedTransferCheckedWithFeeInstruction =
      decodeTransferCheckedWithFeeInstruction(
        transferInstructions[0],
        TOKEN_2022_PROGRAM_ID
      );

    expect(
      decodedTransferCheckedWithFeeInstruction.keys.authority.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedWithFeeInstruction.keys.destination.pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedWithFeeInstruction.keys.source.pubkey.equals(
        senderAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedWithFeeInstruction.keys.mint.pubkey.equals(
        mintKeypair.publicKey
      )
    ).toBe(true);
    expect(decodedTransferCheckedWithFeeInstruction.data.fee).toBe(
      BigInt(expectedFee)
    );
    expect(decodedTransferCheckedWithFeeInstruction.data.amount).toBe(
      BigInt(amount)
    );
  });

  it("should send transfer and close sender's associated token account", () => {
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount: 1,
      decimals: 0,
      mintAddress: mintKeypair.publicKey.toBase58(),
      closeAddress: senderKeypair.publicKey.toBase58(),
    });
    const senderAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      senderKeypair.publicKey
    );
    const receiverAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      receiverKeypair.publicKey
    );

    expect(transferInstructions.length).toEqual(2);

    // Verify transfer instruction
    const decodedTransferCheckedInstruction = decodeTransferCheckedInstruction(
      transferInstructions[0],
      TOKEN_PROGRAM_ID
    );

    expect(
      decodedTransferCheckedInstruction.keys.owner.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.destination.pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.source.pubkey.equals(
        senderAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedInstruction.keys.mint.pubkey.equals(
        mintKeypair.publicKey
      )
    ).toBe(true);

    // Verify close account instruction
    const decodedCloseAccountInstruction = decodeCloseAccountInstruction(
      transferInstructions[1]
    );

    expect(
      decodedCloseAccountInstruction.keys.account.pubkey.equals(
        senderAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedCloseAccountInstruction.keys.authority.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
    expect(
      decodedCloseAccountInstruction.keys.destination.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
  });

  it("should send transfer and close sender's associated token account with transfer fee", () => {
    // Mock fee configuration: 0.25% fee with a maximum of 5 tokens (assuming tokens have 0 decimals for simplicity)
    const feeConfig = {
      newerTransferFee: {
        epoch: BigInt(100),
        maximumFee: BigInt(5),
        transferFeeBasisPoints: 25,
      },
      olderTransferFee: {
        epoch: BigInt(100),
        maximumFee: BigInt(5),
        transferFeeBasisPoints: 25,
      },
      transferFeeConfigAuthority: PublicKey.default,
      withdrawWithheldAuthority: PublicKey.default,
      withheldAmount: BigInt(0),
    };
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount: 1,
      decimals: 0,
      mintAddress: mintKeypair.publicKey.toBase58(),
      closeAddress: senderKeypair.publicKey.toBase58(),
      feeConfig,
      programId: TOKEN_2022_PROGRAM_ID.toBase58(),
    });
    const senderAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      senderKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const receiverAssociatedTokenPubkey = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      receiverKeypair.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    expect(transferInstructions.length).toEqual(3);

    // Verify transfer instruction
    const decodedTransferCheckedWithFeeInstruction =
      decodeTransferCheckedWithFeeInstruction(
        transferInstructions[0],
        TOKEN_2022_PROGRAM_ID
      );

    expect(
      decodedTransferCheckedWithFeeInstruction.keys.authority.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedWithFeeInstruction.keys.destination.pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedWithFeeInstruction.keys.source.pubkey.equals(
        senderAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedTransferCheckedWithFeeInstruction.keys.mint.pubkey.equals(
        mintKeypair.publicKey
      )
    ).toBe(true);

    // Verify harvest witheld tokens
    const decodedHarvestWithheldTokensToMintInstruction =
      decodeHarvestWithheldTokensToMintInstruction(
        transferInstructions[1],
        TOKEN_2022_PROGRAM_ID
      );

    expect(
      decodedHarvestWithheldTokensToMintInstruction.keys.mint.pubkey.equals(
        mintKeypair.publicKey
      )
    ).toBe(true);
    expect(
      decodedHarvestWithheldTokensToMintInstruction.keys.sources?.[0].pubkey.equals(
        senderAssociatedTokenPubkey
      )
    ).toBe(true);

    // Verify close account instruction
    const decodedCloseAccountInstruction = decodeCloseAccountInstruction(
      transferInstructions[2],
      TOKEN_2022_PROGRAM_ID
    );

    expect(
      decodedCloseAccountInstruction.keys.account.pubkey.equals(
        senderAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      decodedCloseAccountInstruction.keys.authority.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
    expect(
      decodedCloseAccountInstruction.keys.destination.pubkey.equals(
        senderKeypair.publicKey
      )
    ).toBe(true);
  });
});
