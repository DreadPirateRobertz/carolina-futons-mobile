# Wix Members Auth Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mock `useAuth` hook with real Wix Members authentication using `@wix/sdk` OAuthStrategy — email/password login, registration, social login (via Wix managed pages), password reset, and persistent token storage.

**Architecture:** A `WixClient` singleton wraps `@wix/sdk` with `OAuthStrategy`. A `WixAuthService` layer provides typed methods that map 1:1 to the existing `useAuth` interface. `useAuth` keeps its exact same public API (signIn, signUp, signInWithGoogle, signInWithApple, resetPassword, signOut) but delegates to `WixAuthService` instead of mock `simulateDelay()`. Tokens are persisted to `expo-secure-store` and restored on app start. Social login opens the Wix-managed login page via `expo-web-browser` + deep link callback handled by `expo-linking`.

**Tech Stack:** `@wix/sdk`, `@wix/members`, `expo-secure-store`, `expo-web-browser`, `expo-linking`, `react-native-webview`

---

## Task 1: Install Dependencies + Create WixClient Singleton

**Files:**
- Modify: `package.json` (add dependencies)
- Create: `src/services/wixClient.ts`
- Test: `src/services/__tests__/wixClient.test.ts`

**Step 1: Install packages**

Run:
```bash
npx expo install expo-secure-store expo-web-browser expo-linking react-native-webview
npm install @wix/sdk @wix/members
```

Expected: Packages added to `package.json` dependencies. No native rebuild needed for Expo Go (these are all Expo-compatible).

**Step 2: Write the failing test for WixClient**

Create `src/services/__tests__/wixClient.test.ts`:

```typescript
import { getWixClient, resetWixClient } from '@/services/wixClient';

// Mock @wix/sdk
jest.mock('@wix/sdk', () => ({
  createClient: jest.fn(() => ({
    auth: {
      setTokens: jest.fn(),
      getTokens: jest.fn(() => ({
        accessToken: { value: '', expiresAt: 0 },
        refreshToken: { value: '', role: 'visitor' },
      })),
      loggedIn: jest.fn(() => false),
      generateVisitorTokens: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      generateOAuthData: jest.fn(),
      getAuthUrl: jest.fn(),
      getMemberTokens: jest.fn(),
      getMemberTokensForDirectLogin: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      logout: jest.fn(),
      renewToken: jest.fn(),
    },
  })),
  OAuthStrategy: jest.fn((opts: unknown) => ({ strategy: 'oauth', ...opts as object })),
}));

jest.mock('@wix/members', () => ({
  members: { queryMembers: jest.fn() },
}));

describe('WixClient', () => {
  beforeEach(() => {
    resetWixClient();
  });

  it('returns a client instance', () => {
    const client = getWixClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('returns the same instance on subsequent calls (singleton)', () => {
    const a = getWixClient();
    const b = getWixClient();
    expect(a).toBe(b);
  });

  it('returns a new instance after reset', () => {
    const a = getWixClient();
    resetWixClient();
    const b = getWixClient();
    expect(a).not.toBe(b);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx jest src/services/__tests__/wixClient.test.ts`
Expected: FAIL — `Cannot find module '@/services/wixClient'`

**Step 4: Write minimal implementation**

Create `src/services/wixClient.ts`:

```typescript
import { createClient, OAuthStrategy } from '@wix/sdk';
import { members } from '@wix/members';

const CLIENT_ID = process.env.EXPO_PUBLIC_WIX_CLIENT_ID ?? '';

type WixClient = ReturnType<typeof createClient>;

let client: WixClient | null = null;

export function getWixClient(): WixClient {
  if (!client) {
    client = createClient({
      modules: { members },
      auth: OAuthStrategy({ clientId: CLIENT_ID }),
    });
  }
  return client;
}

export function resetWixClient(): void {
  client = null;
}
```

**Step 5: Run test to verify it passes**

Run: `npx jest src/services/__tests__/wixClient.test.ts`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add src/services/wixClient.ts src/services/__tests__/wixClient.test.ts package.json package-lock.json
git commit -m "feat(auth): add WixClient singleton with @wix/sdk + @wix/members

Installs @wix/sdk, @wix/members, expo-secure-store, expo-web-browser,
expo-linking, react-native-webview. Creates singleton WixClient factory
with OAuthStrategy. TDD: 3 tests (create, singleton, reset)."
```

---

## Task 2: Token Storage Service

**Files:**
- Create: `src/services/tokenStorage.ts`
- Test: `src/services/__tests__/tokenStorage.test.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/tokenStorage.test.ts`:

```typescript
import { saveTokens, loadTokens, clearTokens } from '@/services/tokenStorage';

// Mock expo-secure-store
const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => {
    return Promise.resolve(store[key] ?? null);
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
}));

const mockTokens = {
  accessToken: { value: 'access-123', expiresAt: Date.now() + 3600000 },
  refreshToken: { value: 'refresh-456', role: 'member' as const },
};

