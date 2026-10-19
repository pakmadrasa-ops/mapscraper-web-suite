import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createHash, createPrivateKey, createPublicKey, randomBytes, randomUUID, scrypt, sign, timingSafeEqual, verify } from 'crypto';
import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { parseScraperJsonOutput } from './src/utils/jsonParser.ts';
import type { PlaceResult } from './src/types/scraper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const GOOGLE_OIDC_ISSUER = 'https://accounts.google.com';
const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/certs';
const FACEBOOK_AUTHORIZATION_ENDPOINT = 'https://www.facebook.com/v20.0/dialog/oauth';
const FACEBOOK_TOKEN_ENDPOINT = 'https://graph.facebook.com/v20.0/oauth/access_token';
const FACEBOOK_GRAPH_ENDPOINT = 'https://graph.facebook.com/v20.0/me';
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_AUTHORIZATION_ENDPOINT = `${APPLE_ISSUER}/auth/authorize`;
const APPLE_TOKEN_ENDPOINT = `${APPLE_ISSUER}/auth/token`;
const APPLE_JWKS_ENDPOINT = `${APPLE_ISSUER}/auth/keys`;
const MICROSOFT_AUTHORIZATION_ENDPOINT = 'https://login.microsoftonline.com';
const MICROSOFT_JWKS_ENDPOINT = 'https://login.microsoftonline.com/common/discovery/v2.0/keys';
const SESSION_COOKIE = 'mapscraper_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 10;
const authDataDir = process.env.MAPSCRAPER_DATA_DIR
  ? path.resolve(process.env.MAPSCRAPER_DATA_DIR)
  : path.join(homedir(), '.mapscraper-web-suite');
const authUsersPath = path.join(authDataDir, 'auth-users.json');
const authBalancesPath = path.join(authDataDir, 'auth-balances.json');
const STARTER_TOKENS = 250;
type OAuthProvider = 'google' | 'facebook' | 'apple' | 'microsoft';
const authSessions = new Map<string, {
  id: string;
  expiresAt: number;
  user: { id: string; email: string; name: string; picture: string; provider: 'local' | 'google' | 'facebook' | 'apple' | 'microsoft' };
}>();
interface EmailAccount {
  id: string;
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
}
const emailAccounts = new Map<string, EmailAccount>();
const userTokenBalances = new Map<string, number>();
const authAttempts = new Map<string, { count: number; windowStartedAt: number }>();
const pendingOAuthLogins = new Map<string, {
  nonce: string;
  codeVerifier: string;
  createdAt: number;
  provider: 'google' | 'facebook' | 'apple' | 'microsoft';
}>();

/**
 * Determine port accurately:
 * In development (NODE_ENV !== 'production'), always use 3000 (AI Studio standard).
 * In production (Cloud Run), use process.env.PORT || 8080.
 * Also parses --port CLI args if passed.
 */
function resolvePort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' || args[i] === '-p') {
      const p = parseInt(args[i + 1], 10);
      if (!isNaN(p)) return p;
    }
    if (args[i].startsWith('--port=')) {
      const p = parseInt(args[i].split('=')[1], 10);
      if (!isNaN(p)) return p;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }

  return parseInt(process.env.PORT || '8080', 10);
}

const PORT = resolvePort();

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use('/api/auth', (_req, res) => {
  res.status(404).json({ success: false, message: 'Sign-in and account management are disabled.' });
});

function isOAuthProvider(provider: string): provider is OAuthProvider {
  return ['google', 'facebook', 'apple', 'microsoft'].includes(provider);
}

function isRedirectUriAllowed(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const redirectUri = new URL(value);
    return process.env.NODE_ENV !== 'production'
      ? redirectUri.protocol === 'https:' || redirectUri.hostname === 'localhost'
      : redirectUri.protocol === 'https:';
  } catch {
    return false;
  }
}

function isOAuthProviderConfigured(provider: OAuthProvider): boolean {
  if (provider === 'google') {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) &&
      isRedirectUriAllowed(process.env.GOOGLE_REDIRECT_URI);
  }
  if (provider === 'facebook') {
    return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) &&
      isRedirectUriAllowed(process.env.FACEBOOK_REDIRECT_URI);
  }
  if (provider === 'apple') {
    return Boolean(
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY
    ) && isRedirectUriAllowed(process.env.APPLE_REDIRECT_URI);
  }
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) &&
    /^[A-Za-z0-9.-]+$/.test(tenant) &&
    isRedirectUriAllowed(process.env.MICROSOFT_REDIRECT_URI);
}

function getSessionToken(req: express.Request): string | undefined {
  const cookies = req.headers.cookie?.split(';') ?? [];
  const sessionCookie = cookies.map(cookie => cookie.trim()).find(cookie => cookie.startsWith(`${SESSION_COOKIE}=`));
  return sessionCookie?.slice(SESSION_COOKIE.length + 1);
}

