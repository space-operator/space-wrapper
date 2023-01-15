# Space Wrapper

The Space Wrapper Program allows anyone to create a proxy-authority (a PDA that can sign for things).
Proxy Authorities can sign instructions using `invoke_signed` on behalf of the creator of the Proxy Authority or on behalf of any delegates that have been added.

Proxy Authorities are created when the `create_proxy_authority` instruction is sent to the program.
Delegates may be added by sending the `delegate_proxy_authority` instruction to the program, and they may be removed with the `undelegate_proxy_authority` instruction.

## Testing

1. navigate to the project root `cd space-wrapper`
2. to start amman, run `amman start`
3. run the anchor tests with `anchor test --skip-local-validator`.

> NOTE: This project assumes that it is located in some project directory where `metaplex-program-library` is also located.

## Relative Location of Programs

You need to have `metaplex-program-library` cloned in the same directory where this project is located.

```
your-projects-dir/
    space-wrapper
    metaplex-program-library
```

## Setup

1. Install Solana https://docs.solana.com/cli/install-solana-cli-tools
2. install Amman
   https://www.npmjs.com/package/@metaplex-foundation/amman
   `npm install -g @metaplex-foundation/amman`
3. yarn install and cargo build
4. Build the Metaplex programs, in `metaplex-program-library/token-metadata/program` run `cargo-build-sbf --sbf-out-dir ../../test-programs` to generate the `/test-programs` files
5. Generate a wallet `solana-keygen new --no-bip39-passphrase -s -o ./wallet.json`
6. Update wallet in `Anchor.toml`
7. `amman start`
8. Label and airdrop to wallet
   `amman airdrop ./wallet.json -l wallet`
   `amman airdrop ./wallet.json 10`
9. Open Amman UI at https://amman-explorer.metaplex.com/#/guide
10. Run the anchor tests with `anchor test --skip-local-validator`.
