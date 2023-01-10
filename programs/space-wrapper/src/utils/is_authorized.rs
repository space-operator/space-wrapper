use anchor_lang::prelude::*;

use crate::state::proxy_authority::ProxyAuthority;

pub fn is_authorized(proxy_authority: &ProxyAuthority, authority_pubkey: Pubkey) -> bool {
    proxy_authority.authority == authority_pubkey
        || proxy_authority.delegates.contains(&authority_pubkey)
}
