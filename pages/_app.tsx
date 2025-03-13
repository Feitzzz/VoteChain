import { AppProps } from 'next/app'
import '@/styles/global.css'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useEffect, useState } from 'react'
import { checkWallet } from '@/services/blockchain'
// Chat functionality commented out as requested
// import CometChatNoSSR from '@/components/CometChatNoSSR'
import ContractStatus from '@/components/ContractStatus'
import Head from 'next/head'
import { jwtDecode } from "jwt-decode"
import { loginSuccess } from '@/store/states/authSlice'

function AppContent({ Component, pageProps }: AppProps) {
  const [showChild, setShowChild] = useState<boolean>(false)
  
  useEffect(() => {
    // Check for wallet
    checkWallet()
    
    // Check for authentication token
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (token) {
          // Verify token validity
          const decoded: any = jwtDecode(token)
          
          // Check if token is expired
          if (decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem('token')
            return
          }
          
          // Get user data from localStorage if available for more complete data
          // This ensures we have the full user name even after a page refresh
          let userName = decoded.name || 'User';
          
          // Try to get the complete user data from localStorage
          const userData = localStorage.getItem('user_data');
          if (userData) {
            try {
              const parsedUserData = JSON.parse(userData);
              if (parsedUserData && parsedUserData.name) {
                userName = parsedUserData.name;
              }
            } catch (e) {
              console.error('Error parsing user data from localStorage:', e);
            }
          }
          
          // Set authenticated user data with properly preserved name
          store.dispatch(loginSuccess({
            token,
            user: {
              id: decoded.id,
              name: userName,
              email: decoded.email || '',
            }
          }))
        }
      } catch (error) {
        // If token is invalid, remove it
        localStorage.removeItem('token')
        localStorage.removeItem('user_data')
      }
    }
    
    initAuth()
    setShowChild(true)
  }, [])

  if (!showChild || typeof window === 'undefined') {
    return null
  } else {
    return (
      <>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          {/* Custom styles for OTP toast */}
          <style>{`
            .otp-toast {
              font-size: 16px !important;
              padding: 16px !important;
              border-radius: 8px !important;
              border-left: 6px solid #0ea5e9 !important;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
              max-width: 400px !important;
              width: auto !important;
            }
            .otp-content {
              min-width: 300px;
            }
            .Toastify__toast-container--top-center {
              top: 5em;
              width: auto !important;
              max-width: 500px !important;
              margin-left: auto;
              margin-right: auto;
            }
            .Toastify__toast.otp-toast {
              z-index: 9999;
            }
            /* Style for copyable OTP */
            .otp-toast .bg-white {
              user-select: all;
              -webkit-user-select: all;
              -moz-user-select: all;
              -ms-user-select: all;
              cursor: text;
            }
          `}</style>
        </Head>
        
        {/* Chat functionality commented out as requested */}
        {/* <CometChatNoSSR /> */}
        <ContractStatus />
        <Component {...pageProps} />

        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </>
    )
  }
}

export default function MyApp(props: AppProps) {
  return (
    <Provider store={store}>
      <AppContent {...props} />
    </Provider>
  )
}
