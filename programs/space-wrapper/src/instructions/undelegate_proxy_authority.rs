use anchor_lang::prelude::*;

use crate::{error::SpaceWrapperError, state::proxy_authority::ProxyAuthority};

#[derive(Accounts)]
pub struct UndelegateProxyAuthority<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"proxy".as_ref(), proxy_authority.authority.key().as_ref()],
        bump,
    )]
    pub proxy_authority: Box<Account<'info, ProxyAuthority>>,
    /// CHECK: This can be any account
    pub delegate: UncheckedAccount<'info>,
}

pub fn process_undelegate_proxy_authority(ctx: Context<UndelegateProxyAuthority>) -> Result<()> {
    let authority = &ctx.accounts.authority;
    let proxy_authority = &mut ctx.accounts.proxy_authority;
    let delegate = &ctx.accounts.delegate;

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

    proxy_authority.delegates.swap_remove(delegate_idx);

    Ok(())
}
