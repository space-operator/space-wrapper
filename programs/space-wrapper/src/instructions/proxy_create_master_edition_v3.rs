use anchor_lang::{prelude::*, solana_program::program::invoke_signed};
use anchor_spl::token::{Mint, Token};

use mpl_token_metadata::instruction::create_master_edition_v3;

use crate::{
    error::SpaceWrapperError,
    state::proxy_authority::{ProxyAuthority, PROXY},
    utils::is_authorized,
};

#[derive(Accounts)]
pub struct ProxyCreateMasterEditionV3<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PROXY.as_ref(), proxy_authority.authority.key().as_ref()],
        bump,
    )]
    pub proxy_authority: Box<Account<'info, ProxyAuthority>>,
    /// CHECK: this is an unallocated account that will be passed to the token metadata program
    #[account(mut)]
    pub edition: UncheckedAccount<'info>,
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,
    pub mint_authority: Signer<'info>,
    /// CHECK: token metadata program will check this account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: we will manually check this account against the token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn process_proxy_create_master_edition_v3(
    ctx: Context<ProxyCreateMasterEditionV3>,
    max_supply: Option<u64>,
) -> Result<()> {
    let authority = &ctx.accounts.authority;
    let proxy_authority = &ctx.accounts.proxy_authority;
    let edition = &ctx.accounts.edition;
    let mint = &ctx.accounts.mint;
    let mint_authority = &ctx.accounts.mint_authority;
    let metadata = &ctx.accounts.metadata;
    let token_metadata_program = &ctx.accounts.token_metadata_program;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;

    require!(
        is_authorized(proxy_authority, authority.key()),
        SpaceWrapperError::Unauthorized
    );
    require!(
        token_metadata_program.key() == mpl_token_metadata::id(),
        SpaceWrapperError::InvalidTokenMetadataProgram
    );

    let proxy_authority_bump = *ctx
        .bumps
        .get("proxy_authority")
        .ok_or(SpaceWrapperError::InvalidProxyAuthorityBump)?;

    let create_master_edition_v3_instruction = create_master_edition_v3(
        mpl_token_metadata::id(),
        edition.key(),
        mint.key(),
        proxy_authority.key(),
        mint_authority.key(),
        metadata.key(),
        authority.key(),
        max_supply,
        // Some(1),
    );

    let account_infos = vec![
        edition.to_account_info(),
        mint.to_account_info(),
        proxy_authority.to_account_info(),
        mint_authority.to_account_info(),
        authority.to_account_info(),
        metadata.to_account_info(),
        token_program.to_account_info(),
        system_program.to_account_info(),
    ];

    invoke_signed(
        &create_master_edition_v3_instruction,
        &account_infos,
        &[&[
            PROXY.as_ref(),
            proxy_authority.authority.key().as_ref(),
            &[proxy_authority_bump],
        ]],
    )?;

    Ok(())
}
