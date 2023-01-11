use anchor_lang::{prelude::*, solana_program::program::invoke_signed};
use anchor_spl::token::Mint;
use mpl_token_metadata::{instruction::create_metadata_accounts_v3, state::Collection};

use crate::{
    error::SpaceWrapperError,
    state::{
        creator::Creator,
        proxy_authority::{ProxyAuthority, PROXY},
    },
    utils::is_authorized,
};

#[derive(Accounts)]
pub struct ProxyCreateMetadataV3<'info> {
    #[account(
        seeds = [PROXY.as_ref(), proxy_authority.authority.key().as_ref()],
        bump,
    )]
    pub proxy_authority: Box<Account<'info, ProxyAuthority>>,
    /// CHECK: we are passing this along to the metadata program for validation.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    pub mint: Box<Account<'info, Mint>>,
    /// CHECK: we are passing this along to the metadata program for validation.
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    /// The authority or delegate.
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: we manually check the address of this account against the token-metadata program.
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn process_proxy_create_metadata_v3(
    ctx: Context<ProxyCreateMetadataV3>,
    name: String,
    symbol: String,
    uri: String,
    creators: Vec<Creator>,
    seller_fee_basis_points: u16,
    collection: Option<Pubkey>,
) -> Result<()> {
    let authority = &ctx.accounts.authority;
    let program_id = mpl_token_metadata::id();
    let proxy_authority = &ctx.accounts.proxy_authority;
    let metadata_program_id = mpl_token_metadata::id();
    let metadata = &ctx.accounts.metadata;
    let mint = &ctx.accounts.mint;
    let mint_authority = &ctx.accounts.mint_authority;
    let system_program = &ctx.accounts.system_program;
    let token_metadata_program = &ctx.accounts.token_metadata_program;

    require!(
        is_authorized(proxy_authority, authority.key()),
        SpaceWrapperError::Unauthorized
    );
    require!(
        token_metadata_program.key() == metadata_program_id,
        SpaceWrapperError::InvalidTokenMetadataProgram
    );

    let create_metadata_accounts_v3_instruction = create_metadata_accounts_v3(
        program_id,
        metadata.key(),
        mint.key(),
        mint_authority.key(),
        authority.key(),
        proxy_authority.key(),
        name,
        symbol,
        uri,
        Some(creators.into_iter().map(|c| c.into()).collect()),
        // Some(vec![Creator {
        //     key: authority.clone().key(),
        //     verified: true,
        //     share: 100,
        // }
        // .into()]),
        seller_fee_basis_points,
        true,
        true,
        collection.map(|addr| Collection {
            key: addr,
            verified: false,
        }),
        None, // TODO: Parameterize Uses.
        None, // TODO: Parameterize Collection Details.
    );

    let proxy_authority_bump = *ctx
        .bumps
        .get("proxy_authority")
        .ok_or(SpaceWrapperError::InvalidProxyAuthorityBump)?;

    let account_infos = vec![
        metadata.to_account_info(),
        mint.to_account_info(),
        mint_authority.to_account_info(),
        authority.to_account_info(),
        proxy_authority.to_account_info(),
        system_program.to_account_info(),
    ];

    invoke_signed(
        &create_metadata_accounts_v3_instruction,
        &account_infos,
        &[&[
            PROXY.as_ref(),
            proxy_authority.authority.key().as_ref(),
            &[proxy_authority_bump],
        ]],
    )?;

    Ok(())
}