function loadEmailAccounts(): void {
  fs.mkdirSync(authDataDir, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') fs.chmodSync(authDataDir, 0o700);
  if (!fs.existsSync(authUsersPath)) return;

  const parsed: unknown = JSON.parse(fs.readFileSync(authUsersPath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('Email account store must contain a JSON array.');
  for (const account of parsed) {
    if (
      !account || typeof account !== 'object' ||
      !('id' in account) || typeof account.id !== 'string' ||
      !('email' in account) || typeof account.email !== 'string' ||
      !('name' in account) || typeof account.name !== 'string' ||
      !('salt' in account) || typeof account.salt !== 'string' ||
      !('passwordHash' in account) || typeof account.passwordHash !== 'string' ||
      Buffer.from(account.salt, 'base64url').length !== 16 ||
      Buffer.from(account.passwordHash, 'base64url').length !== 64 ||
      emailAccounts.has(account.email)
    ) {
      throw new Error('Email account store contains an invalid or duplicate account.');
    }
    emailAccounts.set(account.email, {
      id: account.id,
      email: account.email,
      name: account.name,
      salt: account.salt,
      passwordHash: account.passwordHash,
    });
  }
}

function saveEmailAccounts(): void {
  const temporaryPath = `${authUsersPath}.${randomBytes(8).toString('hex')}.tmp`;
  fs.writeFileSync(
    temporaryPath,
    JSON.stringify([...emailAccounts.values()], null, 2),
    { encoding: 'utf8', mode: 0o600 }
  );
  try {
    if (process.platform !== 'win32') fs.chmodSync(temporaryPath, 0o600);
    fs.renameSync(temporaryPath, authUsersPath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    throw error;
  }
}

function loadUserTokenBalances(): void {
  if (!fs.existsSync(authBalancesPath)) return;

  const parsed: unknown = JSON.parse(fs.readFileSync(authBalancesPath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Account token store must contain a JSON object.');
  }
  for (const [userKey, balance] of Object.entries(parsed)) {
    if (!userKey || typeof balance !== 'number' || !Number.isSafeInteger(balance) || balance < 0) {
      throw new Error('Account token store contains an invalid balance.');
    }
    userTokenBalances.set(userKey, balance);
  }
}

function saveUserTokenBalances(): void {
  const temporaryPath = `${authBalancesPath}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(
      temporaryPath,
      JSON.stringify(Object.fromEntries(userTokenBalances), null, 2),
      { encoding: 'utf8', mode: 0o600 }
    );
    if (process.platform !== 'win32') fs.chmodSync(temporaryPath, 0o600);
    fs.renameSync(temporaryPath, authBalancesPath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    throw error;
  }
}

function getUserBalanceKey(user: { id: string; provider: 'local' | OAuthProvider }): string {
  return `${user.provider}:${user.id}`;
}

function getUserTokenBalance(userKey: string): number {
  const balance = userTokenBalances.get(userKey);
  if (balance === undefined) {
    throw new Error(`Token balance is missing for account ${userKey}.`);
  }
  return balance;
}

function initializeUserTokenBalance(user: { id: string; provider: 'local' | OAuthProvider }): number {
  const userKey = getUserBalanceKey(user);
  const existingBalance = userTokenBalances.get(userKey);
  if (existingBalance !== undefined) return existingBalance;

  userTokenBalances.set(userKey, STARTER_TOKENS);
  try {
    saveUserTokenBalances();
  } catch (error) {
    userTokenBalances.delete(userKey);
    throw error;
  }
  return STARTER_TOKENS;
}

function debitUserTokens(userKey: string, amount: number): number {
  const currentBalance = getUserTokenBalance(userKey);
  if (!Number.isSafeInteger(amount) || amount < 0 || currentBalance < amount) {
    throw new Error('The account does not have enough tokens to complete this query.');
  }
  const updatedBalance = currentBalance - amount;
  userTokenBalances.set(userKey, updatedBalance);
  try {
    saveUserTokenBalances();
  } catch (error) {
    userTokenBalances.set(userKey, currentBalance);
    throw error;
  }
  return updatedBalance;
}

function hashPassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function consumeAuthAttempt(req: express.Request, res: express.Response): boolean {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attempt = authAttempts.get(key);
  if (!attempt || now - attempt.windowStartedAt >= AUTH_ATTEMPT_WINDOW_MS) {
    if (!attempt && authAttempts.size >= 10_000) {
      for (const [address, entry] of authAttempts) {
        if (now - entry.windowStartedAt >= AUTH_ATTEMPT_WINDOW_MS) authAttempts.delete(address);
      }
      if (authAttempts.size >= 10_000) {
        res.status(503).json({ success: false, message: 'The sign-in service is temporarily at capacity.' });
        return false;
      }
    }
    authAttempts.set(key, { count: 1, windowStartedAt: now });
    return true;
  }
  if (attempt.count >= MAX_AUTH_ATTEMPTS) {
    res.status(429).json({ success: false, message: 'Too many sign-in attempts. Please try again in 15 minutes.' });
    return false;
  }
  attempt.count += 1;
  return true;
}

function createSession(
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
    provider: 'local' | OAuthProvider;
  },
  res: express.Response
): boolean {
  for (const [token, session] of authSessions) {
    if (session.expiresAt <= Date.now()) authSessions.delete(token);
  }
  if (authSessions.size >= 10_000) return false;

  const sessionToken = randomBytes(32).toString('base64url');
  authSessions.set(sessionToken, {
    id: randomBytes(16).toString('hex'),
    expiresAt: Date.now() + SESSION_DURATION_MS,
    user,
  });
  setSessionCookie(res, sessionToken);
  return true;
}

function getAuthenticatedSession(req: express.Request) {
  const token = getSessionToken(req);
  if (!token) return undefined;

  const session = authSessions.get(token);
  if (session && session.expiresAt > Date.now()) return session;
  if (session) authSessions.delete(token);
  return undefined;
}

function requireAuthenticatedSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!getAuthenticatedSession(req)) {
    res.status(401).json({ success: false, message: 'Sign in to access scraper APIs.' });
    return;
  }
  if (req.method !== 'GET' && !isSameOriginRequest(req)) {
    res.status(403).json({ success: false, message: 'Cross-origin requests are not allowed.' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
}

function clearSessionCookie(res: express.Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function clearOAuthStateCookie(res: express.Response, provider: OAuthProvider): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `mapscraper_${provider}_state=; Path=/api/auth/${provider}; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
}

function setSessionCookie(res: express.Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`
  );
}

function isSameOriginRequest(req: express.Request): boolean {
  const origin = req.get('origin');
  const host = req.get('host');
  if (!origin || !host) return false;
  try {
    const originUrl = new URL(origin);
    return ['http:', 'https:'].includes(originUrl.protocol) && originUrl.host === host;
  } catch {
    return false;
  }
}

function getOAuthClientId(provider: OAuthProvider): string {
  if (provider === 'google') return process.env.GOOGLE_CLIENT_ID!;
  if (provider === 'facebook') return process.env.FACEBOOK_APP_ID!;
  if (provider === 'apple') return process.env.APPLE_CLIENT_ID!;
  return process.env.MICROSOFT_CLIENT_ID!;
}

function getOAuthRedirectUri(provider: OAuthProvider): string {
  if (provider === 'google') return process.env.GOOGLE_REDIRECT_URI!;
  if (provider === 'facebook') return process.env.FACEBOOK_REDIRECT_URI!;
  if (provider === 'apple') return process.env.APPLE_REDIRECT_URI!;
  return process.env.MICROSOFT_REDIRECT_URI!;
}

function getOAuthTokenEndpoint(provider: OAuthProvider): string {
  if (provider === 'google') return GOOGLE_TOKEN_ENDPOINT;
  if (provider === 'facebook') return FACEBOOK_TOKEN_ENDPOINT;
  if (provider === 'apple') return APPLE_TOKEN_ENDPOINT;
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
  return `${MICROSOFT_AUTHORIZATION_ENDPOINT}/${tenant}/oauth2/v2.0/token`;
}

function getOAuthAuthorizationEndpoint(provider: OAuthProvider): string {
  if (provider === 'google') return GOOGLE_AUTHORIZATION_ENDPOINT;
  if (provider === 'facebook') return FACEBOOK_AUTHORIZATION_ENDPOINT;
  if (provider === 'apple') return APPLE_AUTHORIZATION_ENDPOINT;
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
  return `${MICROSOFT_AUTHORIZATION_ENDPOINT}/${tenant}/oauth2/v2.0/authorize`;
}

function createAppleClientSecret(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: process.env.APPLE_KEY_ID })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: process.env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 5 * 60,
    aud: APPLE_ISSUER,
    sub: process.env.APPLE_CLIENT_ID,
  })).toString('base64url');
  const signingInput = `${header}.${claims}`;
  const privateKey = createPrivateKey(process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n'));
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
  return `${signingInput}.${signature}`;
}

async function validateOidcToken(
  token: string,
  provider: Exclude<OAuthProvider, 'facebook'>,
  expectedNonce: string
): Promise<{ id: string; email: string; name: string; picture: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error(`${provider} ID token is malformed.`);
  const header: unknown = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const claims: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (
    !header || typeof header !== 'object' ||
    !('kid' in header) || typeof header.kid !== 'string' ||
    !('alg' in header) || !['RS256', 'ES256'].includes(String(header.alg)) ||
    !claims || typeof claims !== 'object'
  ) {
    throw new Error(`${provider} ID token has invalid signing metadata.`);
  }

  const keysEndpoint = provider === 'google'
    ? GOOGLE_JWKS_ENDPOINT
    : provider === 'apple'
      ? APPLE_JWKS_ENDPOINT
      : MICROSOFT_JWKS_ENDPOINT;
  const keysResponse = await fetch(keysEndpoint, { signal: AbortSignal.timeout(10_000) });
  if (!keysResponse.ok) throw new Error(`${provider} signing keys could not be loaded (${keysResponse.status}).`);
  const jwks: unknown = await keysResponse.json();
  if (!jwks || typeof jwks !== 'object' || !('keys' in jwks) || !Array.isArray(jwks.keys)) {
    throw new Error(`${provider} signing keys response is invalid.`);
  }
  const signingKey = jwks.keys.find(key =>
    key && typeof key === 'object' && 'kid' in key && key.kid === header.kid
  );
  if (!signingKey || typeof signingKey !== 'object') throw new Error(`${provider} signing key was not found.`);

  const publicKey = createPublicKey({ key: signingKey as JsonWebKey, format: 'jwk' });
  const algorithm = header.alg === 'ES256' ? 'sha256' : 'RSA-SHA256';
  const signatureOptions = header.alg === 'ES256' ? { dsaEncoding: 'ieee-p1363' as const } : undefined;
  const signatureIsValid = verify(
    algorithm,
    Buffer.from(`${parts[0]}.${parts[1]}`),
    signatureOptions ? { key: publicKey, ...signatureOptions } : publicKey,
    Buffer.from(parts[2], 'base64url')
  );
  if (!signatureIsValid) throw new Error(`${provider} ID token signature is invalid.`);

  const idClaims = claims as Record<string, unknown>;
  const clientId = getOAuthClientId(provider);
  const audiences = Array.isArray(idClaims.aud) ? idClaims.aud : [idClaims.aud];
  const expiry = typeof idClaims.exp === 'number' ? idClaims.exp * 1000 : 0;
  const issuedAt = typeof idClaims.iat === 'number' ? idClaims.iat * 1000 : 0;
  const tenantId = typeof idClaims.tid === 'string' ? idClaims.tid : '';
  const configuredTenant = process.env.MICROSOFT_TENANT_ID || 'common';
  const audienceValid = audiences.includes(clientId) &&
    (audiences.length === 1 || idClaims.azp === clientId);
  const issuerValid = provider === 'google'
    ? [GOOGLE_OIDC_ISSUER, 'accounts.google.com'].includes(String(idClaims.iss))
    : provider === 'apple'
      ? idClaims.iss === APPLE_ISSUER
      : /^[0-9a-f-]{36}$/i.test(tenantId) &&
        (configuredTenant === 'common' || configuredTenant.toLowerCase() === tenantId.toLowerCase()) &&
        idClaims.iss === `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const email = typeof idClaims.email === 'string'
    ? idClaims.email
    : provider === 'microsoft' && typeof idClaims.preferred_username === 'string'
      ? idClaims.preferred_username
      : '';
  const emailVerified = provider === 'microsoft' ||
    idClaims.email_verified === true ||
    idClaims.email_verified === 'true';
  if (
    !issuerValid ||
    !audienceValid ||
    (typeof idClaims.azp === 'string' && idClaims.azp !== clientId) ||
    expiry <= Date.now() ||
    issuedAt <= 0 ||
    issuedAt > Date.now() + 60_000 ||
    expiry <= issuedAt ||
    (typeof idClaims.nbf === 'number' && idClaims.nbf * 1000 > Date.now()) ||
    idClaims.nonce !== expectedNonce ||
    typeof idClaims.sub !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !emailVerified
  ) {
    throw new Error(`${provider} ID token claims are invalid.`);
  }

  return {
    id: idClaims.sub,
    email: email.trim().toLowerCase(),
    name: typeof idClaims.name === 'string' ? idClaims.name : email,
    picture: typeof idClaims.picture === 'string' ? idClaims.picture : '',
  };
}

app.get('/api/auth/config', (_req, res) => {
  const providers = (['google', 'facebook', 'apple', 'microsoft'] as const)
    .filter(isOAuthProviderConfigured);
  res.json({ providers, googleConfigured: providers.includes('google') });
});

app.post('/api/auth/register', async (req, res) => {
  if (!isSameOriginRequest(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin requests are not allowed.' });
  }
  if (!consumeAuthAttempt(req, res)) return;

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    name.length < 2 || name.length > 80 ||
    password.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email, a name of 2–80 characters, and a password.',
    });
  }
  if (emailAccounts.has(email)) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists. Sign in instead.' });
  }

  try {
    const salt = randomBytes(16);
    const passwordHash = await hashPassword(password, salt);
    const account: EmailAccount = {
      id: randomBytes(16).toString('hex'),
      email,
      name,
      salt: salt.toString('base64url'),
      passwordHash: passwordHash.toString('base64url'),
    };
    emailAccounts.set(email, account);
    try {
      saveEmailAccounts();
    } catch (error) {
      emailAccounts.delete(email);
      throw error;
    }
    const tokens = initializeUserTokenBalance({ id: account.id, provider: 'local' });
    if (!createSession({ id: account.id, email, name, picture: '', provider: 'local' }, res)) {
      return res.status(503).json({ success: false, message: 'The sign-in service is temporarily at capacity.' });
    }
    return res.status(201).json({
      success: true,
      user: { id: account.id, email, name, picture: '', provider: 'local', tokens },
    });
  } catch (error) {
    console.error('[AUTH] Could not register email account:', error);
    return res.status(500).json({ success: false, message: 'Could not create the account. Please try again later.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!isSameOriginRequest(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin requests are not allowed.' });
  }
  if (!consumeAuthAttempt(req, res)) return;

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ success: false, message: 'Enter a valid email and password.' });
  }

  try {
    const account = emailAccounts.get(email);
    const salt = account ? Buffer.from(account.salt, 'base64url') : Buffer.alloc(16);
    const expectedHash = account ? Buffer.from(account.passwordHash, 'base64url') : Buffer.alloc(64);
    const providedHash = await hashPassword(password, salt);
    if (!account || !timingSafeEqual(providedHash, expectedHash)) {
      return res.status(401).json({ success: false, message: 'Email or password is incorrect.' });
    }
    const tokens = initializeUserTokenBalance({ id: account.id, provider: 'local' });
    if (!createSession({ id: account.id, email, name: account.name, picture: '', provider: 'local' }, res)) {
      return res.status(503).json({ success: false, message: 'The sign-in service is temporarily at capacity.' });
    }
    return res.json({
      success: true,
      user: { id: account.id, email, name: account.name, picture: '', provider: 'local', tokens },
    });
  } catch (error) {
    console.error('[AUTH] Email sign-in failed:', error);
    return res.status(500).json({ success: false, message: 'Could not sign in. Please try again later.' });
  }
});

