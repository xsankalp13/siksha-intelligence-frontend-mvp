import { api } from "@/lib/axios";
import type { MessageResponse } from "./types/common";
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "./types/auth";

// ── Auth Service ─────────────────────────────────────────────────────

export const authService = {
  /** POST /auth/login */
  login(data: LoginRequest) {
    return api.post<LoginResponse>("/auth/login", data);
  },

  /** POST /auth/logout */
  logout(data: LogoutRequest) {
    return api.post<MessageResponse>("/auth/logout", data);
  },

  /** POST /auth/refresh-token */
  refreshToken(data: RefreshTokenRequest) {
    return api.post<RefreshTokenResponse>("/auth/refresh-token", data);
  },

  /** POST /auth/forgot-password */
  forgotPassword(data: ForgotPasswordRequest) {
    return api.post<MessageResponse>("/auth/forgot-password", data);
  },

  /** POST /auth/reset-password */
  resetPassword(data: ResetPasswordRequest) {
    return api.post<MessageResponse>("/auth/reset-password", data);
  },
};
