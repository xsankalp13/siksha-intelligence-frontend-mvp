import { configureStore } from '@reduxjs/toolkit'
import { initializeAxiosAuth } from '@/lib/axios'
import { appReducer } from './appSlice'
import { authReducer, logout, setCredentials } from './slices/authSlice'

// Load persisted auth state from localStorage
const loadPersistedAuthState = () => {
  try {
    const serializedState = localStorage.getItem('si_auth_state')
    if (serializedState === null) {
      return undefined
    }
    const parsed = JSON.parse(serializedState)
    // Only restore if we have a valid access token or refresh token
    if (parsed.accessToken || parsed.refreshToken) {
      return {
        auth: {
          ...parsed,
          loading: false,
          error: null,
        },
      }
    }
    return undefined
  } catch (err) {
    console.error('Failed to load auth state:', err)
    return undefined
  }
}

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
  },
  preloadedState: loadPersistedAuthState(),
})

// Persist auth state to localStorage whenever it changes
store.subscribe(() => {
  try {
    const authState = store.getState().auth
    const stateToPersist = {
      user: authState.user,
      accessToken: authState.accessToken,
      refreshToken: authState.refreshToken,
      isAuthenticated: authState.isAuthenticated,
      requiresPasswordChange: authState.requiresPasswordChange,
    }
    localStorage.setItem('si_auth_state', JSON.stringify(stateToPersist))
  } catch (err) {
    console.error('Failed to save auth state:', err)
  }
})

initializeAxiosAuth({
  getAccessToken: () => store.getState().auth.accessToken,
  getUser: () => store.getState().auth.user,
  setAccessToken: (token) => {
    store.dispatch(setCredentials({ user: store.getState().auth.user, accessToken: token }))
  },
  logoutAndRedirect: () => {
    store.dispatch(logout())
    window.location.assign('/login')
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