describe('tokenStorage', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('saves and loads tokens', async () => {
    await saveTokens(mockTokens);
    const loaded = await loadTokens();
    expect(loaded).toEqual(mockTokens);
  });

  it('returns null when no tokens stored', async () => {
    const loaded = await loadTokens();
    expect(loaded).toBeNull();
  });

  it('returns null for corrupted data', async () => {
    store['wix_auth_tokens'] = 'not-json{{{';
    const loaded = await loadTokens();
    expect(loaded).toBeNull();
  });

  it('clears tokens', async () => {
    await saveTokens(mockTokens);
    await clearTokens();
    const loaded = await loadTokens();
    expect(loaded).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/tokenStorage.test.ts`
Expected: FAIL — `Cannot find module '@/services/tokenStorage'`

**Step 3: Write minimal implementation**

Create `src/services/tokenStorage.ts`:

```typescript
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'wix_auth_tokens';

export interface WixTokens {
  accessToken: { value: string; expiresAt: number };
  refreshToken: { value: string; role: 'visitor' | 'member' | 'none' };
}

export async function saveTokens(tokens: WixTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<WixTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WixTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/tokenStorage.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/services/tokenStorage.ts src/services/__tests__/tokenStorage.test.ts
git commit -m "feat(auth): add secure token storage with expo-secure-store

Save/load/clear Wix auth tokens to iOS Keychain / Android Keystore.
Handles corrupted data gracefully. TDD: 4 tests."
```

---

## Task 3: WixAuthService — Core Auth Methods

**Files:**
- Create: `src/services/wixAuth.ts`
- Test: `src/services/__tests__/wixAuth.test.ts`

This is the main service that wraps Wix SDK auth calls into our app's typed interface. It handles: login, register, getMemberTokensForDirectLogin, token persistence, and session restore.

**Step 1: Write the failing tests**

Create `src/services/__tests__/wixAuth.test.ts`:

```typescript
import { WixAuthService } from '@/services/wixAuth';
import type { WixTokens } from '@/services/tokenStorage';

// --- Mocks ---

const mockTokens: WixTokens = {
  accessToken: { value: 'access-abc', expiresAt: Date.now() + 3600000 },
  refreshToken: { value: 'refresh-xyz', role: 'member' },
};

const mockVisitorTokens: WixTokens = {
  accessToken: { value: 'visitor-access', expiresAt: Date.now() + 3600000 },
  refreshToken: { value: 'visitor-refresh', role: 'visitor' },
};

const mockAuth = {
  login: jest.fn(),
  register: jest.fn(),
  getMemberTokensForDirectLogin: jest.fn(),
  generateVisitorTokens: jest.fn(),
  setTokens: jest.fn(),
  getTokens: jest.fn(() => mockTokens),
  loggedIn: jest.fn(() => false),
  sendPasswordResetEmail: jest.fn(),
  generateOAuthData: jest.fn(),
  getAuthUrl: jest.fn(),
  getMemberTokens: jest.fn(),
  renewToken: jest.fn(),
  logout: jest.fn(() => ({ logoutUrl: 'https://wix.com/logout' })),
};

const mockClient = { auth: mockAuth, members: {} };

jest.mock('@/services/wixClient', () => ({
  getWixClient: () => mockClient,
}));

const tokenStore: Record<string, string> = {};
jest.mock('@/services/tokenStorage', () => ({
  saveTokens: jest.fn(async (t: WixTokens) => {
    tokenStore['tokens'] = JSON.stringify(t);
  }),
  loadTokens: jest.fn(async () => {
    const raw = tokenStore['tokens'];
    return raw ? JSON.parse(raw) : null;
  }),
  clearTokens: jest.fn(async () => {
    delete tokenStore['tokens'];
  }),
}));

describe('WixAuthService', () => {
  let service: WixAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete tokenStore['tokens'];
    service = new WixAuthService();
  });

  describe('loginWithEmail', () => {
    it('returns member data on successful login', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'SUCCESS',
        data: { sessionToken: 'session-123' },
      });
      mockAuth.getMemberTokensForDirectLogin.mockResolvedValue(mockTokens);

      const result = await service.loginWithEmail('user@test.com', 'Password1');

      expect(mockAuth.login).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'Password1',
      });
      expect(mockAuth.getMemberTokensForDirectLogin).toHaveBeenCalledWith('session-123');
      expect(mockAuth.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(result).toEqual({ success: true });
    });

    it('returns error on invalid credentials', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'FAILURE',
        errorCode: 'invalidPassword',
      });

      const result = await service.loginWithEmail('user@test.com', 'wrong');

      expect(result).toEqual({
        success: false,
        error: 'Invalid email or password',
      });
    });

    it('returns error when email verification required', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'EMAIL_VERIFICATION_REQUIRED',
      });

      const result = await service.loginWithEmail('user@test.com', 'Password1');

      expect(result).toEqual({
        success: false,
        error: 'Please verify your email address before logging in',
        requiresVerification: true,
      });
    });

    it('returns error when owner approval required', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'OWNER_APPROVAL_REQUIRED',
      });

      const result = await service.loginWithEmail('user@test.com', 'Password1');

      expect(result).toEqual({
        success: false,
        error: 'Your account is pending approval',
      });
    });

    it('handles network errors', async () => {
      mockAuth.login.mockRejectedValue(new Error('Network request failed'));

      const result = await service.loginWithEmail('user@test.com', 'Password1');

      expect(result).toEqual({
        success: false,
        error: 'Network request failed',
      });
    });

    it('persists tokens on success', async () => {
      mockAuth.login.mockResolvedValue({
        loginState: 'SUCCESS',
        data: { sessionToken: 'session-123' },
      });
      mockAuth.getMemberTokensForDirectLogin.mockResolvedValue(mockTokens);
      const { saveTokens } = require('@/services/tokenStorage');

      await service.loginWithEmail('user@test.com', 'Password1');

      expect(saveTokens).toHaveBeenCalledWith(mockTokens);
    });
  });

  describe('register', () => {
    it('returns success on successful registration', async () => {
      mockAuth.register.mockResolvedValue({
        loginState: 'SUCCESS',
        data: { sessionToken: 'session-new' },
      });
      mockAuth.getMemberTokensForDirectLogin.mockResolvedValue(mockTokens);

      const result = await service.register('new@test.com', 'Password1', 'New User');

      expect(mockAuth.register).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'Password1',
        profile: { nickname: 'New User' },
      });
      expect(result).toEqual({ success: true });
    });

    it('returns error when email already exists', async () => {
      mockAuth.register.mockResolvedValue({
        loginState: 'FAILURE',
        errorCode: 'emailAlreadyExists',
      });

      const result = await service.register('taken@test.com', 'Password1', 'User');

      expect(result).toEqual({
        success: false,
        error: 'An account with this email already exists',
      });
    });

    it('handles email verification required after registration', async () => {
      mockAuth.register.mockResolvedValue({
        loginState: 'EMAIL_VERIFICATION_REQUIRED',
      });

      const result = await service.register('new@test.com', 'Password1', 'User');

      expect(result).toEqual({
        success: false,
        error: 'Please check your email to verify your account',
        requiresVerification: true,
      });
    });
  });

  describe('sendPasswordReset', () => {
    it('calls sendPasswordResetEmail with correct args', async () => {
      mockAuth.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.sendPasswordReset('user@test.com');

      expect(mockAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@test.com',
        'carolinafutons://reset-password'
      );
      expect(result).toEqual({ success: true });
    });

    it('handles errors gracefully', async () => {
      mockAuth.sendPasswordResetEmail.mockRejectedValue(new Error('Unknown email'));

      const result = await service.sendPasswordReset('unknown@test.com');

      // For security, password reset should not reveal whether account exists
      // The service should still return success to prevent email enumeration
      expect(result).toEqual({ success: true });
    });
  });

  describe('logout', () => {
    it('clears tokens', async () => {
      const { clearTokens } = require('@/services/tokenStorage');

      await service.logout();

      expect(clearTokens).toHaveBeenCalled();
    });
  });

  describe('restoreSession', () => {
    it('restores tokens from storage and sets them on client', async () => {
      tokenStore['tokens'] = JSON.stringify(mockTokens);
      mockAuth.loggedIn.mockReturnValue(true);

      const result = await service.restoreSession();

      expect(mockAuth.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(result).toBe(true);
    });

    it('returns false when no stored tokens', async () => {
      const result = await service.restoreSession();

      expect(result).toBe(false);
    });

    it('returns false and clears tokens when restore fails', async () => {
      tokenStore['tokens'] = JSON.stringify(mockTokens);
      mockAuth.setTokens.mockImplementation(() => { throw new Error('invalid'); });
      const { clearTokens } = require('@/services/tokenStorage');

      const result = await service.restoreSession();

      expect(result).toBe(false);
      expect(clearTokens).toHaveBeenCalled();
    });
  });

  describe('isLoggedIn', () => {
    it('delegates to client auth.loggedIn()', () => {
      mockAuth.loggedIn.mockReturnValue(true);
      expect(service.isLoggedIn()).toBe(true);

      mockAuth.loggedIn.mockReturnValue(false);
      expect(service.isLoggedIn()).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/wixAuth.test.ts`
Expected: FAIL — `Cannot find module '@/services/wixAuth'`

**Step 3: Write implementation**

Create `src/services/wixAuth.ts`:

```typescript
import { getWixClient } from '@/services/wixClient';
import { saveTokens, loadTokens, clearTokens } from '@/services/tokenStorage';

const RESET_REDIRECT = 'carolinafutons://reset-password';

export interface AuthResult {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalidEmail: 'Invalid email address',
  invalidPassword: 'Invalid email or password',
  emailAlreadyExists: 'An account with this email already exists',
  resetPassword: 'Please reset your password to continue',
};

export class WixAuthService {
  private get auth() {
    return getWixClient().auth;
  }

  async loginWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const response = await this.auth.login({ email, password });

      if (response.loginState === 'SUCCESS') {
        const tokens = await this.auth.getMemberTokensForDirectLogin(
          response.data.sessionToken,
        );
        this.auth.setTokens(tokens);
        await saveTokens(tokens);
        return { success: true };
      }

      if (response.loginState === 'EMAIL_VERIFICATION_REQUIRED') {
        return {
          success: false,
          error: 'Please verify your email address before logging in',
          requiresVerification: true,
        };
      }

      if (response.loginState === 'OWNER_APPROVAL_REQUIRED') {
        return { success: false, error: 'Your account is pending approval' };
      }

      // FAILURE
      const errorMsg = ERROR_MESSAGES[response.errorCode] ?? 'Invalid email or password';
      return { success: false, error: errorMsg };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async register(email: string, password: string, displayName: string): Promise<AuthResult> {
    try {
      const response = await this.auth.register({
        email,
        password,
        profile: { nickname: displayName },
      });

      if (response.loginState === 'SUCCESS') {
        const tokens = await this.auth.getMemberTokensForDirectLogin(
          response.data.sessionToken,
        );
        this.auth.setTokens(tokens);
        await saveTokens(tokens);
        return { success: true };
      }

      if (response.loginState === 'EMAIL_VERIFICATION_REQUIRED') {
        return {
          success: false,
          error: 'Please check your email to verify your account',
          requiresVerification: true,
        };
      }

      if (response.loginState === 'OWNER_APPROVAL_REQUIRED') {
        return { success: false, error: 'Your account is pending approval' };
      }

      const errorMsg = ERROR_MESSAGES[response.errorCode] ?? 'Registration failed';
      return { success: false, error: errorMsg };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async sendPasswordReset(email: string): Promise<AuthResult> {
    try {
      await this.auth.sendPasswordResetEmail(email, RESET_REDIRECT);
    } catch {
      // Swallow errors to prevent email enumeration attacks
    }
    return { success: true };
  }

  async logout(): Promise<void> {
    await clearTokens();
  }

  async restoreSession(): Promise<boolean> {
    try {
      const tokens = await loadTokens();
      if (!tokens) return false;
      this.auth.setTokens(tokens);
      return this.auth.loggedIn();
    } catch {
      await clearTokens();
      return false;
    }
  }

  isLoggedIn(): boolean {
    return this.auth.loggedIn();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/wixAuth.test.ts`
Expected: PASS (13 tests)

**Step 5: Commit**

```bash
git add src/services/wixAuth.ts src/services/__tests__/wixAuth.test.ts
git commit -m "feat(auth): add WixAuthService for email login/register/reset

Wraps @wix/sdk OAuthStrategy auth methods. Handles all loginState
responses (SUCCESS, FAILURE, EMAIL_VERIFICATION_REQUIRED,
OWNER_APPROVAL_REQUIRED). Persists tokens to secure storage.
Password reset swallows errors to prevent email enumeration.
TDD: 13 tests covering happy paths and edge cases."
```

---

## Task 4: WixAuthService — Social Login (OAuth Redirect)

**Files:**
- Modify: `src/services/wixAuth.ts` (add `loginWithOAuth` method)
- Modify: `src/services/__tests__/wixAuth.test.ts` (add OAuth tests)

**Step 1: Write the failing tests**

Add to `src/services/__tests__/wixAuth.test.ts`, inside the main `describe`:

```typescript
// Add these mocks at top of file:
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `carolinafutons://${path}`),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

// ... inside the main describe block:

describe('loginWithOAuth', () => {
  const oauthData = {
    state: 'state-123',
    codeVerifier: 'verifier',
    codeChallenge: 'challenge',
    redirectUri: 'carolinafutons://oauth/wix/callback',
    originalUrl: '',
  };

  it('opens browser and exchanges code for tokens on success', async () => {
    const { openAuthSessionAsync } = require('expo-web-browser');
    mockAuth.generateOAuthData.mockReturnValue(oauthData);
    mockAuth.getAuthUrl.mockResolvedValue({ authUrl: 'https://wix.com/auth?code=...' });
    openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'carolinafutons://oauth/wix/callback?code=auth-code-123&state=state-123',
    });
    mockAuth.getMemberTokens.mockResolvedValue(mockTokens);

    const result = await service.loginWithOAuth();

    expect(mockAuth.generateOAuthData).toHaveBeenCalledWith(
      'carolinafutons://oauth/wix/callback'
    );
    expect(openAuthSessionAsync).toHaveBeenCalledWith(
      'https://wix.com/auth?code=...',
      'carolinafutons://oauth/wix/callback'
    );
    expect(mockAuth.getMemberTokens).toHaveBeenCalledWith(
      'auth-code-123', 'state-123', oauthData
    );
    expect(result).toEqual({ success: true });
  });

  it('returns cancelled when user dismisses browser', async () => {
    const { openAuthSessionAsync } = require('expo-web-browser');
    mockAuth.generateOAuthData.mockReturnValue(oauthData);
    mockAuth.getAuthUrl.mockResolvedValue({ authUrl: 'https://wix.com/auth' });
    openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });

    const result = await service.loginWithOAuth();

    expect(result).toEqual({ success: false, error: 'Login cancelled' });
  });

  it('returns error when OAuth callback has error params', async () => {
    const { openAuthSessionAsync } = require('expo-web-browser');
    mockAuth.generateOAuthData.mockReturnValue(oauthData);
    mockAuth.getAuthUrl.mockResolvedValue({ authUrl: 'https://wix.com/auth' });
    openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'carolinafutons://oauth/wix/callback?error=access_denied&error_description=User+denied',
    });

    const result = await service.loginWithOAuth();

    expect(result).toEqual({ success: false, error: 'User denied' });
  });

  it('handles network errors during OAuth flow', async () => {
    mockAuth.generateOAuthData.mockReturnValue(oauthData);
    mockAuth.getAuthUrl.mockRejectedValue(new Error('Network error'));

    const result = await service.loginWithOAuth();

    expect(result).toEqual({ success: false, error: 'Network error' });
  });
});
```

**Step 2: Run test to verify new tests fail**

Run: `npx jest src/services/__tests__/wixAuth.test.ts`
Expected: FAIL — `service.loginWithOAuth is not a function`

**Step 3: Add implementation**

Add to `src/services/wixAuth.ts`:

```typescript
// Add imports at top:
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const OAUTH_CALLBACK_PATH = 'oauth/wix/callback';

// Add inside WixAuthService class:

async loginWithOAuth(): Promise<AuthResult> {
  try {
    const redirectUri = Linking.createURL(OAUTH_CALLBACK_PATH);
    const oauthData = this.auth.generateOAuthData(redirectUri);
    const { authUrl } = await this.auth.getAuthUrl(oauthData);

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type !== 'success') {
      return { success: false, error: 'Login cancelled' };
    }

    const url = new URL(result.url);
    const error = url.searchParams.get('error');
    if (error) {
      const desc = url.searchParams.get('error_description') ?? 'OAuth login failed';
      return { success: false, error: desc };
    }

    const code = url.searchParams.get('code') ?? '';
    const state = url.searchParams.get('state') ?? '';
    const tokens = await this.auth.getMemberTokens(code, state, oauthData);
    this.auth.setTokens(tokens);
    await saveTokens(tokens);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/wixAuth.test.ts`
Expected: PASS (17 tests)

**Step 5: Commit**

```bash
git add src/services/wixAuth.ts src/services/__tests__/wixAuth.test.ts
git commit -m "feat(auth): add OAuth redirect login for social providers

Uses expo-web-browser openAuthSessionAsync for Wix-managed login
(Google, Apple via Wix dashboard config). Parses OAuth callback
URL params, exchanges code for member tokens via PKCE.
TDD: 4 new tests (success, cancel, error, network failure)."
```

---

## Task 5: WixAuthService — getCurrentMember

**Files:**
- Modify: `src/services/wixAuth.ts`
- Modify: `src/services/__tests__/wixAuth.test.ts`

**Step 1: Write the failing tests**

Add to `src/services/__tests__/wixAuth.test.ts`:

```typescript
// Update mockClient at top:
const mockMembers = {
  getCurrentMember: jest.fn(),
};
const mockClient = { auth: mockAuth, members: mockMembers };

// Inside the main describe:

describe('getCurrentMember', () => {
  it('returns mapped user when logged in', async () => {
    mockMembers.getCurrentMember.mockResolvedValue({
      member: {
        _id: 'member-123',
        loginEmail: 'real@user.com',
        profile: {
          nickname: 'Real User',
          photo: { url: 'https://example.com/photo.jpg' },
        },
      },
    });

    const user = await service.getCurrentMember();

    expect(user).toEqual({
      id: 'member-123',
      email: 'real@user.com',
      displayName: 'Real User',
      provider: 'wix',
    });
  });

  it('returns null when getCurrentMember fails', async () => {
    mockMembers.getCurrentMember.mockRejectedValue(new Error('Not authenticated'));

    const user = await service.getCurrentMember();

    expect(user).toBeNull();
  });

  it('handles missing profile fields gracefully', async () => {
    mockMembers.getCurrentMember.mockResolvedValue({
      member: {
        _id: 'member-456',
        loginEmail: 'minimal@user.com',
        profile: {},
      },
    });

    const user = await service.getCurrentMember();

    expect(user).toEqual({
      id: 'member-456',
      email: 'minimal@user.com',
      displayName: 'minimal@user.com',
      provider: 'wix',
    });
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx jest src/services/__tests__/wixAuth.test.ts`
Expected: FAIL — `service.getCurrentMember is not a function`

**Step 3: Add implementation**

Add to `src/services/wixAuth.ts`:

```typescript
import type { User } from '@/hooks/useAuth';

// Inside WixAuthService class:

async getCurrentMember(): Promise<User | null> {
  try {
    const client = getWixClient();
    const { member } = await client.members.getCurrentMember();
    return {
      id: member._id,
      email: member.loginEmail,
      displayName: member.profile?.nickname || member.loginEmail,
      provider: 'wix' as User['provider'],
    };
  } catch {
    return null;
  }
}
```

Note: The `User` type currently has `provider: 'email' | 'google' | 'apple'`. We need to add `'wix'` to this union in Task 6 when we rewire useAuth. For now, cast.

**Step 4: Run tests**

Run: `npx jest src/services/__tests__/wixAuth.test.ts`
Expected: PASS (20 tests)

**Step 5: Commit**

```bash
git add src/services/wixAuth.ts src/services/__tests__/wixAuth.test.ts
git commit -m "feat(auth): add getCurrentMember mapping from Wix Members API

Maps Wix member (_id, loginEmail, profile.nickname) to app User type.
Handles missing profile fields by falling back to email.
TDD: 3 new tests (happy path, auth failure, missing fields)."
```

---

## Task 6: Rewire useAuth Hook to Use WixAuthService

**Files:**
- Modify: `src/hooks/useAuth.tsx`
- Modify: `src/hooks/__tests__/useAuth.test.tsx`

This is the integration task. The useAuth public API stays identical — all consumers (LoginScreen, SignUpScreen, AccountScreen, ForgotPasswordScreen) continue working unchanged.

**Step 1: Update the User type**

In `src/hooks/useAuth.tsx`, update the provider union:

```typescript
// OLD:
provider: 'email' | 'google' | 'apple';

// NEW:
provider: 'email' | 'google' | 'apple' | 'wix';
```

**Step 2: Update the hook tests to mock WixAuthService**

Rewrite `src/hooks/__tests__/useAuth.test.tsx` — the test harness stays the same, but now we mock WixAuthService instead of expecting simulated delays:

```typescript
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, Pressable, View } from 'react-native';
import { AuthProvider, useAuth, validateEmail, validatePassword, validateName } from '@/hooks/useAuth';

// Mock WixAuthService
const mockService = {
  loginWithEmail: jest.fn(),
  register: jest.fn(),
  loginWithOAuth: jest.fn(),
  sendPasswordReset: jest.fn(),
  logout: jest.fn(),
  restoreSession: jest.fn(),
  getCurrentMember: jest.fn(),
  isLoggedIn: jest.fn(() => false),
};

jest.mock('@/services/wixAuth', () => ({
  WixAuthService: jest.fn(() => mockService),
}));

function AuthHarness() {
  const auth = useAuth();
  return (
    <View>
      <Text testID="loading">{String(auth.loading)}</Text>
      <Text testID="error">{auth.error ?? ''}</Text>
      <Text testID="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</Text>
      <Text testID="isAuthenticated">{String(auth.isAuthenticated)}</Text>
      <Pressable testID="signIn" onPress={() => auth.signIn('user@test.com', 'Password1')} />
      <Pressable testID="signUp" onPress={() => auth.signUp('new@test.com', 'Password1', 'New User')} />
      <Pressable testID="signInGoogle" onPress={() => auth.signInWithGoogle()} />
      <Pressable testID="signInApple" onPress={() => auth.signInWithApple()} />
      <Pressable testID="resetPassword" onPress={() => auth.resetPassword('user@test.com')} />
      <Pressable testID="signOut" onPress={() => auth.signOut()} />
      <Pressable testID="clearError" onPress={() => auth.clearError()} />
    </View>
  );
}

function renderHarness() {
  return render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>,
  );
}

const mockUser = {
  id: 'member-123',
  email: 'user@test.com',
  displayName: 'Test User',
  provider: 'wix' as const,
};

describe('useAuth (with WixAuthService)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockService.restoreSession.mockResolvedValue(false);
    mockService.getCurrentMember.mockResolvedValue(null);
  });

  it('starts with loading true while restoring session', async () => {
    mockService.restoreSession.mockResolvedValue(false);
    const { getByTestId } = renderHarness();
    // After mount and session restore
    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
    });
    expect(getByTestId('user').props.children).toBe('null');
  });

  it('restores session and loads user on mount', async () => {
    mockService.restoreSession.mockResolvedValue(true);
    mockService.getCurrentMember.mockResolvedValue(mockUser);

    const { getByTestId } = renderHarness();

    await waitFor(() => {
      expect(getByTestId('isAuthenticated').props.children).toBe('true');
    });
    const user = JSON.parse(getByTestId('user').props.children);
    expect(user.email).toBe('user@test.com');
  });

  it('signIn calls loginWithEmail and fetches member', async () => {
    mockService.loginWithEmail.mockResolvedValue({ success: true });
    mockService.getCurrentMember.mockResolvedValue(mockUser);

    const { getByTestId } = renderHarness();
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(getByTestId('signIn'));
    });

    await waitFor(() => {
      expect(getByTestId('isAuthenticated').props.children).toBe('true');
    });
    expect(mockService.loginWithEmail).toHaveBeenCalledWith('user@test.com', 'Password1');
  });

  it('signIn shows error on failure', async () => {
    mockService.loginWithEmail.mockResolvedValue({
      success: false,
      error: 'Invalid email or password',
    });

    const { getByTestId } = renderHarness();
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(getByTestId('signIn'));
    });

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('Invalid email or password');
    });
    expect(getByTestId('isAuthenticated').props.children).toBe('false');
  });

  it('signUp calls register and fetches member', async () => {
    mockService.register.mockResolvedValue({ success: true });
    mockService.getCurrentMember.mockResolvedValue(mockUser);

    const { getByTestId } = renderHarness();
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(getByTestId('signUp'));
    });

    await waitFor(() => {
      expect(getByTestId('isAuthenticated').props.children).toBe('true');
    });
    expect(mockService.register).toHaveBeenCalledWith('new@test.com', 'Password1', 'New User');
  });

  it('signInWithGoogle calls loginWithOAuth', async () => {
    mockService.loginWithOAuth.mockResolvedValue({ success: true });
    mockService.getCurrentMember.mockResolvedValue(mockUser);

    const { getByTestId } = renderHarness();
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(getByTestId('signInGoogle'));
    });

    await waitFor(() => {
      expect(getByTestId('isAuthenticated').props.children).toBe('true');
    });
    expect(mockService.loginWithOAuth).toHaveBeenCalled();
  });

  it('signInWithApple calls loginWithOAuth', async () => {
    mockService.loginWithOAuth.mockResolvedValue({ success: true });
    mockService.getCurrentMember.mockResolvedValue(mockUser);

    const { getByTestId } = renderHarness();
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(getByTestId('signInApple'));
    });

    expect(mockService.loginWithOAuth).toHaveBeenCalled();
  });

  it('resetPassword calls sendPasswordReset', async () => {
    mockService.sendPasswordReset.mockResolvedValue({ success: true });

    const { getByTestId } = renderHarness();
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(getByTestId('resetPassword'));
    });

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
    });
    expect(mockService.sendPasswordReset).toHaveBeenCalledWith('user@test.com');
  });

  it('signOut clears user and calls logout', async () => {
    // Start authenticated
    mockService.restoreSession.mockResolvedValue(true);
    mockService.getCurrentMember.mockResolvedValue(mockUser);
    mockService.logout.mockResolvedValue(undefined);

    const { getByTestId } = renderHarness();
    await waitFor(() => {
      expect(getByTestId('isAuthenticated').props.children).toBe('true');
    });

    await act(async () => {
      fireEvent.press(getByTestId('signOut'));
    });

    await waitFor(() => {
      expect(getByTestId('isAuthenticated').props.children).toBe('false');
    });
    expect(mockService.logout).toHaveBeenCalled();
  });

  it('clearError clears error state', async () => {
    mockService.loginWithEmail.mockResolvedValue({
      success: false,
      error: 'Some error',
    });

    const { getByTestId } = renderHarness();
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(getByTestId('signIn'));
    });
    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('Some error');
    });

    await act(async () => {
      fireEvent.press(getByTestId('clearError'));
    });

    expect(getByTestId('error').props.children).toBe('');
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<AuthHarness />)).toThrow(
      'useAuth must be used within an AuthProvider',
    );
    consoleError.mockRestore();
  });
});

