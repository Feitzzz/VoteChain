import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOTP } from '../../store/actions/authActions';
import { AppDispatch, RootState } from '../../store';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Helper to safely dismiss toasts without errors
const safeDismissToast = (toastId: string) => {
  if (toast.isActive(toastId)) {
    toast.dismiss(toastId);
  }
};

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [savedOtp, setSavedOtp] = useState<string | null>(null);
  
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Get email from query params
    if (router.query.email) {
      setEmail(router.query.email as string);
    }
    
    // Check if we have a saved OTP from registration
    const currentOtp = localStorage.getItem('current_otp');
    if (currentOtp) {
      setSavedOtp(currentOtp);
    }
    
    // Set up countdown timer
    const countdown = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);
    
    // Cleanup timer on unmount
    return () => clearInterval(countdown);
  }, [router.query.email]);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      // Safely dismiss the OTP toast when verification is successful
      safeDismissToast('otp-notification');
      
      // Remove saved OTP from localStorage
      localStorage.removeItem('current_otp');
      
      // Navigate to home page
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Function to auto-fill OTP from saved value
  const autoFillOtp = () => {
    if (savedOtp) {
      setOtp(savedOtp);
      toast.info('OTP auto-filled from previous screen', {
        autoClose: 2000,
      });
    }
  };

  // Format timer to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle OTP input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and max 6 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate OTP length
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }
    
    // Check if timer has expired
    if (timer === 0) {
      toast.error('OTP has expired. Please register again');
      return;
    }
    
    // Create a verification toast with ID
    const verifyToastId = 'verify-otp-toast';
    toast.info('Verifying OTP...', { 
      autoClose: false, 
      toastId: verifyToastId 
    });
    
    try {
      // Verify OTP
      const result = await dispatch(verifyOTP({ email, otp }));
      
      // Safely dismiss the verification toast
      safeDismissToast(verifyToastId);
      
      if (result.success) {
        toast.success('OTP verification successful!');
        // Router will redirect in useEffect when isAuthenticated changes
        // This will also clear the OTP toast
      }
    } catch (error) {
      // Safely dismiss the verification toast
      safeDismissToast(verifyToastId);
      
      toast.error('Verification failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify OTP
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            A 6-digit code has been sent to {email || 'your email'}
          </p>
          {timer > 0 && (
            <p className="mt-1 text-center text-sm font-medium text-blue-600">
              Time remaining: {formatTime(timer)}
            </p>
          )}
          {timer === 0 && (
            <p className="mt-1 text-center text-sm font-medium text-red-600">
              OTP expired. Please register again.
            </p>
          )}
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="otp" className="sr-only">
              OTP Code
            </label>
            <div className="relative">
              <input
                id="otp"
                name="otp"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-lg text-center tracking-widest"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={handleChange}
                disabled={timer === 0 || loading}
                maxLength={6}
              />
              {savedOtp && otp.length === 0 && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-700"
                  onClick={autoFillOtp}
                >
                  Auto-fill
                </button>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={otp.length !== 6 || timer === 0 || loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (otp.length !== 6 || timer === 0 || loading) ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default VerifyOTP; 