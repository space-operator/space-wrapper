use anchor_lang::prelude::*;

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct Creator {
    pub key: Pubkey,
    pub verified: bool,
    pub share: u8,
}

impl From<Creator> for mpl_token_metadata::state::Creator {
    fn from(creator: Creator) -> Self {
        Self {
            address: creator.key,
            verified: creator.verified,
            share: creator.share,
        }
    }
}
