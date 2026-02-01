import { useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../store/actions/authActions';
import { AppDispatch, RootState } from '../../store';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    nationalId: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  // Function to copy OTP to clipboard
  const copyOTPToClipboard = (otp: string) => {
    navigator.clipboard.writeText(otp).then(() => {
      toast.success('OTP copied to clipboard!', {
        position: "bottom-right",
        autoClose: 2000,
      });
    }).catch((err) => {
      console.error('Failed to copy OTP: ', err);
    });
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For NIN, only allow digits and max 11 characters
    if (name === 'nationalId') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
      setFormData({ ...formData, [name]: digitsOnly });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.nationalId || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    // Validate NIN is exactly 11 digits
    if (!/^\d{11}$/.test(formData.nationalId)) {
      toast.error('National ID Number must be exactly 11 digits');
      return;
    }
    
    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    // Check if password is strong enough
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    // Register user
    const result = await dispatch(registerUser({
      name: formData.name,
      nationalId: formData.nationalId,
      email: formData.email,
      password: formData.password,
    }));
    
    if (result.success) {
      // Display the OTP in a persistent toast message for demo purposes
      if (result.otp) {
        // Create a customized toast with copy button
        const OTPContent = () => (
          <div className="otp-content">
            <div className="flex flex-col">
              <span className="font-semibold mb-2">Your OTP Code:</span>
              <div className="flex items-center justify-between">
                <span 
                  className="bg-white px-4 py-2 rounded-md text-xl font-bold tracking-widest cursor-text select-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {result.otp}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyOTPToClipboard(result.otp as string);
                  }}
                  className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  Copy
                </button>
              </div>
              <span className="text-xs mt-2 text-blue-800">
                This OTP will be valid for 10 minutes
              </span>
            </div>
          </div>
        );

        // Show the OTP toast with ID for later reference
        toast.info(<OTPContent />, {
          position: "top-center",
          autoClose: 600000, // 10 minutes
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          className: "otp-toast",
          style: { 
            background: '#f0f9ff', 
            color: '#0369a1',
            border: '1px solid #0ea5e9',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
          toastId: 'otp-notification', // Add a unique ID to reference later
        });
      }
      
      toast.success('Registration successful! Please verify with OTP.');
      // Store the OTP in localStorage to persist between pages (will be removed after verification)
      if (result.otp) {
        localStorage.setItem('current_otp', result.otp);
      }
      // Navigate to OTP verification page
      router.push(`/auth/verify-otp?email=${encodeURIComponent(formData.email)}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/login">
              <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                sign in to your account
              </span>
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="nationalId" className="sr-only">
                National ID Number
              </label>
              <input
                id="nationalId"
                name="nationalId"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="National ID Number (11 digits)"
                value={formData.nationalId}
                onChange={handleChange}
                maxLength={11}
                pattern="\d{11}"
                title="National ID Number must be exactly 11 digits"
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Registering...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Configure ToastContainer for better visibility of OTP */}
      <ToastContainer 
        position="bottom-right"
        autoClose={5000}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
      />
    </div>
  );
};

export default Register; 