import { connectWallet, truncate } from '@/services/blockchain'
import { RootState } from '@/utils/types'
import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/router'
import { logoutUser } from '../store/actions/authActions'
import { AppDispatch } from '../store'

const Navbar = () => {
  const { wallet } = useSelector((states: RootState) => states.globalStates)
  const { isAuthenticated, user } = useSelector((state: any) => state.auth)
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Add effect to handle body scroll locking when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      // Prevent background scrolling when menu is open
      document.body.style.overflow = 'hidden'
    } else {
      // Re-enable scrolling when menu is closed
      document.body.style.overflow = 'auto'
    }

    // Clean up effect when component unmounts
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isMenuOpen])

  const handleLogout = () => {
    dispatch(logoutUser())
    router.push('/auth/login')
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-5 py-3 sm:py-4 mx-auto bg-dark-900/90 backdrop-blur-md">
      <div className="container flex items-center justify-between max-w-6xl mx-auto">
        {/* Logo and Navigation Links */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center text-xl font-medium md:text-2xl">
            <span className="text-primary-500">Vote</span>
            <span className="font-bold text-white">Chain</span>
          </Link>
          
          <div className="hidden md:flex items-center ml-8 space-x-6 text-sm">
            <Link 
              href="/" 
              className={`text-gray-300 hover:text-white transition-colors ${router.pathname === '/' ? 'font-medium text-white' : ''}`}
            >
              Polls
            </Link>
            <Link 
              href="/transactions" 
              className={`text-gray-300 hover:text-white transition-colors ${router.pathname === '/transactions' ? 'font-medium text-white' : ''}`}
            >
              Transactions
            </Link>
          </div>
        </div>
        
        {/* User Authentication and Wallet - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Authentication Status */}
          {isAuthenticated ? (
            <div className="flex items-center">
              <div className="mr-4 px-3 py-1.5 bg-dark-800 rounded-full text-sm text-gray-200">
                <span className="font-medium text-primary-400">{user?.name}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-white transition-all duration-200 rounded-full bg-red-600 hover:bg-red-700 focus:outline-none"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link 
              href="/auth/login"
              className="px-4 py-1.5 text-sm text-white transition-all duration-200 rounded-full bg-blue-600 hover:bg-blue-700 focus:outline-none"
            >
              Login
            </Link>
          )}
          
          {/* Wallet Connection */}
          <div className="ml-2">
            {wallet ? (
              <div
                className="inline-flex items-center px-4 py-2 space-x-2 font-medium text-white transition-all duration-200 rounded-full bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>{truncate({ text: wallet, startChars: 4, endChars: 4, maxLength: 11 })}</span>
              </div>
            ) : (
              <button
                className="inline-flex items-center px-4 py-2 space-x-2 font-medium text-white transition-all duration-200 rounded-full bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900"
                onClick={connectWallet}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden">
          {wallet && (
            <div className="mr-3 inline-flex items-center px-3 py-1.5 space-x-1 font-medium text-white rounded-full bg-primary-600 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{truncate({ text: wallet, startChars: 4, endChars: 4, maxLength: 11 })}</span>
            </div>
          )}
          
          <button
            onClick={toggleMenu}
            className="p-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-expanded={isMenuOpen}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu with Background Overlay */}
      {isMenuOpen && (
        <>
          {/* Dark Background Overlay */}
          <div className="fixed inset-0 z-40 md:hidden bg-black/80" onClick={toggleMenu}></div>
          
          {/* Menu Content */}
          <div className="fixed inset-0 z-50 md:hidden pt-16 pointer-events-none">
            <div className="flex flex-col items-center w-full p-4">
              {/* Menu Container with Background */}
              <div className="w-full max-w-sm mx-auto bg-dark-800 rounded-xl shadow-2xl p-6 pointer-events-auto">
                {/* Close Button at the top */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={toggleMenu}
                    className="p-2 text-white rounded-lg hover:bg-dark-700 focus:outline-none"
                    aria-label="Close menu"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Menu Items in a simple column layout */}
                <div className="flex flex-col items-center w-full space-y-6">
                  {/* Navigation Links */}
                  <div className="flex flex-col items-center space-y-4 w-full">
                    <Link 
                      href="/" 
                      className={`text-xl font-medium w-full text-center py-2 rounded-lg hover:bg-dark-700 ${router.pathname === '/' ? 'text-white bg-dark-700' : 'text-gray-300'}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Polls
                    </Link>
                    <Link 
                      href="/transactions" 
                      className={`text-xl font-medium w-full text-center py-2 rounded-lg hover:bg-dark-700 ${router.pathname === '/transactions' ? 'text-white bg-dark-700' : 'text-gray-300'}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Transactions
                    </Link>
                  </div>

                  <div className="w-full h-px bg-dark-600 my-2"></div>

                  {/* Authentication */}
                  {isAuthenticated ? (
                    <div className="flex flex-col items-center space-y-4 w-full">
                      <div className="w-full px-4 py-2.5 bg-dark-700 rounded-md text-center">
                        <span className="font-medium text-primary-400">{user?.name}</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          handleLogout()
                          setIsMenuOpen(false)
                        }}
                        className="w-full px-4 py-2.5 text-white bg-red-600 rounded-md hover:bg-red-700"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <Link 
                      href="/auth/login"
                      className="w-full py-2.5 text-white bg-blue-600 rounded-md hover:bg-blue-700 text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                  )}

                  {/* Wallet Connection (Mobile) */}
                  {!wallet && (
                    <button
                      className="flex items-center justify-center w-full py-2.5 space-x-2 font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                      onClick={() => {
                        connectWallet()
                        setIsMenuOpen(false)
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <span>Connect Wallet</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  )
}

export default Navbar
