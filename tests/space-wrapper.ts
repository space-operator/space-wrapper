import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAccount,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createMint,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SpaceWrapper } from "../target/types/space_wrapper";
import { findProxyAuthorityAddress } from "../programs/space-wrapper/utils/pda";
import { assert } from "chai";
import {
  createCreateMasterEditionV3Instruction,
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
    let authorityKeypair = Keypair.generate();
    await airdrop(authorityKeypair.publicKey, provider.connection);

    let mintAddress = await createMint(
      provider.connection,
      authorityKeypair,
      authorityKeypair.publicKey,
      authorityKeypair.publicKey,
      0,
    );

    let [metadataAddress] = await findMetadataAddress(
      mintAddress,
      TOKEN_METADATA_PROGRAM_ID,
    );

    // console.log({
    //   mint: mintAddress.toString(),
    //   metadata: metadataAddress.toString(),
    //   authority: authorityKeypair.publicKey.toString(),
    // });

    let createMetadataInstruction = createCreateMetadataAccountV3Instruction({
      metadata: metadataAddress,
      mint: mintAddress,
      mintAuthority: authorityKeypair.publicKey,
      payer: authorityKeypair.publicKey,
      updateAuthority: authorityKeypair.publicKey,
    }, {
      createMetadataAccountArgsV3: {
        data: {
          name: "TEST",
          symbol: "TEST",
          uri: "http://test.com",
          sellerFeeBasisPoints: 0,
          creators: [{
            address: authorityKeypair.publicKey,
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
      payerKey: authorityKeypair.publicKey,
      instructions: [createMetadataInstruction],
    }).compileToLegacyMessage();

    let transaction = new VersionedTransaction(createMetadataMessage);
    transaction.sign([authorityKeypair]);

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

    let [editionAddress] = await findEditionAddress(
      mintAddress,
      TOKEN_METADATA_PROGRAM_ID,
    );

    let authorityNFTTokenAddress = await getAssociatedTokenAddress(
      mintAddress,
      authorityKeypair.publicKey,
    );

    await createAccount(
      provider.connection,
      authorityKeypair,
      mintAddress,
      authorityKeypair.publicKey,
    );

    await mintTo(
      provider.connection,
      authorityKeypair,
      mintAddress,
      authorityNFTTokenAddress,
      authorityKeypair.publicKey,
      1,
    );

    const createMasterEditionV3Instruction =
      createCreateMasterEditionV3Instruction({
        edition: editionAddress,
        mint: mintAddress,
        updateAuthority: authorityKeypair.publicKey,
        mintAuthority: authorityKeypair.publicKey,
        payer: authorityKeypair.publicKey,
        metadata: metadataAddress,
      }, { createMasterEditionArgs: { maxSupply: 1 } });

    let { blockhash: blockhashBeforeCreatingMasterEdition } = await provider
      .connection.getLatestBlockhash();
    let createMasterEditionMessage = new TransactionMessage({
      payerKey: authorityKeypair.publicKey,
      recentBlockhash: blockhashBeforeCreatingMasterEdition,
      instructions: [createMasterEditionV3Instruction],
    }).compileToLegacyMessage();

    let createMasterEditionTransaction = new VersionedTransaction(
      createMasterEditionMessage,
    );
    createMasterEditionTransaction.sign([authorityKeypair]);

    const createMasterEditionSignature = await provider.connection
      .sendTransaction(createMasterEditionTransaction, { skipPreflight: true });

    const {
      blockhash: blockhashAfterCreatingMasterEdition,
      lastValidBlockHeight: blockHeightAfterCreatingMasterEdition,
    } = await provider.connection.getLatestBlockhash();

    let createMasterEditionConfirmation = await provider.connection
      .confirmTransaction({
        signature: createMasterEditionSignature,
        blockhash: blockhashAfterCreatingMasterEdition,
        lastValidBlockHeight: blockHeightAfterCreatingMasterEdition,
      });
  });

  it("create proxy authority, delegate and undelegate", async () => {
    let authorityKeypair = Keypair.generate();
    let delegateKeypair = Keypair.generate();

    await airdrop(authorityKeypair.publicKey, provider.connection);

    let [proxyAuthorityAddress] = findProxyAuthorityAddress(
      authorityKeypair.publicKey,
      program.programId,
    );

    let createProxyAuthorityIx = await program.methods.createProxyAuthority()
      .accounts({
        authority: authorityKeypair.publicKey,
        proxyAuthority: proxyAuthorityAddress,
        systemProgram: SystemProgram.programId,
      }).instruction();

    let { blockhash: blockhashBeforeSendingCreateProxyAuthority } =
      await provider.connection
        .getLatestBlockhash();

    let createProxyAuthorityMessage = new TransactionMessage({
      recentBlockhash: blockhashBeforeSendingCreateProxyAuthority,
      payerKey: authorityKeypair.publicKey,
      instructions: [
        createProxyAuthorityIx,
      ],
    }).compileToLegacyMessage();

    let transaction = new VersionedTransaction(createProxyAuthorityMessage);

    transaction.sign([authorityKeypair]);

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
      adminProxyAuthority.authority.equals(authorityKeypair.publicKey),
      "created proxy authority has an invalid authority address",
    );

    let delegateProxyAuthorityIx = await program.methods
      .delegateProxyAuthority().accounts({
        authority: authorityKeypair.publicKey,
        proxyAuthority: proxyAuthorityAddress,
        delegate: delegateKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      }).instruction();

    let { blockhash: blockhashBeforeDelegation } = await provider.connection
      .getLatestBlockhash();

    let delegateProxyAuthorityMessage = new TransactionMessage({
      recentBlockhash: blockhashBeforeDelegation,
      payerKey: authorityKeypair.publicKey,
      instructions: [delegateProxyAuthorityIx],
    }).compileToLegacyMessage();

    let delegateProxyAuthorityTx = new VersionedTransaction(
      delegateProxyAuthorityMessage,
    );

    delegateProxyAuthorityTx.sign([authorityKeypair]);

    // let delegateProxyAuthorityTx = new Transaction().add(
    //   delegateProxyAuthorityIx,
    // );

    // let delegateProxyAuthoritySignature = await provider.connection
    //   .sendTransaction(delegateProxyAuthorityTx, [authorityKeypair], {
    //     skipPreflight: true,
    //   });

    let delegateProxyAuthoritySignature = await provider.connection
      .sendTransaction(delegateProxyAuthorityTx, {
        skipPreflight: true,
      });

    let {
      blockhash: blockhashAfterDelegation,
      lastValidBlockHeight: blockHeightAfterDelegation,
    } = await provider.connection.getLatestBlockhash();

    let delegateProxyAuthorityConfirmation = await provider.connection
      .confirmTransaction({
        signature: delegateProxyAuthoritySignature,
        blockhash: blockhashAfterDelegation,
        lastValidBlockHeight: blockHeightAfterDelegation,
      });

    if (delegateProxyAuthorityConfirmation.value.err) {
      console.error("delegate proxy authority confirmation contains err.");
      throw new Error(delegateProxyAuthorityConfirmation.value.err.toString());
    }

    let proxyAuthority = await program.account.proxyAuthority.fetch(
      proxyAuthorityAddress,
    );

    assert(
      proxyAuthority.delegates.length === 1,
      "Invalid proxyAuthority delegates length",
    );
    assert(
      proxyAuthority.delegates.at(0).toBase58() ===
        delegateKeypair.publicKey.toBase58(),
      "Invalid proxyAuthority delegate",
    );

    let undelegateProxyAuthorityIx = await program.methods
      .undelegateProxyAuthority().accounts({
        authority: authorityKeypair.publicKey,
        proxyAuthority: proxyAuthorityAddress,
        delegate: delegateKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      }).instruction();

    let { blockhash: blockhashBeforeUndelegation } = await provider.connection
      .getLatestBlockhash();

    // let undelegateProxyAuthorityTx = new Transaction().add(
    //   undelegateProxyAuthorityIx,
    // );

    let undelegateProxyAuthorityMessage = new TransactionMessage({
      recentBlockhash: blockhashBeforeUndelegation,
      payerKey: authorityKeypair.publicKey,
      instructions: [undelegateProxyAuthorityIx],
    }).compileToLegacyMessage();

    let undelegateProxyAuthorityTx = new VersionedTransaction(
      undelegateProxyAuthorityMessage,
    );
    undelegateProxyAuthorityTx.sign([authorityKeypair]);

    let undelegateProxyAuthoritySignature = await provider.connection
      .sendTransaction(undelegateProxyAuthorityTx, {
        skipPreflight: true,
      });

    let {
      blockhash: blockhashAfterUndelegation,
      lastValidBlockHeight: blockHeightAfterUndelegation,
    } = await provider.connection.getLatestBlockhash();

    let undelegateProxyAuthorityConfirmation = await provider.connection
      .confirmTransaction({
        signature: undelegateProxyAuthoritySignature,
        blockhash: blockhashAfterUndelegation,
        lastValidBlockHeight: blockHeightAfterUndelegation,
      });

    if (undelegateProxyAuthorityConfirmation.value.err) {
      console.error("undelegate proxy authority confirmation contains err.");
      throw new Error(
        undelegateProxyAuthorityConfirmation.value.err.toString(),
      );
    }

    proxyAuthority = await program.account.proxyAuthority.fetch(
      proxyAuthorityAddress,
    );

    assert(
      proxyAuthority.delegates.length === 0,
      "proxyAuthority delegates length should be 0",
    );
  });

  it(
    "proxy create metadata accounts v3, proxy create master edition v3",
    async () => {
      let authorityKeypair = Keypair.generate();

      await airdrop(authorityKeypair.publicKey, provider.connection);
      await sleep(500);

      let [proxyAuthorityAddress] = findProxyAuthorityAddress(
        authorityKeypair.publicKey,
        program.programId,
      );

      let createProxyAuthorityIx = await program.methods.createProxyAuthority()
        .accounts({
          authority: authorityKeypair.publicKey,
          proxyAuthority: proxyAuthorityAddress,
          systemProgram: SystemProgram.programId,
        }).instruction();

      let { blockhash: blockhashBeforeSendingCreateProxyAuthority } =
        await provider.connection
          .getLatestBlockhash();

      let createProxyAuthorityMessage = new TransactionMessage({
        recentBlockhash: blockhashBeforeSendingCreateProxyAuthority,
        payerKey: authorityKeypair.publicKey,
        instructions: [
          createProxyAuthorityIx,
        ],
      }).compileToLegacyMessage();

      let transaction = new VersionedTransaction(createProxyAuthorityMessage);

      transaction.sign([authorityKeypair]);

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
        throw new Error(
          "Create Proxy Authority confirmation contains an error.",
        );
      }

      let adminProxyAuthority = await program.account.proxyAuthority.fetch(
        proxyAuthorityAddress,
      );

      assert(
        adminProxyAuthority.authority.equals(authorityKeypair.publicKey),
        "created proxy authority has an invalid authority address",
      );

      let mintAddress = await createMint(
        provider.connection,
        authorityKeypair,
        authorityKeypair.publicKey,
        authorityKeypair.publicKey,
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
      //   mintAuthority: authorityKeypair.publicKey,
      //   systemProgram: SystemProgram.programId,
      // };

      // for (let k in ixAccounts) {
      //   console.log(k, ixAccounts[k].toBase58());
      // }

      let createMetadataAccountsIx = await program.methods
        .proxyCreateMetadataV3(
          "asdf",
          "ASD",
          "http://placekitten.io/500/500",
          [{ key: proxyAuthorityAddress, share: 50, verified: true }, {
            key: authorityKeypair.publicKey,
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
          mintAuthority: authorityKeypair.publicKey,
          authority: authorityKeypair.publicKey,
          systemProgram: SystemProgram.programId,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        }).instruction();

      try {
        let { blockhash: blockhashBeforeSendingCreateMetadataAccounts } =
          await provider.connection.getLatestBlockhash();

        let proxyMetadataMessage = new TransactionMessage({
          payerKey: authorityKeypair.publicKey,
          recentBlockhash: blockhashBeforeSendingCreateMetadataAccounts,
          instructions: [createMetadataAccountsIx],
        }).compileToLegacyMessage();

        let proxyCreateMetadataTransaction = new VersionedTransaction(
          proxyMetadataMessage,
        );
        proxyCreateMetadataTransaction.sign([authorityKeypair]);

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

      let [editionAddress] = await findEditionAddress(
        mintAddress,
        TOKEN_METADATA_PROGRAM_ID,
      );

      let authorityNFTTokenAddress = getAssociatedTokenAddressSync(
        mintAddress,
        authorityKeypair.publicKey,
      );
      let createTokenAccountInstruction =
        createAssociatedTokenAccountInstruction(
          authorityKeypair.publicKey,
          authorityNFTTokenAddress,
          authorityKeypair.publicKey,
          mintAddress,
        );
      let mintToInstruction = createMintToInstruction(
        mintAddress,
        authorityNFTTokenAddress,
        authorityKeypair.publicKey,
        1,
      );

      // let instructionAccounts = {
      //   authority: authorityKeypair.publicKey,
      //   proxyAuthority: proxyAuthorityAddress,
      //   edition: editionAddress,
      //   mint: mintAddress,
      //   mintAuthority: authorityKeypair.publicKey,
      //   metadata: metadataAddress,
      //   tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      //   tokenProgram: TOKEN_PROGRAM_ID,
      //   systemProgram: SystemProgram.programId,
      // };

      // for (let k in instructionAccounts) {
      //   console.log(k, instructionAccounts[k].toString());
      // }

      let proxyCreateMasterEditionIx = await program.methods
        .proxyCreateMasterEditionV3(new anchor.BN(1)).accounts({
          authority: authorityKeypair.publicKey,
          proxyAuthority: proxyAuthorityAddress,
          edition: editionAddress,
          mint: mintAddress,
          mintAuthority: authorityKeypair.publicKey,
          metadata: metadataAddress,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      let { blockhash: blockhashBeforeSendingProxyCreateMasterEdition } =
        await provider.connection.getLatestBlockhash();

      let proxyCreateMasterEditionMessage = new TransactionMessage({
        payerKey: authorityKeypair.publicKey,
        recentBlockhash: blockhashBeforeSendingProxyCreateMasterEdition,
        instructions: [
          createTokenAccountInstruction,
          mintToInstruction,
          proxyCreateMasterEditionIx,
        ],
      }).compileToLegacyMessage();

      let proxyCreateMasterEditionTransaction = new VersionedTransaction(
        proxyCreateMasterEditionMessage,
      );

      proxyCreateMasterEditionTransaction.sign([authorityKeypair]);

      let sig = await provider.connection.sendTransaction(
        proxyCreateMasterEditionTransaction,
        { skipPreflight: true },
      );

      console.log("sig", sig);
    },
  );
});

async function airdrop(address: PublicKey, connection: Connection) {
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

async function findEditionAddress(mint: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync([
    Buffer.from("metadata"),
    programId.toBuffer(),
    mint.toBuffer(),
    Buffer.from("edition"),
  ], programId);
}
