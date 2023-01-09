use anchor_lang::prelude::*;

use crate::state::proxy_authority::ProxyAuthority;

#[derive(Accounts)]
pub struct CreateProxyAuthority<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32,
        seeds = [b"proxy".as_ref(), authority.key().as_ref()],
        bump
    )]
    pub proxy_authority: Account<'info, ProxyAuthority>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn process_create_proxy_authority(ctx: Context<CreateProxyAuthority>) -> Result<()> {
    let proxy_authority = &mut ctx.accounts.proxy_authority;

    proxy_authority.authority = *ctx.accounts.authority.key;

    Ok(())
}
