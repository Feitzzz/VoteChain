import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
}

// Authentication state interface
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Get token from localStorage if it exists
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Initial state
const initialState: AuthState = {
  user: null,
  token: getToken(),
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Create the auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Set error message
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Login success - set user and token
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      
      // Save token to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', action.payload.token);
      }
    },
    
    // Update user information
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    
    // Logout - clear user and token
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      
      // Remove token from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    },
  },
});

// Export actions
export const { 
  setLoading, 
  setError, 
  loginSuccess, 
  updateUser, 
  logout 
} = authSlice.actions;

// Export reducer
export default authSlice.reducer; 