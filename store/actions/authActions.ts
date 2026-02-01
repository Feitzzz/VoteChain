import { AppDispatch } from '..';
import { setLoading, setError, loginSuccess, updateUser, logout } from '../states/authSlice';
import { toast } from 'react-toastify';

interface RegistrationData {
  name: string;
  nationalId: string;
  email: string;
  password: string;
}

interface OTPVerificationData {
  email: string;
  otp: string;
}

interface LoginData {
  email: string;
  password: string;
}

// Helper to save user data to localStorage
const saveUserData = (userData: any) => {
  if (typeof window !== 'undefined' && userData) {
    try {
      localStorage.setItem('user_data', JSON.stringify(userData));
    } catch (e) {
      console.error('Error saving user data to localStorage:', e);
    }
  }
};

// Helper to safely dismiss toasts without errors
const safeDismissToast = (toastId: string) => {
  if (toast.isActive(toastId)) {
    toast.dismiss(toastId);
  }
};

// Register a new user
export const registerUser = (userData: RegistrationData) => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      dispatch(setError(data.message || 'Registration failed'));
      dispatch(setLoading(false));
      return { success: false };
    }
    
    dispatch(setLoading(false));
    dispatch(setError(null));
    
    // Save user data for persistence
    if (data.user) {
      saveUserData(data.user);
    }
    
    return { 
      success: true, 
      otpSent: data.otpSent, 
      otp: data.otp, // Pass the OTP from response for demonstration
      user: data.user 
    };
  } catch (error: any) {
    dispatch(setError(error?.message || 'Registration failed'));
    dispatch(setLoading(false));
    return { success: false };
  }
};

// Verify OTP
export const verifyOTP = (verifyData: OTPVerificationData) => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyData),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      dispatch(setError(data.message || 'OTP verification failed'));
      dispatch(setLoading(false));
      return { success: false };
    }
    
    // Safely dismiss the OTP toast to prevent errors
    safeDismissToast('otp-notification');
    
    // Save complete user data in localStorage
    if (data.user) {
      saveUserData(data.user);
    }
    
    // Login user after successful verification
    dispatch(loginSuccess({ user: data.user, token: data.token }));
    return { success: true };
  } catch (error: any) {
    dispatch(setError(error?.message || 'OTP verification failed'));
    dispatch(setLoading(false));
    return { success: false };
  }
};

// Login user
export const loginUser = (loginData: LoginData) => async (dispatch: AppDispatch) => {
  const loginToastId = 'login-toast';
  dispatch(setLoading(true));
  
  // Show login in progress toast
  toast.info('Signing in...', { 
    autoClose: false, 
    toastId: loginToastId
  });
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });
    
    const data = await res.json();
    
    // Safely dismiss the login toast
    safeDismissToast(loginToastId);
    
    if (!res.ok) {
      dispatch(setError(data.message || 'Login failed'));
      dispatch(setLoading(false));
      toast.error(data.message || 'Login failed');
      return { success: false };
    }
    
    // Save complete user data in localStorage
    if (data.user) {
      saveUserData(data.user);
    }
    
    dispatch(loginSuccess({ user: data.user, token: data.token }));
    toast.success('Login successful!');
    return { success: true };
  } catch (error: any) {
    // Safely dismiss the login toast
    safeDismissToast(loginToastId);
    
    dispatch(setError(error?.message || 'Login failed'));
    dispatch(setLoading(false));
    toast.error(error?.message || 'Login failed');
    return { success: false };
  }
};

// Get current user
export const getCurrentUser = () => async (dispatch: AppDispatch) => {
  // Don't set loading to true here to avoid UI flicker on app startup
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false };
    }
    
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      // If token is invalid, remove it and log out
      if (res.status === 401) {
        dispatch(logout());
      }
      return { success: false };
    }
    
    // Save complete user data in localStorage
    if (data.user) {
      saveUserData(data.user);
    }
    
    dispatch(updateUser(data.user));
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

// Logout user
export const logoutUser = () => (dispatch: AppDispatch) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_data');
  }
  dispatch(logout());
  return { success: true };
}; 