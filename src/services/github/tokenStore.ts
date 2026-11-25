// Where the user's GitHub token lives.
//
// In the desktop app: encrypted by the operating system (Electron safeStorage —
// Windows DPAPI / macOS Keychain) and kept in Atlas's user-data folder, readable
// only by Atlas's own window. In a plain browser there is no safe place, so the
// token is held in memory for this session only and never written to disk.

const KEY = 'github-token';
let sessionToken: string | null = null;

const secrets = () => (typeof window !== 'undefined' ? window.atlasDesktop?.secrets : undefined);

export type TokenStorage = 'encrypted' | 'session';

/** How a saved token would be kept here. */
export async function tokenStorage(): Promise<TokenStorage> {
  const s = secrets();
  return s && (await s.available()) ? 'encrypted' : 'session';
}

export async function getToken(): Promise<string | null> {
  const s = secrets();
  if (s && (await s.available())) return (await s.get(KEY)) || null;
  return sessionToken;
}

export async function saveToken(token: string): Promise<TokenStorage> {
  const value = token.trim();
  const s = secrets();
  if (s && (await s.available()) && (await s.set(KEY, value))) return 'encrypted';
  sessionToken = value;
  return 'session';
}

export async function clearToken(): Promise<void> {
  sessionToken = null;
  const s = secrets();
  if (s) await s.delete(KEY);
}
