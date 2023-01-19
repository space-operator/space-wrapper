pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;
use instructions::*;
use state::creator::Creator;

declare_id!("295QjveZJsZ198fYk9FTKaJLsgAWNdXKHsM6Qkb3dsVn");

#[program]
pub mod space_wrapper {
    use super::*;

    pub fn create_proxy_authority(ctx: Context<CreateProxyAuthority>) -> Result<()> {
        process_create_proxy_authority(ctx)
    }

    pub fn delegate_proxy_authority(ctx: Context<DelegateProxyAuthority>) -> Result<()> {
        process_delegate_proxy_authority(ctx)
    }

    pub fn undelegate_proxy_authority(ctx: Context<UndelegateProxyAuthority>) -> Result<()> {
        process_undelegate_proxy_authority(ctx)
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

    pub fn proxy_create_master_edition_v3(
        ctx: Context<ProxyCreateMasterEditionV3>,
        max_supply: Option<u64>,
    ) -> Result<()> {
        process_proxy_create_master_edition_v3(ctx, max_supply)
    }

    // proxy_verify_collection
    // proxy_update_metadata
}
