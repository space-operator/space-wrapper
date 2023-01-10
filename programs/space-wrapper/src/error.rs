use anchor_lang::prelude::*;

#[error_code]
pub enum SpaceWrapperError {
    #[msg("Authority does not match ProxyAuthority's authority")]
    InvalidAuthority,
    #[msg("Invalid proxy authority bump seed")]
    InvalidProxyAuthorityBump,
    #[msg("Supplied Token Metadata Program ID is incorrect")]
    InvalidTokenMetadataProgram,
    #[msg("The delegate is already delegated")]
    AlreadyDelegated,
    #[msg("The delegate is not delegated")]
    NotDelegated,
    #[msg("Sender is not a delegate or authority")]
    Unauthorized,
}
