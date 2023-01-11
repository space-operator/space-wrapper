use anchor_lang::prelude::*;

pub const PROXY: &str = "proxy";

#[account]
pub struct ProxyAuthority {
    pub authority: Pubkey,
    pub delegates: Vec<Pubkey>,
}

impl ProxyAuthority {
    pub const LEN: usize = 8 // discriminator
    + 32 // authority pubkey
    + 4; // empty vec len
}