describe('validators', () => {
  describe('validateEmail', () => {
    it('returns null for valid email', () => expect(validateEmail('a@b.com')).toBeNull());
    it('rejects empty', () => expect(validateEmail('')).toBe('Email is required'));
    it('rejects no @', () => expect(validateEmail('invalid')).toBe('Invalid email address'));
  });

  describe('validatePassword', () => {
    it('returns null for valid', () => expect(validatePassword('Password1')).toBeNull());
    it('rejects empty', () => expect(validatePassword('')).toBe('Password is required'));
    it('rejects short', () => expect(validatePassword('Pas1')).toBe('Password must be at least 8 characters'));
    it('rejects no uppercase', () => expect(validatePassword('password1')).toBe('Password must contain an uppercase letter'));
    it('rejects no number', () => expect(validatePassword('Password')).toBe('Password must contain a number'));
  });

  describe('validateName', () => {
    it('returns null for valid', () => expect(validateName('Jo')).toBeNull());
    it('rejects empty', () => expect(validateName('')).toBe('Name is required'));
    it('rejects single char', () => expect(validateName('J')).toBe('Name must be at least 2 characters'));
  });
});
```

**Step 3: Run test to verify the new tests fail**

Run: `npx jest src/hooks/__tests__/useAuth.test.tsx`
Expected: FAIL — the hook still uses mock implementation, not WixAuthService

**Step 4: Rewrite useAuth to use WixAuthService**

Rewrite `src/hooks/useAuth.tsx`:

```typescript
import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import { WixAuthService } from '@/services/wixAuth';

