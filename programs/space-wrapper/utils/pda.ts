import { PublicKey } from "@solana/web3.js";

export function findProxyAuthorityAddress(
  authority: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([
    Buffer.from("proxy"),
    authority.toBuffer(),
  ], programId);
}
