/* eslint-disable @next/next/no-img-element */
import { formatDate, truncate } from '@/services/blockchain'
import { PollStruct } from '@/utils/types'
import { useRouter } from 'next/router'
import React from 'react'

const Polls: React.FC<{ polls: PollStruct[] }> = ({ polls }) => {
  return (
    <div className="container max-w-6xl px-4 py-8 mx-auto sm:py-12">
      <h2 className="mb-6 text-2xl font-bold text-center text-white sm:mb-8 sm:text-3xl md:text-4xl">
        Available Polls
      </h2>

      {polls.length === 0 ? (
        <div className="p-6 text-center sm:p-8 card">
          <p className="text-base sm:text-lg text-dark-200">No polls available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 md:grid-cols-2">
          {polls.map((poll, i) => (
            <Poll key={i} poll={poll} />
          ))}
        </div>
      )}
    </div>
  )
}

const Poll: React.FC<{ poll: PollStruct }> = ({ poll }) => {
  const navigate = useRouter()
  
  return (
    <div className="overflow-hidden transition-all duration-300 card hover:transform hover:scale-[1.02]">
      <div className="flex flex-col sm:flex-row">
        {/* Poll Images */}
        <div className="grid w-full grid-cols-2 gap-2 p-3 sm:w-2/5 md:w-1/3">
          {[...poll.avatars, '/assets/images/question.jpeg', '/assets/images/question.jpeg']
            .slice(0, 2)
            .map((avatar, i) => (
              <img
                key={i}
                src={avatar}
                alt={poll.title}
                className="object-cover w-full rounded-lg aspect-square"
              />
            ))}
        </div>
        
        {/* Poll Content */}
        <div className="flex flex-col flex-1 p-4 sm:p-5">
          <h3 className="mb-1 text-lg font-semibold capitalize truncate sm:text-xl">
            {poll.title}
          </h3>
          
          <p className="mb-3 text-xs text-dark-300 line-clamp-2 sm:text-sm sm:mb-4">
            {poll.description}
          </p>
          
          <div className="flex flex-wrap items-center justify-between mt-auto gap-y-2">
            <div className="px-2 py-1 text-xs font-medium rounded-full bg-dark-700 text-primary-300 sm:px-3">
              {formatDate(poll.startsAt)}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full sm:w-6 sm:h-6 bg-primary-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-primary-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs text-dark-300">
                {truncate({ text: poll.director, startChars: 4, endChars: 4, maxLength: 11 })}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => navigate.push('/polls/' + poll.id)}
            className="w-full px-3 py-1.5 mt-3 text-sm font-medium text-white transition-all duration-200 rounded-lg sm:px-4 sm:py-2 sm:mt-4 bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-dark-900"
          >
            Enter Poll
          </button>
        </div>
      </div>
    </div>
  )
}

export default Polls