app.get('/api/auth/:provider', (req, res, next) => {
  const provider = req.params.provider;
  if (!isOAuthProvider(provider)) return next();
  if (!isOAuthProviderConfigured(provider)) {
    return res.status(503).send(`${provider} sign-in is not configured on this server.`);
  }

  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const now = Date.now();
  for (const [pendingState, login] of pendingOAuthLogins) {
    if (now - login.createdAt > 10 * 60 * 1000) pendingOAuthLogins.delete(pendingState);
  }
  for (const [token, session] of authSessions) {
    if (session.expiresAt <= now) authSessions.delete(token);
  }
  if (pendingOAuthLogins.size >= 1000) {
    return res.status(429).send('Too many sign-in attempts are in progress. Please try again shortly.');
  }
  pendingOAuthLogins.set(state, { nonce, codeVerifier, createdAt: now, provider });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `mapscraper_${provider}_state=${state}; Path=/api/auth/${provider}; HttpOnly; SameSite=Lax; Max-Age=600${secure}`
  );

  const params: Record<string, string> = {
    client_id: getOAuthClientId(provider),
    redirect_uri: getOAuthRedirectUri(provider),
    response_type: 'code',
    scope: provider === 'facebook' ? 'email,public_profile' : 'openid email profile',
    state,
  };
  if (provider !== 'facebook') {
    params.nonce = nonce;
    params.code_challenge = createHash('sha256').update(codeVerifier).digest('base64url');
    params.code_challenge_method = 'S256';
    if (provider === 'apple') params.response_mode = 'query';
  }
  const authorizationUrl = new URL(getOAuthAuthorizationEndpoint(provider));
  authorizationUrl.search = new URLSearchParams(params).toString();
  return res.redirect(302, authorizationUrl.toString());
});

