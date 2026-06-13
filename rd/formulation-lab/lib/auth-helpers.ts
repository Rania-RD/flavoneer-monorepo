import { authClient } from "./auth-client";

interface AuthResponse {
  data?: unknown;
  error?: string;
  success: boolean;
}

export const authHelpers = {
  /**
   * Sign in with email and password
   */
  async signInWithEmail(
    email: string,
    password: string
  ): Promise<AuthResponse> {
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Sign in failed",
        };
      }
      return { success: true, data: result.data };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { success: false, error: err.message };
      }
      return {
        success: false,
        error: "An unexpected error occurred during sign in",
      };
    }
  },

  /**
   * Sign up with email, password, and name
   */
  async signUpWithEmail(
    email: string,
    password: string,
    name: string
  ): Promise<AuthResponse> {
    try {
      const result = await authClient.signUp.email({ email, password, name });
      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Sign up failed",
        };
      }
      return { success: true, data: result.data };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { success: false, error: err.message };
      }
      return {
        success: false,
        error: "An unexpected error occurred during sign up",
      };
    }
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<AuthResponse> {
    try {
      await authClient.signOut();
      return { success: true };
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { success: false, error: err.message };
      }
      return {
        success: false,
        error: "An unexpected error occurred during sign out",
      };
    }
  },
};
