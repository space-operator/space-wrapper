use anchor_lang::prelude::*;

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct Creator {
    key: Pubkey,
    verified: bool,
    share: u8,
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
