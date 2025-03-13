import { createPoll } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { PollParams, RootState } from '@/utils/types'
import React, { ChangeEvent, FormEvent, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

const CreatePoll: React.FC = () => {
  const dispatch = useDispatch()
  const { setCreateModal } = globalActions
  const { wallet, createModal } = useSelector((states: RootState) => states.globalStates)

  const [poll, setPoll] = useState<PollParams>({
    image: '',
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!poll.image || !poll.title || !poll.description || !poll.startsAt || !poll.endsAt) return
    if (wallet === '') return toast.warning('Connect wallet first!')

    poll.startsAt = new Date(poll.startsAt).getTime()
    poll.endsAt = new Date(poll.endsAt).getTime()

    await toast.promise(
      new Promise<void>((resolve, reject) => {
        createPoll(poll)
          .then((tx) => {
            closeModal()
            console.log(tx)
            resolve(tx)
          })
          .catch((error) => reject(error))
      }),
      {
        pending: 'Approve transaction...',
        success: 'Poll created successfully 👌',
        error: 'Encountered error 🤯',
      }
    )
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPoll((prevState) => ({
      ...prevState,
      [name]: value,
    }))
  }

  const closeModal = () => {
    dispatch(setCreateModal('scale-0'))
    setPoll({
      image: '',
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
    })
  }

  return (
    <div
      className={`fixed top-0 left-0 w-screen h-screen flex items-center justify-center
      bg-dark-900/80 backdrop-blur-sm transform z-50 transition-transform duration-300 ${createModal}`}
    >
      <div className="bg-dark-800 text-dark-200 rounded-xl w-[95%] max-h-[90vh] overflow-y-auto sm:w-[85%] md:w-3/5 lg:w-2/5 p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-white">Create New Poll</h3>
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
              <label htmlFor="title" className="text-xs sm:text-sm font-medium text-dark-300">Poll Title</label>
              <input
                id="title"
                placeholder="Enter poll title"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                name="title"
                value={poll.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <label htmlFor="startsAt" className="text-xs sm:text-sm font-medium text-dark-300">Start Date</label>
                <input
                  id="startsAt"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                  name="startsAt"
                  type="datetime-local"
                  value={poll.startsAt}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label htmlFor="endsAt" className="text-xs sm:text-sm font-medium text-dark-300">End Date</label>
                <input
                  id="endsAt"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                  name="endsAt"
                  type="datetime-local"
                  value={poll.endsAt}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <label htmlFor="image" className="text-xs sm:text-sm font-medium text-dark-300">Banner Image URL</label>
              <input
                id="image"
                placeholder="Enter image URL"
                type="url"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white"
                name="image"
                accept="image/*"
                value={poll.image}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <label htmlFor="description" className="text-xs sm:text-sm font-medium text-dark-300">Description</label>
              <textarea
                id="description"
                placeholder="Enter poll description"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-white min-h-[80px] sm:min-h-[100px]"
                name="description"
                value={poll.description}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="mt-2 sm:mt-4 w-full px-4 py-2 sm:px-5 sm:py-3 text-sm sm:text-base text-white font-medium bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-800"
            >
              Create Poll
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreatePoll
