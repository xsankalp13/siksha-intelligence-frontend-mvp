import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { api } from '@/lib/axios'
import { getStoredRefreshToken, clearStoredRefreshToken, setStoredRefreshToken } from '@/lib/refreshToken'

// Lazy registration from main.tsx to avoid importing app bootstrap code here.
let _queryClient: { clear: () => void } | null = null
export function registerQueryClient(qc: { clear: () => void }) {
  _queryClient = qc
}

export interface User {
  /** Backend user identifier (from `userDetailsDto.userId`). */
  userId: string
  username: string
  firstName?: string
  lastName?: string
  email: string
  roles: string[]
  profileUrl?: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  /** Backend may force the user to change password after login. */
  requiresPasswordChange: boolean
  loading: boolean
  error: string | null
  /**
   * Set to true when the session expires and there is no refresh token to recover.
   * Triggers a "Session Expired" dialog instead of an immediate redirect.
   */
  sessionExpired: boolean
}

export interface LoginRequest {
  username: string
  password: string
  /**
   * When true, backend returns a refresh token and the frontend persists it.
   * When false, backend returns refreshToken = null and frontend clears any stored refresh token.
   */
  rememberMe: boolean
}

interface LoginResponse {
  user: User
  accessToken: string
  refreshToken?: string
  requiresPasswordChange?: boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  requiresPasswordChange: false,
  loading: false,
  error: null,
  sessionExpired: false,
}

const extractMessage = (error: unknown): string => {
  // Keep error handling resilient to different Axios/backends error shapes.
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, any>;
    // Check if the backend sent a specific error message in the response body
    const responseMessage = errObj.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
      return responseMessage;
    }
    // Fallback to the generic error message (e.g. "Request failed with status code 401")
    if (typeof errObj.message === 'string') {
      return errObj.message;
    }
  }
  return 'Something went wrong'
}

const normalizeLoginResponse = (data: any): LoginResponse => {
  // Swagger shape: { accessToken, refreshToken, userDetailsDto, roles, requiresPasswordChange }
  const token =
    data?.accessToken ??
    data?.access_token ??
    data?.token ??
    data?.data?.accessToken ??
    data?.data?.access_token ??
    data?.data?.token

  const refreshToken =
    data?.refreshToken ??
    data?.refresh_token ??
    data?.data?.refreshToken ??
    data?.data?.refresh_token

  const userDetails =
    data?.userDetailsDto ??
    data?.data?.userDetailsDto ??
    data?.userDetails ??
    data?.data?.userDetails

  const requiresPasswordChange =
    data?.requiresPasswordChange ??
    data?.data?.requiresPasswordChange

  if (!token || typeof token !== 'string') {
    throw new Error('Login failed: missing access token')
  }

  if (!userDetails || typeof userDetails !== 'object') {
    throw new Error('Login failed: missing user data')
  }

  return {
    accessToken: token,
    refreshToken: typeof refreshToken === 'string' && refreshToken.length > 0 ? refreshToken : undefined,
    requiresPasswordChange: typeof requiresPasswordChange === 'boolean' ? requiresPasswordChange : undefined,
    user: {
      userId: String(userDetails.userId ?? userDetails.user_id ?? userDetails.id ?? ''),
      username: String(userDetails.username ?? ''),
      firstName: userDetails.firstName ?? undefined,
      lastName: userDetails.lastName ?? undefined,
      email: String(userDetails.email ?? ''),
      roles: Array.isArray(userDetails.roles)
        ? userDetails.roles.map(String)
        : (Array.isArray(data?.roles) ? data.roles.map(String) : []),
      profileUrl: userDetails.profileUrl ?? data?.profileUrl ?? undefined,
    },
  }
}

export const login = createAsyncThunk<LoginResponse, LoginRequest, { rejectValue: string }>(
  'auth/login',
  async (credentials, thunkApi) => {
    try {
      // Always send rememberMe so backend can decide whether to return a refresh token.
      const payload: Record<string, unknown> = {
        username: credentials.username,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      }

      // Bypass for mock parent user
      if (credentials.username.toLowerCase() === 'parent') {
        const mockResponse = {
          accessToken: "mock-token-parent-1234",
          requiresPasswordChange: false,
          user: {
            userId: "parent-1",
            username: "parentUser",
            firstName: "Parent",
            lastName: "User",
            email: "parent@edusync.com",
            roles: ["PARENT"],
            profileUrl: undefined
          }
        };
        return mockResponse;
      }

      const res = await api.post('/auth/login', payload, { withCredentials: true })
      return normalizeLoginResponse(res.data)
    } catch (err) {
      return thunkApi.rejectWithValue(extractMessage(err))
    }
  },
)

export const logoutUser = createAsyncThunk<void, void, { state: { auth: AuthState } }>(
  'auth/logoutUser',
  async (_, { getState, dispatch }) => {
    try {
      const { auth } = getState();
      const refreshToken = auth.refreshToken || getStoredRefreshToken();

      if (refreshToken) {
        // Best practice: Fire the backend logout to invalidate the session/token/refresh token.
        // We catch errors to ensure local logout still succeeds even if the network fails.
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Backend logout failed', err);
    } finally {
      // Always dispatch the synchronous logout to immediately clear local state
      dispatch(authSlice.actions.logout());
    }
  }
)

export const refreshSession = createAsyncThunk<LoginResponse, void, { state: { auth: AuthState }, rejectValue: string }>(
  'auth/refreshSession',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const refreshToken = auth.refreshToken || getStoredRefreshToken();

      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      const res = await api.post('/auth/refresh-token', { refreshToken });
      return normalizeLoginResponse(res.data);
    } catch (err) {
      return rejectWithValue(extractMessage(err));
    }
  }
)

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User | null; accessToken: string | null }>) => {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.isAuthenticated = Boolean(action.payload.accessToken)
      state.error = null
    },
    logout: (state) => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.loading = false
      state.error = null
      state.sessionExpired = false

      clearStoredRefreshToken()
      // Clear persisted auth state
      try {
        localStorage.removeItem('si_auth_state')
      } catch {
        // ignore
      }

      // Prevent stale cross-user data from React Query cache.
      _queryClient?.clear()
    },

    /**
     * Called when the access token expires and no refresh token is available.
     * Clears credentials but shows a dialog INSTEAD of immediately redirecting.
     * The user acknowledges the dialog, then navigates to /login themselves.
     */
    markSessionExpired: (state) => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.sessionExpired = true
      clearStoredRefreshToken()
      try { localStorage.removeItem('si_auth_state') } catch { /* ignore */ }

      // Prevent stale cross-user data from React Query cache.
      _queryClient?.clear()
    },

    /** Called after the user dismisses the session-expired dialog. */
    clearSessionExpired: (state) => {
      state.sessionExpired = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        // Persist refresh token only if the user chose "Remember me".
        const rememberMe = Boolean(action.meta.arg.rememberMe)
        state.refreshToken = rememberMe ? (action.payload.refreshToken ?? null) : null
        state.isAuthenticated = true
        state.requiresPasswordChange = Boolean(action.payload.requiresPasswordChange)
        state.error = null

        if (rememberMe && action.payload.refreshToken) {
          setStoredRefreshToken(action.payload.refreshToken)
        } else {
          clearStoredRefreshToken()
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Login failed'
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        if (action.payload.refreshToken) {
          state.refreshToken = action.payload.refreshToken
          setStoredRefreshToken(action.payload.refreshToken)
        }
        state.isAuthenticated = true
      })
  },
})

export const { setCredentials, logout, markSessionExpired, clearSessionExpired } = authSlice.actions
export const authReducer = authSlice.reducer
