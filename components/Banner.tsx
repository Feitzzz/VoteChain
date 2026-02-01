import { globalActions } from '@/store/globalSlices'
import { RootState } from '@/utils/types'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

const Banner = () => {
  const dispatch = useDispatch()
  const { setCreateModal } = globalActions
  const { wallet } = useSelector((states: RootState) => states.globalStates)

  const onPressCreate = () => {
    if (wallet === '') return toast.warning('Connect wallet first!')
    dispatch(setCreateModal('scale-100'))
  }

  return (
    <div className="container max-w-4xl px-4 py-12 mx-auto text-center mt-16 sm:px-6 sm:py-16 sm:mt-20 md:mt-28">
      <h1 className="mb-4 text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl sm:mb-6">
        Secure Votes, Verified Truth
      </h1>
      
      <p className="max-w-2xl mx-auto mb-6 text-base text-dark-200 sm:text-lg md:text-xl sm:mb-8">
        A decentralized voting platform where transparency meets technology, empowering 
        communities to make decisions with absolute confidence in the integrity of results.
      </p>

      <button
        onClick={onPressCreate}
        className="inline-flex items-center px-5 py-2.5 text-sm sm:text-base font-medium text-dark-900 transition-all duration-200 bg-white rounded-full sm:px-6 sm:py-3 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1.5 sm:w-5 sm:h-5 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Create Poll
      </button>
    </div>
  )
}

export default Banner
