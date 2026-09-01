/**
 * C29 FIX: Secure token storage.
 *
 * Tokens are stored IN-MEMORY by default — never in localStorage.
 * This prevents XSS attacks from stealing access/refresh tokens via
 * document.localStorage.
 *
 * Trade-off: tokens are lost on page refresh. For persistent sessions,
 * use an httpOnly refresh token cookie + a BFF proxy endpoint that
 * exchanges the cookie for an access token (not implemented in this SDK).
 *
 * Enable localStorage (INSECURE — dev only):
 *   import { setTokenStoreMode } from '@nexus/auth-sdk';
 *   setTokenStoreMode('localStorage');
 */

type StoreMode = 'memory' | 'localStorage';

let currentMode: StoreMode = 'memory';
let memoryTokens: string | null = null;

export function setTokenStoreMode(mode: StoreMode): void {
  if (mode === 'localStorage' && typeof window !== 'undefined') {
    console.warn(
      '[NexusAuth SDK] ⚠️  localStorage mode is INSECURE — tokens are readable by any JS on the page. ' +
      'Use memory mode (default) in production.',
    );
  }
  currentMode = mode;
}

export function getTokenStoreMode(): StoreMode {
  return currentMode;
}

export function loadTokens(): string | null {
  if (currentMode === 'localStorage') {
    try {
      return localStorage.getItem('nexus_auth_tokens');
    } catch {
      return null;
    }
  }
  return memoryTokens;
}

export function saveTokens(raw: string | null): void {
  if (currentMode === 'localStorage') {
    try {
      if (raw) {
        localStorage.setItem('nexus_auth_tokens', raw);
      } else {
        localStorage.removeItem('nexus_auth_tokens');
      }
    } catch {
      // localStorage unavailable (private browsing, etc.)
    }
    return;
  }
  memoryTokens = raw;
}