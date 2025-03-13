import { contestPoll } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { PollStruct, RootState } from '@/utils/types'
import React, { ChangeEvent, FormEvent, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

const ContestPoll: React.FC<{ poll: PollStruct }> = ({ poll }) => {
  const dispatch = useDispatch()
  const { setContestModal } = globalActions
  const { wallet, contestModal } = useSelector((states: RootState) => states.globalStates)

  const [contestant, setContestant] = useState({
    name: '',
    image: '',
  })

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setContestant((prevState) => ({
      ...prevState,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!contestant.name || !contestant.image) return
    if (wallet === '') return toast.warning('Connect wallet first!')

    await toast.promise(
      new Promise<void>((resolve, reject) => {
        contestPoll(poll.id, contestant.name, contestant.image)
          .then((tx) => {
            closeModal()
            console.log(tx)
            resolve()
          })
          .catch((error) => reject(error))
      }),
      {
        pending: 'Approve transaction...',
        success: 'Poll contested successfully 👌',
        error: 'Encountered error 🤯',
      }
    )
  }

  const closeModal = () => {
    dispatch(setContestModal('scale-0'))
    setContestant({
      name: '',
      image: '',
    })
  }

  return (
    <div
      className={`fixed top-0 left-0 w-screen h-screen flex items-center justify-center
      bg-dark-900/80 backdrop-blur-sm transform z-50 transition-transform duration-300 ${contestModal}`}
    >
      <div className="bg-dark-800 text-dark-200 rounded-xl w-[95%] max-h-[90vh] overflow-y-auto sm:w-[85%] md:w-3/5 lg:w-2/5 p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-white">Become a Contestant</h3>
            <button 
              onClick={closeModal} 
              className="p-1 rounded-full hover:bg-dark-700 transition-colors duration-200 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col space-y-3 sm:space-y-4"
          >
            <div className="space-y-1 sm:space-y-2">
              <label htmlFor="name" className="text-xs sm:text-sm font-medium text-dark-300">Contestant Name</label>
              <input
                id="name"
                placeholder="Enter your full name"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                name="name"
                value={contestant.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <label htmlFor="image" className="text-xs sm:text-sm font-medium text-dark-300">Avatar Image URL</label>
              <input
                id="image"
                placeholder="Enter image URL"
                type="url"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                name="image"
                accept="image/*"
                value={contestant.image}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="mt-2 sm:mt-4 w-full px-4 py-2 sm:px-5 sm:py-3 text-sm sm:text-base text-white font-medium bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-800"
            >
              Contest Now
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ContestPoll
