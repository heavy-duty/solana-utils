import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Keypair, SystemProgram } from '@solana/web3.js';
import { createTransferInstructions } from './create-transfer-instructions';

describe('createTransferInstructions', () => {
  const senderKeypair = Keypair.generate();
  const receiverKeypair = Keypair.generate();
  const mintKeypair = Keypair.generate();

  it('should send transfer', () => {
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount: 1,
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
    expect(transferInstructions[0].keys.length).toBe(3);
    expect(
      transferInstructions[0].keys[0].pubkey.equals(senderAssociatedTokenPubkey)
    ).toBe(true);
    expect(
      transferInstructions[0].keys[1].pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      transferInstructions[0].keys[2].pubkey.equals(senderKeypair.publicKey)
    ).toBe(true);
  });

  it('should send transfer with memo', () => {
    const memo = 'hello world!';
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount: 1,
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
    expect(transferInstructions[0].keys.length).toBe(3);
    expect(
      transferInstructions[0].keys[0].pubkey.equals(senderAssociatedTokenPubkey)
    ).toBe(true);
    expect(
      transferInstructions[0].keys[1].pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      transferInstructions[0].keys[2].pubkey.equals(senderKeypair.publicKey)
    ).toBe(true);
    // Verify memo instruction
    expect(new TextDecoder().decode(transferInstructions[1].data)).toBe(memo);
  });

  it('should send transfer with funding recipient', () => {
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount: 1,
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
    expect(transferInstructions[1].keys.length).toBe(3);
    expect(
      transferInstructions[1].keys[0].pubkey.equals(senderAssociatedTokenPubkey)
    ).toBe(true);
    expect(
      transferInstructions[1].keys[1].pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      transferInstructions[1].keys[2].pubkey.equals(senderKeypair.publicKey)
    ).toBe(true);
  });

  it('should send transfer with memo and funding recipient', () => {
    const memo = 'hello world!';
    const transferInstructions = createTransferInstructions({
      senderAddress: senderKeypair.publicKey.toBase58(),
      receiverAddress: receiverKeypair.publicKey.toBase58(),
      amount: 1,
      mintAddress: mintKeypair.publicKey.toBase58(),
      fundReceiver: true,
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

    expect(transferInstructions.length).toEqual(3);

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
    expect(transferInstructions[1].keys.length).toBe(3);
    expect(
      transferInstructions[1].keys[0].pubkey.equals(senderAssociatedTokenPubkey)
    ).toBe(true);
    expect(
      transferInstructions[1].keys[1].pubkey.equals(
        receiverAssociatedTokenPubkey
      )
    ).toBe(true);
    expect(
      transferInstructions[1].keys[2].pubkey.equals(senderKeypair.publicKey)
    ).toBe(true);

    // Verify memo instruction
    expect(new TextDecoder().decode(transferInstructions[2].data)).toBe(memo);
  });
});
