use anchor_lang::prelude::*;

use mpl_token_metadata::utils::resize_or_reallocate_account_raw;

use crate::{
    error::SpaceWrapperError,
    state::proxy_authority::{ProxyAuthority, PROXY},
};

#[derive(Accounts)]
pub struct UndelegateProxyAuthority<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PROXY.as_ref(), proxy_authority.authority.key().as_ref()],
        bump,
    )]
    pub proxy_authority: Box<Account<'info, ProxyAuthority>>,
    /// CHECK: This can be any account
    pub delegate: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn process_undelegate_proxy_authority(ctx: Context<UndelegateProxyAuthority>) -> Result<()> {
    let authority = &ctx.accounts.authority;
    let proxy_authority = &mut ctx.accounts.proxy_authority;
    let delegate = &ctx.accounts.delegate;
    let system_program = &ctx.accounts.system_program;

    require!(
        authority.key() == proxy_authority.authority,
        SpaceWrapperError::InvalidAuthority
    );
    require!(
        proxy_authority.delegates.contains(&delegate.key()),
        SpaceWrapperError::NotDelegated
    );

    let delegate_idx = proxy_authority
        .delegates
        .iter()
        .position(|&x| x == delegate.key())
        .ok_or(SpaceWrapperError::NotDelegated)?;

    let proxy_authority_account_info = proxy_authority.to_account_info();
    let current_data_len = proxy_authority_account_info.data_len();

    proxy_authority.delegates.swap_remove(delegate_idx);

    resize_or_reallocate_account_raw(
        &proxy_authority_account_info,
        &authority.to_account_info(),
        &system_program.to_account_info(),
        current_data_len - std::mem::size_of::<Pubkey>(),
    )?;

    Ok(())
}
