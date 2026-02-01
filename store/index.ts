import { configureStore } from '@reduxjs/toolkit'
import globalSlices from './globalSlices'
import authReducer from './states/authSlice'

export const store = configureStore({
  reducer: {
    globalStates: globalSlices,
    auth: authReducer,
  },
})

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store;
