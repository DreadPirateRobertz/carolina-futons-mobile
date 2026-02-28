import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getWixClient } from './wixClient';
import { saveTokens, loadTokens, clearTokens } from './tokenStorage';

const OAUTH_CALLBACK_PATH = 'oauth/wix/callback';
const RESET_REDIRECT = 'carolinafutons://reset-password';

export interface AuthResult {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  provider: 'wix';
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

      const errorMsg =
        ERROR_MESSAGES[response.errorCode] ?? 'Invalid email or password';
      return { success: false, error: errorMsg };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthResult> {
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

      const errorMsg =
        ERROR_MESSAGES[response.errorCode] ?? 'Registration failed';
      return { success: false, error: errorMsg };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

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
        const desc =
          url.searchParams.get('error_description') ?? 'OAuth login failed';
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

  async getCurrentMember(): Promise<AuthUser | null> {
    try {
      const client = getWixClient();
      const { member } = await client.members.getCurrentMember();
      return {
        id: member._id,
        email: member.loginEmail,
        displayName: member.profile?.nickname || member.loginEmail,
        provider: 'wix',
      };
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.auth.loggedIn();
  }

  async refreshSession(): Promise<boolean> {
    try {
      const currentTokens = this.auth.getTokens();
      const newTokens = await this.auth.renewToken(currentTokens.refreshToken);
      this.auth.setTokens(newTokens);
      await saveTokens(newTokens);
      return true;
    } catch {
      await clearTokens();
      return false;
    }
  }
}
