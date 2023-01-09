import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { SpaceWrapper } from "../target/types/space_wrapper";
import { findProxyAuthorityAddress } from "../programs/space-wrapper/utils/pda";
import { assert } from "chai";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  UseMethod,
} from "@metaplex-foundation/mpl-token-metadata";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("space-wrapper", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.SpaceWrapper as Program<SpaceWrapper>;
  const provider = anchor.getProvider();

  xit("call token metadata directly", async () => {
    // Note: this test exists so that we can send a valid instruction
    // to the token metadata program, to inspect instruction data and
    // accounts.
    let mintAuthority = Keypair.generate();
    await waitForAirdrop(mintAuthority.publicKey, provider.connection);

    let mintAddress = await createMint(
      provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0,
    );

    let [metadataAddress] = await findMetadataAddress(
      mintAddress,
      TOKEN_METADATA_PROGRAM_ID,
    );

    // console.log({
    //   mint: mintAddress.toString(),
    //   metadata: metadataAddress.toString(),
    //   authority: mintAuthority.publicKey.toString(),
    // });

    let createMetadataInstruction = createCreateMetadataAccountV3Instruction({
      metadata: metadataAddress,
      mint: mintAddress,
      mintAuthority: mintAuthority.publicKey,
      payer: mintAuthority.publicKey,
      updateAuthority: mintAuthority.publicKey,
    }, {
      createMetadataAccountArgsV3: {
        data: {
          name: "TEST",
          symbol: "TEST",
          uri: "http://test.com",
          sellerFeeBasisPoints: 0,
          creators: [{
            address: mintAuthority.publicKey,
            verified: false,
            share: 100,
          }],
          collection: null,
          uses: {
            useMethod: UseMethod.Burn,
            remaining: 0,
            total: 0,
          },
        },
        isMutable: false,
        collectionDetails: undefined,
      },
    });

    let {
      blockhash: blockHashBefore,
    } = await provider.connection.getLatestBlockhash();

    let createMetadataMessage = new TransactionMessage({
      recentBlockhash: blockHashBefore,
      payerKey: mintAuthority.publicKey,
      instructions: [createMetadataInstruction],
    }).compileToLegacyMessage();

    let transaction = new VersionedTransaction(createMetadataMessage);
    transaction.sign([mintAuthority]);

    const signature = await provider.connection.sendTransaction(transaction, {
      skipPreflight: true,
    });

    let { blockhash: blockHashAfter, lastValidBlockHeight: blockHeightAfter } =
      await provider.connection.getLatestBlockhash();

    let confirmation = await provider.connection.confirmTransaction({
      signature,
      blockhash: blockHashAfter,
      lastValidBlockHeight: blockHeightAfter,
    });

    // console.log("confirmation");
    // console.log(confirmation);
  });

  it("create proxy authority", async () => {
    let adminKeypair = Keypair.generate();

    await waitForAirdrop(adminKeypair.publicKey, provider.connection);

    let [proxyAuthorityAddress] = findProxyAuthorityAddress(
      adminKeypair.publicKey,
      program.programId,
    );

    let createProxyAuthorityIx = await program.methods.createProxyAuthority()
      .accounts({
        authority: adminKeypair.publicKey,
        proxyAuthority: proxyAuthorityAddress,
        systemProgram: SystemProgram.programId,
      }).instruction();

    let { blockhash: blockhashBeforeSendingCreateProxyAuthority } =
      await provider.connection
        .getLatestBlockhash();

    let createProxyAuthorityMessage = new TransactionMessage({
      recentBlockhash: blockhashBeforeSendingCreateProxyAuthority,
      payerKey: adminKeypair.publicKey,
      instructions: [
        createProxyAuthorityIx,
      ],
    }).compileToLegacyMessage();

    let transaction = new VersionedTransaction(createProxyAuthorityMessage);

    transaction.sign([adminKeypair]);

    const createProxyAuthoritySignature = await provider.connection
      .sendTransaction(transaction, { skipPreflight: true });

    let {
      blockhash: blockhashAfterSendingCreateProxyAuthority,
      lastValidBlockHeight,
    } = await provider.connection.getLatestBlockhash();

    const confirmation = await provider.connection.confirmTransaction({
      signature: createProxyAuthoritySignature,
      blockhash: blockhashAfterSendingCreateProxyAuthority,
      lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error("Create Proxy Authority confirmation contains an error.");
    }

    let adminProxyAuthority = await program.account.proxyAuthority.fetch(
      proxyAuthorityAddress,
    );

    assert(
      adminProxyAuthority.authority.equals(adminKeypair.publicKey),
      "created proxy authority has an invalid authority address",
    );
  });

  it("proxy create metadata accounts v3", async () => {
    let adminKeypair = Keypair.generate();

    await waitForAirdrop(adminKeypair.publicKey, provider.connection);
    await sleep(500);

    let [proxyAuthorityAddress] = findProxyAuthorityAddress(
      adminKeypair.publicKey,
      program.programId,
    );

    let createProxyAuthorityIx = await program.methods.createProxyAuthority()
      .accounts({
        authority: adminKeypair.publicKey,
        proxyAuthority: proxyAuthorityAddress,
        systemProgram: SystemProgram.programId,
      }).instruction();

    let { blockhash: blockhashBeforeSendingCreateProxyAuthority } =
      await provider.connection
        .getLatestBlockhash();

    let createProxyAuthorityMessage = new TransactionMessage({
      recentBlockhash: blockhashBeforeSendingCreateProxyAuthority,
      payerKey: adminKeypair.publicKey,
      instructions: [
        createProxyAuthorityIx,
      ],
    }).compileToLegacyMessage();

    let transaction = new VersionedTransaction(createProxyAuthorityMessage);

    transaction.sign([adminKeypair]);

    const createProxyAuthoritySignature = await provider.connection
      .sendTransaction(transaction, { skipPreflight: true });
    await sleep(500);

    let {
      blockhash: blockhashAfterSendingCreateProxyAuthority,
      lastValidBlockHeight,
    } = await provider.connection.getLatestBlockhash();

    const confirmation = await provider.connection.confirmTransaction({
      signature: createProxyAuthoritySignature,
      blockhash: blockhashAfterSendingCreateProxyAuthority,
      lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error("Create Proxy Authority confirmation contains an error.");
    }

    let adminProxyAuthority = await program.account.proxyAuthority.fetch(
      proxyAuthorityAddress,
    );

    assert(
      adminProxyAuthority.authority.equals(adminKeypair.publicKey),
      "created proxy authority has an invalid authority address",
    );

    let mintAddress = await createMint(
      provider.connection,
      adminKeypair,
      adminKeypair.publicKey,
      adminKeypair.publicKey,
      0,
    );

    let [metadataAddress] = await findMetadataAddress(
      mintAddress,
      TOKEN_METADATA_PROGRAM_ID,
    );

    // let ixAccounts = {
    //   proxyAuthority: proxyAuthorityAddress,
    //   mint: mintAddress,
    //   metadata: metadataAddress,
    //   mintAuthority: adminKeypair.publicKey,
    //   systemProgram: SystemProgram.programId,
    // };

    // for (let k in ixAccounts) {
    //   console.log(k, ixAccounts[k].toBase58());
    // }

    let createMetadataAccountsIx = await program.methods.proxyCreateMetadataV3(
      "asdf",
      "ASD",
      "http://placekitten.io/500/500",
      [{ key: proxyAuthorityAddress, share: 50, verified: true }, {
        key: adminKeypair.publicKey,
        share: 50,
        verified: false,
      }],
      100,
      null,
    )
      .accounts({
        proxyAuthority: proxyAuthorityAddress,
        mint: mintAddress,
        metadata: metadataAddress,
        mintAuthority: adminKeypair.publicKey,
        authority: adminKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      }).instruction();

    try {
      let { blockhash: blockhashBeforeSendingCreateMetadataAccounts } =
        await provider.connection.getLatestBlockhash();

      let proxyMetadataMessage = new TransactionMessage({
        payerKey: adminKeypair.publicKey,
        recentBlockhash: blockhashBeforeSendingCreateMetadataAccounts,
        instructions: [createMetadataAccountsIx],
      }).compileToLegacyMessage();

      let proxyCreateMetadataTransaction = new VersionedTransaction(
        proxyMetadataMessage,
      );

      proxyCreateMetadataTransaction.sign([adminKeypair]);

      let {
        blockhash: blockhashAfterSendingCreateMetadataAccounts,
        lastValidBlockHeight: blockHeightAfterSendingCreateMetadataAccounts,
      } = await provider.connection.getLatestBlockhash();
      let proxyCreateMetadataSignature = await provider.connection
        .sendTransaction(proxyCreateMetadataTransaction, {
          skipPreflight: true,
        });
      await sleep(500);

      let proxyCreateMetadataConfirmation = await provider.connection
        .confirmTransaction({
          signature: proxyCreateMetadataSignature,
          blockhash: blockhashAfterSendingCreateMetadataAccounts,
          lastValidBlockHeight: blockHeightAfterSendingCreateMetadataAccounts,
        });

      if (proxyCreateMetadataConfirmation.value.err) {
        throw new Error(
          "Proxy create metadata confirmation contains an error.",
        );
      }
    } catch (e) {
      console.error(e);
    }
  });
});

async function waitForAirdrop(address: PublicKey, connection: Connection) {
  let signature = await connection.requestAirdrop(address, LAMPORTS_PER_SOL);
  let { blockhash, lastValidBlockHeight } = await connection
    .getLatestBlockhash();

  await connection.confirmTransaction(
    { signature, lastValidBlockHeight, blockhash },
  );
}

async function findMetadataAddress(
  mint: PublicKey,
  programId: PublicKey,
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), programId.toBuffer(), mint.toBuffer()],
    programId,
  );
}
