/** DI tokens of customer authentication (ports are interfaces, so no class token). */
export const ACCESS_TOKEN_VERIFIER = Symbol('AccessTokenVerifier');
export const CUSTOMER_REPOSITORY = Symbol('CustomerRepository');

/** Header carrying the end user's Supabase access token, sent by the web server. */
export const CUSTOMER_TOKEN_HEADER = 'x-customer-token';