app.get('/api/auth/:provider/callback', async (req, res) => {
  const providerName = req.params.provider;
  if (!isOAuthProvider(providerName)) {
    return res.status(404).send('Sign-in provider not found.');
  }
  const provider = providerName;
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateCookie = req.headers.cookie?.split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`mapscraper_${provider}_state=`))
    ?.slice(`mapscraper_${provider}_state=`.length);
  const login = pendingOAuthLogins.get(state);
  pendingOAuthLogins.delete(state);
  clearOAuthStateCookie(res, provider);

  if (
    !isOAuthProviderConfigured(provider) ||
    !login ||
    login.provider !== provider ||
    stateCookie !== state ||
    Date.now() - login.createdAt > 10 * 60 * 1000 ||
    !code
  ) {
    return res.status(400).send(`${provider} sign-in could not be verified. Please return to the app and try again.`);
  }

  try {
    const clientSecret = provider === 'google'
      ? process.env.GOOGLE_CLIENT_SECRET!
      : provider === 'facebook'
        ? process.env.FACEBOOK_APP_SECRET!
        : provider === 'apple'
          ? createAppleClientSecret()
          : process.env.MICROSOFT_CLIENT_SECRET!;
    const tokenParams: Record<string, string> = {
      code,
      client_id: getOAuthClientId(provider),
      client_secret: clientSecret,
      redirect_uri: getOAuthRedirectUri(provider),
      grant_type: 'authorization_code',
    };
    if (provider !== 'facebook') tokenParams.code_verifier = login.codeVerifier;
    const tokenResponse = await fetch(getOAuthTokenEndpoint(provider), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) throw new Error(`${provider} token exchange failed (${tokenResponse.status}).`);
    const tokenPayload: unknown = await tokenResponse.json();
    if (!tokenPayload || typeof tokenPayload !== 'object') {
      throw new Error(`${provider} token response is invalid.`);
    }

    let user: { id: string; email: string; name: string; picture: string; provider: OAuthProvider };
    if (provider === 'facebook') {
      if (!('access_token' in tokenPayload) || typeof tokenPayload.access_token !== 'string') {
        throw new Error('Facebook response did not include an access token.');
      }
      const debugUrl = new URL('https://graph.facebook.com/v20.0/debug_token');
      debugUrl.searchParams.set('input_token', tokenPayload.access_token);
      debugUrl.searchParams.set('access_token', `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`);
      const debugResponse = await fetch(debugUrl, { signal: AbortSignal.timeout(10_000) });
      if (!debugResponse.ok) throw new Error(`Facebook access token could not be verified (${debugResponse.status}).`);
      const debugPayload: unknown = await debugResponse.json();
      if (
        !debugPayload || typeof debugPayload !== 'object' ||
        !('data' in debugPayload) || !debugPayload.data || typeof debugPayload.data !== 'object' ||
        !('is_valid' in debugPayload.data) || debugPayload.data.is_valid !== true ||
        !('app_id' in debugPayload.data) || debugPayload.data.app_id !== process.env.FACEBOOK_APP_ID ||
        !('user_id' in debugPayload.data) || typeof debugPayload.data.user_id !== 'string'
      ) {
        throw new Error('Facebook access token is invalid.');
      }
      const profileUrl = new URL(FACEBOOK_GRAPH_ENDPOINT);
      profileUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
      profileUrl.searchParams.set('access_token', tokenPayload.access_token);
      const profileResponse = await fetch(profileUrl, { signal: AbortSignal.timeout(10_000) });
      if (!profileResponse.ok) throw new Error(`Facebook profile could not be loaded (${profileResponse.status}).`);
      const profile: unknown = await profileResponse.json();
      if (
        !profile || typeof profile !== 'object' ||
        !('id' in profile) || profile.id !== debugPayload.data.user_id ||
        !('email' in profile) || typeof profile.email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ||
        !('name' in profile) || typeof profile.name !== 'string'
      ) {
        throw new Error('Facebook profile is missing a verified email address.');
      }
      const picture = 'picture' in profile && profile.picture && typeof profile.picture === 'object' &&
        'data' in profile.picture && profile.picture.data && typeof profile.picture.data === 'object' &&
        'url' in profile.picture.data && typeof profile.picture.data.url === 'string'
        ? profile.picture.data.url
        : '';
      user = {
        id: profile.id,
        email: profile.email.trim().toLowerCase(),
        name: profile.name,
        picture,
        provider,
      };
    } else {
      if (!('id_token' in tokenPayload) || typeof tokenPayload.id_token !== 'string') {
        throw new Error(`${provider} response did not include an ID token.`);
      }
      const profile = await validateOidcToken(tokenPayload.id_token, provider, login.nonce);
      user = { ...profile, provider };
    }

    initializeUserTokenBalance(user);
    if (!createSession(user, res)) {
      return res.status(503).send('The sign-in service is temporarily at capacity. Please try again later.');
    }
    return res.redirect(303, '/');
  } catch (err) {
    console.error(`[AUTH] ${provider} sign-in failed:`, err);
    return res.status(401).send(`${provider} sign-in failed. Please return to the app and try again.`);
  }
});

