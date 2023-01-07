use std::boxed::Box;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::{invoke, invoke_signed};
use anchor_spl::token::Mint;
use mpl_token_metadata::{instruction::create_metadata_accounts_v3, state::Collection};

declare_id!("2hg5LFTSjk7jH4zsTgBMmqt4zdp9gS2eEGyASvxf6iVT");

#[program]
pub mod space_wrapper {

    use super::*;

    pub fn create_proxy_authority(ctx: Context<CreateProxyAuthority>) -> Result<()> {
        let proxy_authority = &mut ctx.accounts.proxy_authority;

        proxy_authority.authority = *ctx.accounts.authority.key;

        Ok(())
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
        let authority = &ctx.accounts.authority;
        let program_id = mpl_token_metadata::id();
        let proxy_authority = &ctx.accounts.proxy_authority;
        let metadata_program_id = mpl_token_metadata::id();
        let metadata = &ctx.accounts.metadata;
        let mint = &ctx.accounts.mint;
        let mint_authority = &ctx.accounts.mint_authority;
        let system_program = &ctx.accounts.system_program;
        let rent = &ctx.accounts.rent;

        let create_metadata_accounts_v3_instruction = create_metadata_accounts_v3(
            program_id,
            metadata.key(),
            mint.key(),
            mint_authority.key(),
            authority.key(),
            authority.key(),
            name,
            symbol,
            uri,
            // Some(creators.into_iter().map(|c| c.into()).collect()),
            None,
            seller_fee_basis_points,
            true,
            true,
            collection.map(|addr| Collection {
                key: addr,
                verified: false,
            }),
            None,
            None,
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
            // proxy_authority.to_account_info(),
            authority.to_account_info(),
            system_program.to_account_info(),
            rent.to_account_info(),
        ];

        msg!("invoking token metadata");

        // invoke_signed(
        //     &create_metadata_accounts_v3_instruction,
        //     &account_infos,
        //     &[&[
        //         b"proxy".as_ref(),
        //         authority.key().as_ref(),
        //         &[proxy_authority_bump],
        //     ]],
        // )?;

        invoke(&create_metadata_accounts_v3_instruction, &account_infos)?;

        Ok(())
    }
}

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

#[account]
pub struct ProxyAuthority {
    authority: Pubkey,
}

#[derive(Accounts)]
pub struct ProxyCreateMetadataV3<'info> {
    #[account(
        seeds = [b"proxy".as_ref(), authority.key().as_ref()],
        bump,
    )]
    pub proxy_authority: Box<Account<'info, ProxyAuthority>>,
    /// CHECK: we are passing this along to the metadata program for validation.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    pub mint: Box<Account<'info, Mint>>,
    /// CHECK: we are passing this along to the metadata program for validation.
    pub mint_authority: Signer<'info>,
    /// CHECK: bullshit
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

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

#[error_code]
pub enum SpaceWrapperError {
    #[msg("Invalid proxy authority bump seed.")]
    InvalidProxyAuthorityBump,
}
