use anchor_lang::prelude::*;

#[account]
pub struct ProxyAuthority {
    pub authority: Pubkey,
}
