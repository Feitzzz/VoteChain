import { formatDate, truncate } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { PollStruct, RootState } from '@/utils/types'
import Image from 'next/image'
import React from 'react'
import { MdModeEdit, MdDelete } from 'react-icons/md'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

const Details: React.FC<{ poll: PollStruct }> = ({ poll }) => {
  const dispatch = useDispatch()
  const { setContestModal, setUpdateModal, setDeleteModal } = globalActions
  const { wallet } = useSelector((states: RootState) => states.globalStates)

  const onPressContest = () => {
    if (wallet === '') return toast.warning('Connect wallet first!')
    dispatch(setContestModal('scale-100'))
  }

  return (
    <div className="container max-w-4xl px-4 mx-auto">
      <div className="overflow-hidden rounded-xl card">
        <div className="w-full h-[240px] overflow-hidden">
          <Image
            className="object-cover w-full h-full"
            width={3000}
            height={500}
            src={poll.image}
            alt={poll.title}
            priority
          />
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <h1 className="mb-3 text-3xl font-bold text-white md:text-4xl">{poll.title}</h1>
            <p className="text-base text-dark-200 md:text-lg">{poll.description}</p>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="px-4 py-2 text-sm rounded-full bg-dark-700 text-primary-300">
              {formatDate(poll.startsAt)} - {formatDate(poll.endsAt)}
            </div>

            <div className="flex items-center px-4 py-2 space-x-3 rounded-lg bg-dark-800">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-dark-200">
                {truncate({ text: poll.director, startChars: 4, endChars: 4, maxLength: 11 })}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <div className="px-4 py-2 text-sm rounded-lg bg-dark-700 text-dark-200">
                {poll.votes} votes
              </div>

              <div className="px-4 py-2 text-sm rounded-lg bg-dark-700 text-dark-200">
                {poll.contestants} contestants
              </div>

              {wallet && wallet === poll.director && poll.votes < 1 && (
                <button
                  onClick={() => dispatch(setUpdateModal('scale-100'))}
                  className="inline-flex items-center px-4 py-2 space-x-2 text-sm rounded-lg bg-dark-700 text-primary-400 hover:bg-dark-600 transition-colors duration-200"
                >
                  <MdModeEdit size={18} />
                  <span>Edit poll</span>
                </button>
              )}

              {wallet && wallet === poll.director && poll.votes < 1 && (
                <button
                  onClick={() => dispatch(setDeleteModal('scale-100'))}
                  className="inline-flex items-center px-4 py-2 space-x-2 text-sm rounded-lg bg-dark-700 text-red-400 hover:bg-dark-600 transition-colors duration-200"
                >
                  <MdDelete size={18} />
                  <span>Delete poll</span>
                </button>
              )}
            </div>

            {poll.votes < 1 && (
              <button
                onClick={onPressContest}
                className="inline-flex items-center px-6 py-3 mt-4 text-base font-medium text-white transition-all duration-200 rounded-lg bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Contest Poll
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Details