export interface User {
  id: string;
  email: string;
  displayName: string;
  provider: 'email' | 'google' | 'apple' | 'wix';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; user: User }
  | { type: 'AUTH_ERROR'; error: string }
  | { type: 'SIGN_OUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'INIT_DONE' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return { user: action.user, loading: false, error: null };
    case 'AUTH_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'SIGN_OUT':
      return { user: null, loading: false, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null, loading: false };
    case 'INIT_DONE':
      return { ...state, loading: false };
    default:
      return state;
  }
}

/** Validation helpers */
export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Invalid email address';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  return null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    error: null,
  });

  const authService = useMemo(() => new WixAuthService(), []);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const restored = await authService.restoreSession();
      if (!mounted) return;
      if (restored) {
        const member = await authService.getCurrentMember();
        if (mounted && member) {
          dispatch({ type: 'AUTH_SUCCESS', user: member });
          return;
        }
      }
      if (mounted) dispatch({ type: 'INIT_DONE' });
    })();
    return () => { mounted = false; };
  }, [authService]);

  const signIn = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    const result = await authService.loginWithEmail(email, password);
    if (result.success) {
      const member = await authService.getCurrentMember();
      if (member) {
        dispatch({ type: 'AUTH_SUCCESS', user: member });
        return;
      }
    }
    dispatch({ type: 'AUTH_ERROR', error: result.error ?? 'Login failed' });
  }, [authService]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    dispatch({ type: 'AUTH_START' });
    const result = await authService.register(email, password, displayName);
    if (result.success) {
      const member = await authService.getCurrentMember();
      if (member) {
        dispatch({ type: 'AUTH_SUCCESS', user: member });
        return;
      }
    }
    dispatch({ type: 'AUTH_ERROR', error: result.error ?? 'Registration failed' });
  }, [authService]);

  const signInWithGoogle = useCallback(async () => {
    dispatch({ type: 'AUTH_START' });
    const result = await authService.loginWithOAuth();
    if (result.success) {
      const member = await authService.getCurrentMember();
      if (member) {
        dispatch({ type: 'AUTH_SUCCESS', user: member });
        return;
      }
    }
    dispatch({ type: 'AUTH_ERROR', error: result.error ?? 'Google login failed' });
  }, [authService]);

  const signInWithApple = useCallback(async () => {
    dispatch({ type: 'AUTH_START' });
    const result = await authService.loginWithOAuth();
    if (result.success) {
      const member = await authService.getCurrentMember();
      if (member) {
        dispatch({ type: 'AUTH_SUCCESS', user: member });
        return;
      }
    }
    dispatch({ type: 'AUTH_ERROR', error: result.error ?? 'Apple login failed' });
  }, [authService]);

  const resetPassword = useCallback(async (email: string) => {
    dispatch({ type: 'AUTH_START' });
    await authService.sendPasswordReset(email);
    dispatch({ type: 'CLEAR_ERROR' });
  }, [authService]);

  const signOut = useCallback(() => {
    authService.logout();
    dispatch({ type: 'SIGN_OUT' });
  }, [authService]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      loading: state.loading,
      error: state.error,
      isAuthenticated: state.user !== null,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      resetPassword,
      signOut,
      clearError,
    }),
    [state, signIn, signUp, signInWithGoogle, signInWithApple, resetPassword, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
```

**Step 5: Run tests**

Run: `npx jest src/hooks/__tests__/useAuth.test.tsx`
Expected: PASS (all tests)

**Step 6: Run ALL tests to check nothing is broken**

Run: `npx jest`
Expected: Screen tests (LoginScreen, AccountScreen) should still pass since they wrap in `<AuthProvider>` and the mock service resolves quickly.

If screen tests fail because they relied on the old mock behavior (sentinel emails like `bad@test.com`), update the screen test files to mock WixAuthService at the service level:

Add to top of each failing screen test:
```typescript
jest.mock('@/services/wixAuth', () => ({
  WixAuthService: jest.fn(() => ({
    loginWithEmail: jest.fn().mockResolvedValue({ success: false, error: 'Invalid email or password' }),
    register: jest.fn().mockResolvedValue({ success: true }),
    loginWithOAuth: jest.fn().mockResolvedValue({ success: true }),
    sendPasswordReset: jest.fn().mockResolvedValue({ success: true }),
    logout: jest.fn(),
    restoreSession: jest.fn().mockResolvedValue(false),
    getCurrentMember: jest.fn().mockResolvedValue(null),
    isLoggedIn: jest.fn(() => false),
  })),
}));
```

**Step 7: Commit**

```bash
git add src/hooks/useAuth.tsx src/hooks/__tests__/useAuth.test.tsx
git commit -m "feat(auth): rewire useAuth to WixAuthService

Replace mock simulateDelay auth with real Wix Members API calls.
Public API unchanged — all screen consumers work without modification.
Session restore on mount via expo-secure-store tokens.
Social login (Google/Apple) routes through Wix OAuth managed page.
TDD: 12 tests covering all auth flows + validators."
```

---

## Task 7: Fix Screen Tests for New Auth Backend

**Files:**
- Modify: `src/screens/__tests__/LoginScreen.test.tsx`
- Modify: `src/screens/__tests__/AccountScreen.test.tsx`

**Step 1: Run all tests to identify failures**

Run: `npx jest --verbose 2>&1 | head -100`
Note which screen tests fail.

**Step 2: Add WixAuthService mock to LoginScreen tests**

Add at top of `src/screens/__tests__/LoginScreen.test.tsx`:

```typescript
jest.mock('@/services/wixAuth', () => ({
  WixAuthService: jest.fn(() => ({
    loginWithEmail: jest.fn().mockResolvedValue({ success: true }),
    register: jest.fn().mockResolvedValue({ success: true }),
    loginWithOAuth: jest.fn().mockResolvedValue({ success: true }),
    sendPasswordReset: jest.fn().mockResolvedValue({ success: true }),
    logout: jest.fn(),
    restoreSession: jest.fn().mockResolvedValue(false),
    getCurrentMember: jest.fn().mockResolvedValue(null),
    isLoggedIn: jest.fn(() => false),
  })),
}));
```

**Step 3: Add WixAuthService mock to AccountScreen tests**

Add same mock to `src/screens/__tests__/AccountScreen.test.tsx`. Update the `AutoSignIn` helper to work with the mock service — it should mock `loginWithEmail` → success and `getCurrentMember` → return a user, then trigger signIn.

**Step 4: Run all tests**

Run: `npx jest`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/screens/__tests__/LoginScreen.test.tsx src/screens/__tests__/AccountScreen.test.tsx
git commit -m "test(auth): update screen tests for WixAuthService backend

Add WixAuthService mock to LoginScreen and AccountScreen tests.
All existing test assertions still pass with new auth backend."
```

---

## Task 8: Add jest.setup.js mocks for new Expo modules

**Files:**
- Modify: `jest.setup.js`

The new Expo packages need global mocks so every test file doesn't need to declare them.

**Step 1: Add mocks**

Append to `jest.setup.js`:

```javascript
// Wix auth dependencies
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `carolinafutons://${path}`),
  addEventListener: jest.fn(),
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { default: View, WebView: View };
});
```

**Step 2: Run full test suite**

Run: `npx jest`
Expected: ALL PASS — no test needs to individually mock these anymore (they can override if needed).

**Step 3: Commit**

```bash
git add jest.setup.js
git commit -m "test: add global mocks for expo-secure-store, expo-web-browser, expo-linking

