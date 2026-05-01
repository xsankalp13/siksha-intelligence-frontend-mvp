import { configureStore } from '@reduxjs/toolkit'
import { initializeAxiosAuth } from '@/lib/axios'
import { appReducer } from './appSlice'
import { authReducer, markSessionExpired, setCredentials } from './slices/authSlice'
import { timetableReducer } from '@/features/academics/timetable_management'
import { teacherReducer } from './slices/teacherSlice'

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
    timetable: timetableReducer,
    teacher: teacherReducer,
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
    // Dispatch markSessionExpired instead of immediately navigating.
    // The SessionExpiredDialog component observes this flag and shows a modal.
    // Navigation to /login only happens after the user clicks OK.
    store.dispatch(markSessionExpired())
  },
  navigateTo403: () => {
    // Navigate to 403 page - page uses navigate(-1) to go back safely
    window.location.replace('/403')
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