app.get('/api/auth/me', (req, res) => {
  const session = getAuthenticatedSession(req);
  if (!session) return res.status(401).json({ authenticated: false });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    authenticated: true,
    user: {
      ...session.user,
      tokens: getUserTokenBalance(getUserBalanceKey(session.user)),
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  if (!isSameOriginRequest(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin requests are not allowed.' });
  }
  const token = getSessionToken(req);
  if (token) authSessions.delete(token);
  clearSessionCookie(res);
  return res.json({ success: true });
});

// Ensure gmaps-output and webdata directories exist
const outputDir = path.resolve(process.cwd(), 'gmaps-output');
const SCRAPER_RESPONSE_TIMEOUT_MS = 75_000;
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Active background process tracker
let activeScraperProcess: ChildProcess | null = null;
let currentJobState: {
  id: string;
  isRunning: boolean;
  startTime: number;
  progress: number;
  logs: Array<{ timestamp: string; level: string; message: string }>;
  scrapedCount: number;
  outputFile: string;
  exitCode: number | null;
} = {
  id: '',
  isRunning: false,
  startTime: 0,
  progress: 0,
  logs: [],
  scrapedCount: 0,
  outputFile: '',
  exitCode: null,
};

// In-memory cache for parsed places to optimize disk reads & speed up execution
interface PlacesCacheEntry {
  mtime: number;
  places: PlaceResult[];
}
const placesCache = new Map<string, PlacesCacheEntry>();

/**
 * Searches candidate binary paths in prioritized order
 */
function findScraperBinary(): string | null {
  const candidates = [
    path.resolve(outputDir, 'google_maps_scraper-1.18.1-linux-amd64'),
    path.resolve(process.cwd(), 'google_maps_scraper-1.18.1-linux-amd64'),
    path.resolve(outputDir, 'google_maps_scraper'),
    path.resolve(process.cwd(), 'google_maps_scraper'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
        try {
          fs.chmodSync(candidate, 0o755);
          return candidate;
        } catch {
          return candidate;
        }
      }
    }
  }
  return null;
}

/**
 * Helper: Read latest places from gmaps-output with high performance file caching
 */
function readLatestOutputPlaces(preferredFile?: string): { filePath: string; places: PlaceResult[] } {
  const fileCandidates = [
    preferredFile,
    path.resolve(outputDir, 'results.json'),
    path.resolve(outputDir, 'results.csv'),
    path.resolve(process.cwd(), 'results.json'),
  ].filter(Boolean) as string[];

  for (const filePath of fileCandidates) {
    if (fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        const cached = placesCache.get(filePath);
        if (cached && cached.mtime === stat.mtimeMs) {
          return { filePath, places: cached.places };
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const places = parseScraperJsonOutput(content);
        placesCache.set(filePath, { mtime: stat.mtimeMs, places });
        if (places && places.length > 0) {
          return { filePath, places };
        }
        if (filePath === preferredFile) {
          return { filePath, places };
        }
      } catch (err: any) {
        console.error(`Error reading ${filePath}:`, err);
      }
    }
  }
  return { filePath: '', places: [] };
}

/**
 * API: Read results directly from disk (fast cached read)
 */
app.get('/api/scrape/results', (req, res) => {
  if (currentJobState.isRunning && currentJobState.outputFile) {
    placesCache.delete(currentJobState.outputFile);
  }
  const { filePath, places } = readLatestOutputPlaces(currentJobState.outputFile || undefined);

  if (places.length > 0) {
    return res.json({
      success: true,
      filePath,
      total: places.length,
      places,
    });
  }

  return res.json({
    success: Boolean(filePath),
    message: filePath ? 'No places found in scraper output.' : 'No results file found in gmaps-output yet.',
    filePath,
    total: 0,
    places: [],
  });
});

/**
 * API: Cancel running scraper job
 */
app.post('/api/scrape/cancel', (req, res) => {
  if (!isSameOriginRequest(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin requests are not allowed.' });
  }

  if (activeScraperProcess) {
    try {
      activeScraperProcess.kill('SIGTERM');
      currentJobState.logs.push({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warn',
        message: '[CANCELLED] Termination signal sent to scraper process.',
      });
    } catch (err: any) {
      console.warn('Error killing process:', err);
      return res.status(500).json({ success: false, message: 'Could not stop the scraper process.' });
    }
    return res.json({ success: true, message: 'Scraper stop requested.' });
  }
  return res.status(409).json({ success: false, message: 'No scraper process is currently running.' });
});

/**
 * API: Run the scraper command in the background with -json flag
 * Optimized to be completely non-blocking and immediate.
 */
app.post('/api/scrape/run', async (req, res) => {
  res.set({
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    Pragma: 'no-cache',
    Expires: '0',
  });

  // If already running, prevent duplicate spawn conflict
  if (currentJobState.isRunning || activeScraperProcess) {
    return res.status(409).json({
      success: false,
      message: 'A scrape job is already currently executing in the background.',
    });
  }

  const flags = req.body?.flags;
  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
    return res.status(400).json({ success: false, message: 'Scraper flags are required.' });
  }

  if (typeof flags.input !== 'string') {
    return res.status(400).json({ success: false, message: 'Search queries must be provided as text.' });
  }

  const rawInput = flags.input.trim();
  const queries = rawInput.split('\n').map((query: string) => query.trim()).filter(Boolean);
  const depth = flags.depth === undefined ? 5 : Number(flags.depth);
  const exitOnInactivity = flags.exitOnInactivity === undefined ? '3m' : flags.exitOnInactivity;
  const geo = flags.geo === undefined ? '31.4237,74.2136' : flags.geo;
  const radius = flags.radius === undefined ? 10000 : Number(flags.radius);
  const zoom = flags.zoom === undefined ? 15 : Number(flags.zoom);
  const coordinates = typeof geo === 'string' ? geo.split(',').map(Number) : [];
  const concurrency = flags.c === undefined ? undefined : Number(flags.c);

  if (
    rawInput.length === 0 ||
    rawInput.length > 10_000 ||
    queries.length > 50 ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(rawInput) ||
    !Number.isInteger(depth) || depth < 1 || depth > 50 ||
    !['1m', '2m', '3m', '5m', '10m'].includes(exitOnInactivity) ||
    coordinates.length !== 2 ||
    !Number.isFinite(coordinates[0]) || coordinates[0] < -90 || coordinates[0] > 90 ||
    !Number.isFinite(coordinates[1]) || coordinates[1] < -180 || coordinates[1] > 180 ||
    !Number.isFinite(radius) || radius <= 0 || radius > 100_000 ||
    !Number.isInteger(zoom) || zoom < 0 || zoom > 21 ||
    (concurrency !== undefined && (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8)) ||
    (flags.lang !== undefined && (typeof flags.lang !== 'string' || !/^[a-z]{2}$/i.test(flags.lang)))
  ) {
    return res.status(400).json({ success: false, message: 'One or more scraper settings are invalid or exceed safe limits.' });
  }

  if (!isSameOriginRequest(req)) {
    return res.status(403).json({ success: false, message: 'Cross-origin requests are not allowed.' });
  }
  const outputFilePath = path.resolve(outputDir, 'results.json');
  const queryFilePath = path.resolve(outputDir, 'queries.txt');

  // Save queries file
  fs.writeFileSync(queryFilePath, rawInput.trim(), 'utf-8');

  const jobId = `job_${randomUUID()}`;
  currentJobState = {
    id: jobId,
    isRunning: true,
    startTime: Date.now(),
    progress: 15,
    logs: [],
    scrapedCount: 0,
    outputFile: outputFilePath,
    exitCode: null,
  };

  const addLog = (level: string, message: string) => {
    // Keep max 250 logs to prevent memory leak
    if (currentJobState.logs.length > 250) {
      currentJobState.logs.shift();
    }
    currentJobState.logs.push({
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    });
  };

  addLog('info', `[LAUNCH] Initializing background scraper job #${jobId}`);
  addLog('info', `[TARGET] Query: "${rawInput.split('\n')[0]}"`);
  addLog('info', `[CONFIG] -json mode enforced | Output destination: ${outputFilePath}`);

  const binaryPath = findScraperBinary();
  let responseTimedOut = false;

  if (binaryPath) {
    addLog('info', `[BINARY] Executable found: ${binaryPath}`);
    const args = [
      '-input', queryFilePath,
      '-results', outputFilePath,
      '-json',
      '-depth', String(depth),
      '-exit-on-inactivity', exitOnInactivity,
      '-geo', geo,
      '-radius', String(radius),
      '-zoom', String(zoom),
    ];

    if (flags.email === true) args.push('-email');
    // Always use fast mode per user requirement
    args.push('-fast-mode');
    if (flags.extraReviews === true) args.push('-extra-reviews');
    if (concurrency !== undefined) args.push('-c', String(concurrency));
    if (flags.lang) args.push('-lang', flags.lang);

    addLog('info', `[EXEC] Running: ${path.basename(binaryPath)} ${args.join(' ')}`);

    try {
      fs.writeFileSync(outputFilePath, '', 'utf-8');
      placesCache.delete(outputFilePath);
      const child = spawn(binaryPath, args, {
        cwd: process.cwd(),
        env: { ...process.env, DISPLAY: process.env.DISPLAY || ':99' },
      });

      activeScraperProcess = child;
      const scraperFinished = new Promise<number | null>(resolve => {
        child.once('close', resolve);
        child.once('error', () => resolve(-1));
      });

      child.stdout.on('data', data => {
        const text = data.toString().trim();
        if (text) {
          addLog('info', text);
          currentJobState.progress = Math.min(95, currentJobState.progress + 5);
        }
      });

      child.stderr.on('data', data => {
        const text = data.toString().trim();
        if (text) addLog('warn', text);
      });

      child.on('error', err => {
        addLog('error', `Process spawn error: ${err.message}`);
        currentJobState.exitCode = -1;
        currentJobState.isRunning = false;
        activeScraperProcess = null;
      });

      child.on('close', code => {
        currentJobState.exitCode = code ?? -1;
        currentJobState.isRunning = false;
        if (activeScraperProcess === child) activeScraperProcess = null;
        placesCache.delete(outputFilePath);
        const { places } = readLatestOutputPlaces(outputFilePath);
        currentJobState.scrapedCount = places.length;
        if (code === 0) currentJobState.progress = 100;
        addLog(code === 0 ? 'success' : 'error', `Scraper finished with exit code ${code ?? 'unknown'}`);
      });

      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const waitResult = await Promise.race([
        scraperFinished.then(exitCode => ({ timedOut: false, exitCode })),
        new Promise<{ timedOut: true; exitCode: null }>(resolve => {
          timeoutHandle = setTimeout(
            () => resolve({ timedOut: true, exitCode: null }),
            SCRAPER_RESPONSE_TIMEOUT_MS
          );
        }),
      ]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      responseTimedOut = waitResult.timedOut;
      if (responseTimedOut) {
        addLog(
          'warn',
          `[TIMEOUT] Returning a results snapshot after ${SCRAPER_RESPONSE_TIMEOUT_MS / 1000}s; scraper continues in the background.`
        );
      }

    } catch (err: any) {
      addLog('error', `Failed to execute binary: ${err.message}`);
      currentJobState.exitCode = -1;
      currentJobState.isRunning = false;
      activeScraperProcess = null;
    }
  } else {
    addLog('error', `[ERROR] Scraper binary not found: ${path.basename(outputFilePath)} cannot be generated.`);
    currentJobState.exitCode = -1;
    currentJobState.isRunning = false;
  }

  if (responseTimedOut) placesCache.delete(outputFilePath);
  const places = binaryPath ? readLatestOutputPlaces(outputFilePath).places : [];
  currentJobState.scrapedCount = places.length;
  if (!currentJobState.isRunning && currentJobState.exitCode === 0) {
    currentJobState.progress = 100;
  }

  return res.json({
    success: true,
    jobId,
    isRunning: currentJobState.isRunning,
    timedOut: responseTimedOut,
    responseTimeoutMs: SCRAPER_RESPONSE_TIMEOUT_MS,
    total: places.length,
    places: binaryPath ? places : [],
    logs: currentJobState.logs,
    progress: currentJobState.progress,
    exitCode: currentJobState.exitCode,
    started: Boolean(binaryPath),
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API] Request failed:', error);
  res.status(400).json({ success: false, message: 'The request could not be processed.' });
});

/**
 * Server setup with Vite middleware in dev and static files in production
 */
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(process.cwd(), 'dist');

  if (isProd && fs.existsSync(distPath)) {
    console.log(`[PROD] Serving production build from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log(`[DEV] Mounting Vite middleware mode on port ${PORT}...`);
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true',
        },
        appType: 'spa',
      });

      // Mount Vite's dev middlewares (handles scripts, HMR, assets)
      app.use(vite.middlewares);

      // Serve index.html transformed by Vite for SPA client routes
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api')) {
          return next();
        }
        try {
          const indexPath = path.resolve(process.cwd(), 'index.html');
          if (!fs.existsSync(indexPath)) {
            return res.status(404).send('index.html not found');
          }
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (err) {
      console.warn('Vite middleware initialization warning:', err);
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Google Maps Search Engine running at http://0.0.0.0:${PORT} (PID ${process.pid})`);
  });

  // Handle graceful shutdowns
  const shutdown = () => {
    if (activeScraperProcess) {
      try {
        activeScraperProcess.kill('SIGTERM');
      } catch {}
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

setupServer().catch(err => {
  console.error('Server boot failed:', err);
});