Prevents every test file from needing individual Expo module mocks.
Tests can override with jest.mock() at file level when needed."
```

---

## Task 9: Add .env.example with WIX_CLIENT_ID

**Files:**
- Create: `.env.example`

**Step 1: Create the file**

```
# Wix Headless Client ID (from Wix Dashboard > Settings > Headless Settings)
EXPO_PUBLIC_WIX_CLIENT_ID=your-client-id-here
```

**Step 2: Verify .gitignore excludes .env but not .env.example**

Check `.gitignore` — if it doesn't have `.env`, add it:
```
.env
.env.local
```

**Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add .env.example with WIX_CLIENT_ID placeholder

Documents the required Wix Headless Client ID env var.
Actual .env is gitignored."
```

---

## Summary of Deliverables

| Task | Files | Tests | What |
|------|-------|-------|------|
| 1 | wixClient.ts | 3 | Singleton SDK client |
| 2 | tokenStorage.ts | 4 | Secure token persistence |
| 3 | wixAuth.ts | 13 | Email login/register/reset/restore |
| 4 | wixAuth.ts (extend) | 4 | OAuth social login flow |
| 5 | wixAuth.ts (extend) | 3 | getCurrentMember mapping |
| 6 | useAuth.tsx (rewrite) | 12 | Hook rewired to WixAuthService |
| 7 | screen tests | — | Fix existing screen tests |
| 8 | jest.setup.js | — | Global mocks for new deps |
| 9 | .env.example | — | Config documentation |

**Total: ~39 new tests, 9 commits, 4 new files, 4 modified files.**
