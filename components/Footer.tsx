import React from 'react'

const Footer = () => {
  return (
    <footer className="container px-4 py-6 mx-auto mt-8 border-t border-dark-700 sm:py-8 sm:mt-12">
      <div className="flex flex-col items-center justify-between gap-3 text-center sm:gap-4 md:flex-row md:text-left">
        <div className="flex items-center text-lg font-medium sm:text-xl">
          <span className="text-primary-500">Vote</span>
          <span className="font-bold text-white">Chain</span>
        </div>
        
        <p className="text-xs sm:text-sm text-dark-400">
          &copy; {new Date().getFullYear()} VoteChain. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer
