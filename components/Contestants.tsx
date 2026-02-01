import { truncate, voteCandidate } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { ContestantStruct, PollStruct, RootState } from '@/utils/types'
import Image from 'next/image'
import React, { useState, useEffect } from 'react'
import { BiUpvote } from 'react-icons/bi'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

const Contestants: React.FC<{ contestants: ContestantStruct[]; poll: PollStruct }> = ({
  contestants,
  poll,
}) => {
  const totalContestants = contestants.length;
  const { wallet, currentUser } = useSelector((states: RootState) => states.globalStates);
  
  // Check if the current wallet has voted in this poll
  const hasUserVoted = wallet ? poll.voters.includes(wallet) : false;
  
  return (
    <div className="container max-w-5xl px-4 mx-auto mt-12">
      <h2 className="mb-8 text-3xl font-bold text-center text-white md:text-4xl">Contestants</h2>

      {contestants.length === 0 ? (
        <div className="p-8 text-center card">
          <p className="text-lg text-dark-200">No contestants available at the moment.</p>
        </div>
      ) : (
        <>
          {totalContestants === 1 && (
            <div className="p-4 mb-8 text-center rounded-lg bg-amber-500/20 border border-amber-500/30">
              <p className="text-amber-200">
                At least two contestants are required before voting can begin. 
                Please wait for more contestants to join this poll.
              </p>
            </div>
          )}
          
          {hasUserVoted && (
            <div className="p-4 mb-8 text-center rounded-lg bg-green-500/20 border border-green-500/30">
              <p className="text-green-200">
                You have already cast your vote in this poll. Thank you for participating!
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {contestants.map((contestant, i) => (
              <Contestant 
                poll={poll} 
                contestant={contestant} 
                key={i} 
                totalContestants={totalContestants}
                hasUserVotedInPoll={hasUserVoted}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const Contestant: React.FC<{ 
  contestant: ContestantStruct; 
  poll: PollStruct;
  totalContestants: number;
  hasUserVotedInPoll: boolean;
}> = ({
  contestant,
  poll,
  totalContestants,
  hasUserVotedInPoll
}) => {
  const dispatch = useDispatch()
  const { setVotingState } = globalActions
  const { wallet, currentUser, isVoting } = useSelector((states: RootState) => states.globalStates)
  const [localVoted, setLocalVoted] = useState(false);
  
  // Check if THIS wallet has voted for THIS contestant
  const hasVotedForThisContestant = wallet ? contestant.voters.includes(wallet) : false;
  
  // Check if THIS wallet has voted in the poll at all
  const isUserVoter = hasUserVotedInPoll;
  
  // Reset local voting state when wallet or currentUser changes
  useEffect(() => {
    setLocalVoted(false);
  }, [wallet, currentUser]);

  // We also need to clear the voting state on component unmount
  useEffect(() => {
    return () => {
      // Reset any lingering voting state when component unmounts
      dispatch(setVotingState(false));
    };
  }, [dispatch, setVotingState]);
  
  const voteContestant = async () => {
    if (!wallet) return toast.warning('Connect wallet first!')
    if (totalContestants < 2) {
      return toast.warning('At least two contestants are required to vote')
    }
    if (isUserVoter) {
      return toast.info('You have already voted in this poll')
    }
    
    try {
      // Use Redux state for voting to ensure it's consistent across the application
      dispatch(setVotingState(true));
      
      toast.info('Approve transaction...', { 
        autoClose: false, 
        toastId: 'vote-pending'
      });
      
      await voteCandidate(poll.id, contestant.id);
      
      toast.dismiss('vote-pending');
      toast.success('Vote cast successfully 👌');
      
      // Update local state to reflect that this user has voted
      setLocalVoted(true);
      
    } catch (error: any) {
      console.error('Voting error:', error);
      toast.dismiss('vote-pending');
      
      // Check if error contains "Not enough contestants" message
      if (error.message && error.message.includes('Not enough contestants')) {
        toast.error('At least two contestants are required to vote')
      } else {
        toast.error(error.message || 'Transaction failed 🤯')
      }
    } finally {
      // Always reset the voting state when the operation completes
      dispatch(setVotingState(false));
    }
  }
  
  // Determine if voting should be disabled
  const isVotingDisabled = 
    !wallet || 
    isUserVoter ||  // If user voted in this poll at all
    Date.now() < poll.startsAt || 
    Date.now() >= poll.endsAt ||
    totalContestants < 2;
  
  // Get button status text based on conditions
  const getButtonText = () => {
    if (isVoting) return 'Voting...';
    if (hasVotedForThisContestant) return 'Your Choice ✓';
    if (isUserVoter) return 'Already Voted';
    if (totalContestants < 2) return 'Needs More Contestants';
    return 'Vote Now';
  };
  
  // Calculate vote count WITHOUT using local state
  // This ensures our display always matches blockchain data
  const displayVoteCount = () => {
    return contestant.votes;
  };
  
  return (
    <div className="overflow-hidden transition-all duration-300 card hover:transform hover:scale-[1.01]">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-2/5">
          <div className="aspect-square overflow-hidden">
            <Image
              className="object-cover w-full h-full"
              width={400}
              height={400}
              src={contestant.image}
              alt={contestant.name}
            />
          </div>
        </div>
        
        <div className="flex flex-col justify-between w-full p-5 md:w-3/5">
          <div>
            <h3 className="mb-3 text-xl font-semibold text-white capitalize">{contestant.name}</h3>
            
            <div className="flex items-center mb-4 space-x-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-primary-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm text-dark-300">
                {truncate({ text: contestant.voter, startChars: 4, endChars: 4, maxLength: 11 })}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={voteContestant}
              disabled={isVotingDisabled || isVoting}
              className={`w-full px-4 py-3 text-white font-medium rounded-lg transition-all duration-200 
                ${
                  isVoting 
                    ? 'bg-primary-800 cursor-wait'
                    : isVotingDisabled
                      ? hasVotedForThisContestant
                        ? 'bg-green-700 cursor-not-allowed' // Voted for this one
                        : isUserVoter
                          ? 'bg-dark-600 cursor-not-allowed' // Voted for different contestant
                          : totalContestants < 2 
                            ? 'bg-amber-700/60 cursor-not-allowed'
                            : 'bg-dark-500 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500'
                }
              `}
              title={
                hasVotedForThisContestant
                  ? 'You voted for this contestant'
                  : isUserVoter
                    ? 'You have already voted for a different contestant in this poll'
                    : totalContestants < 2
                      ? 'At least two contestants are required before voting can begin'
                      : 'Click to vote for this contestant'
              }
            >
              {getButtonText()}
            </button>
            
            <div className="flex items-center justify-center px-4 py-2 space-x-2 rounded-lg bg-dark-800/60">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-900/30">
                <BiUpvote size={18} className="text-primary-400" />
              </div>
              <span className="font-medium text-primary-300">
                {displayVoteCount()} vote{displayVoteCount() !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contestants
