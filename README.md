# Space Wrapper

The Space Wrapper Program allows anyone to create a proxy-authority (a PDA that can sign for things).
Proxy Authorities can sign instructions using `invoke_signed` on behalf of the creator of the Proxy Authority or on behalf of any delegates that have been added.

Proxy Authorities are created when the `create_proxy_authority` instruction is sent to the program.
Delegates may be added by sending the `delegate_proxy_authority` instruction to the program, and they may be removed with the `undelegate_proxy_authority` instruction.

## Testing
1. navigate to the project root `cd space-wrapper`
1. to start amman, run `amman start`
1. run the anchor tests with `anchor test --skip-local-validator`.

> NOTE: This project assumes that it is located in some project directory where `metaplex-program-library` is also located.

## Relative Location of Programs
You need to have `metaplex-program-library` cloned in the same directory where this project is located.

```
your-projects-dir/
    space-wrapper
    metaplex-program-library
```