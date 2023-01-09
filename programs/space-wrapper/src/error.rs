use anchor_lang::prelude::*;

#[error_code]
pub enum SpaceWrapperError {
    #[msg("Invalid proxy authority bump seed.")]
    InvalidProxyAuthorityBump,
}
