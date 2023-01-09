mod error;
mod instructions;
mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::creator::Creator;

declare_id!("2hg5LFTSjk7jH4zsTgBMmqt4zdp9gS2eEGyASvxf6iVT");

#[program]
pub mod space_wrapper {

    use super::*;

    pub fn create_proxy_authority(ctx: Context<CreateProxyAuthority>) -> Result<()> {
        process_create_proxy_authority(ctx)
    }

    pub fn proxy_create_metadata_v3(
        ctx: Context<ProxyCreateMetadataV3>,
        name: String,
        symbol: String,
        uri: String,
        creators: Vec<Creator>,
        seller_fee_basis_points: u16,
        collection: Option<Pubkey>,
    ) -> Result<()> {
        process_proxy_create_metadata_v3(
            ctx,
            name,
            symbol,
            uri,
            creators,
            seller_fee_basis_points,
            collection,
        )
    }
}
