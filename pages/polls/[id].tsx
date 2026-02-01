import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import Details from '@/components/Details'
import Contestants from '@/components/Contestants'
import Head from 'next/head'
import ContestPoll from '@/components/ContestPoll'
import { GetServerSidePropsContext } from 'next'
import { getContestants, getPoll } from '@/services/blockchain'
import { ContestantStruct, PollStruct, RootState } from '@/utils/types'
import { useDispatch, useSelector } from 'react-redux'
import { globalActions } from '@/store/globalSlices'
import { useEffect, useState, useRef } from 'react'
import UpdatePoll from '@/components/UpdatePoll'
import DeletePoll from '@/components/DeletePoll'
// Chat functionality commented out as requested
// import ChatButton from '@/components/ChatButton'
// import ChatModal from '@/components/ChatModal'
// import { checkAuthState, getGroup, joinGroup } from '@/services/chat'
import { useRouter } from 'next/router'

export default function Polls({
  pollData,
  contestantData,
}: {
  pollData: PollStruct
  contestantData: ContestantStruct[]
}) {
  const dispatch = useDispatch()
  const { setPoll, setContestants, setGroup } = globalActions
  const { poll, contestants, currentUser, group, wallet } = useSelector(
    (states: RootState) => states.globalStates
  )
  const router = useRouter()
  const { id } = router.query
  
  // Comment out chat-related state
  /*
  const [isAuthChecking, setIsAuthChecking] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false)
  const previousWalletRef = useRef<string | null>(null)
  const previousPollIdRef = useRef<string | null>(null)
  */
  
  // We still need to know if user is creator for editing polls
  const [isCreator, setIsCreator] = useState(false)
  
  // Set poll and contestants data
  useEffect(() => {
    dispatch(setPoll(pollData))
    dispatch(setContestants(contestantData))
  }, [dispatch, setPoll, setContestants, contestantData, pollData])

  // Check if current user is the poll creator
  useEffect(() => {
    if (wallet && pollData) {
      setIsCreator(wallet.toLowerCase() === pollData.director.toLowerCase())
    } else {
      setIsCreator(false)
    }
  }, [wallet, pollData])

  // Comment out all chat-related effects
  /*
  // CRITICAL: Reset group when poll ID changes to prevent showing chats from other polls
  useEffect(() => {
    if (id && previousPollIdRef.current !== id) {
      console.log('Poll ID changed from', previousPollIdRef.current, 'to', id, '- resetting group data');
      dispatch(setGroup(null));
      setHasFetchedOnce(false);
      previousPollIdRef.current = id as string;
    }
  }, [id, dispatch, setGroup]);

  // Handle wallet changes - force a refresh when wallet changes
  useEffect(() => {
    if (previousWalletRef.current && wallet !== previousWalletRef.current) {
      console.log('Wallet changed from', previousWalletRef.current, 'to', wallet);
      // Reset fetch state to force a new fetch with the new wallet
      setHasFetchedOnce(false);
      // Clear group data when wallet changes
      dispatch(setGroup(null));
    }
    previousWalletRef.current = wallet;
  }, [wallet, dispatch, setGroup]);

  // Initial fetch of group data when component mounts or auth changes
  useEffect(() => {
    // Only fetch on mount, auth change, or wallet change
    if (currentUser && !hasFetchedOnce && id) {
      console.log('Initiating first group data fetch for poll ID:', id, 'wallet:', wallet);
      fetchGroupData(true);
      setHasFetchedOnce(true);
    } else if (!currentUser) {
      // Reset when user logs out
      setHasFetchedOnce(false);
      if (group) {
        dispatch(setGroup(null));
      }
    }
  }, [currentUser, wallet, id]);

  // Background polling with reduced frequency
  useEffect(() => {
    // Only set up polling if authenticated and we have an ID
    if (!currentUser || !id) return;
    
    const pollInterval = setInterval(() => {
      // Only poll if we're not already checking and enough time has passed
      if (!isAuthChecking && Date.now() - lastFetchTime > 30000) { // 30 seconds
        fetchGroupData(false); // silent mode for background polling
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, [currentUser, isAuthChecking, lastFetchTime, id]);
  
  // The main group data fetching function
  const fetchGroupData = async (verbose = false) => {
    // Prevent fetching if already in progress or no poll ID
    if (isAuthChecking || !id) return;
    
    // Update last fetch time
    const now = Date.now();
    setLastFetchTime(now);
    
    try {
      setIsAuthChecking(true);
      
      // Verify authentication
      const authUser = await checkAuthState().catch(() => null);
      if (!authUser) {
        if (verbose) console.log('User authentication failed, cannot fetch group');
        setIsAuthChecking(false);
        return;
      }
      
      if (verbose) console.log('Authenticated as:', (authUser as any)?.uid || 'unknown', 'for poll ID:', id);
      
      try {
        const currentPollId = id; // Cache poll ID to ensure we're using the right one throughout this function
        if (verbose) console.log('Attempting to fetch group:', `guid_${currentPollId}`);
        
        const groupData: any = await getGroup(`guid_${currentPollId}`);
        
        // Verify we're still on the same poll (user might have navigated away)
        if (id !== currentPollId) {
          if (verbose) console.log('Poll ID changed during fetch, aborting update');
          setIsAuthChecking(false);
          return;
        }
        
        // Handle creator-specific logic
        if (isCreator && groupData) {
          if (typeof groupData === 'object' && groupData.hasJoined === false) {
            if (verbose) console.log('Poll creator detected, group exists but not joined. Attempting to join...');
            try {
              const joinedGroup = await joinGroup(`guid_${currentPollId}`);
              
              // Double-check we're still on the same poll
              if (id !== currentPollId) {
                if (verbose) console.log('Poll ID changed during join, aborting update');
                setIsAuthChecking(false);
                return;
              }
              
              if (joinedGroup) {
                if (verbose) console.log('Successfully joined group as poll creator');
                dispatch(setGroup(JSON.parse(JSON.stringify(joinedGroup))));
                setIsAuthChecking(false);
                return;
              }
            } catch (error) {
              if (verbose) console.error('Failed to join group as poll creator:', error);
            }
          }
        }
        
        // Update group state if needed
        if (groupData) {
          if (verbose) console.log('Group data fetched successfully for poll ID:', currentPollId, groupData);
          
          // Make extra sure we're looking at the right poll's group
          if (groupData.guid !== `guid_${currentPollId}`) {
            if (verbose) console.error('Group GUID mismatch!', {
              expected: `guid_${currentPollId}`,
              received: groupData.guid
            });
            // Don't update if the GUIDs don't match
            setIsAuthChecking(false);
            return;
          }
          
          // Force update when wallet changes or always on explicit fetch
          const forceUpdate = previousWalletRef.current !== wallet || verbose;
          
          // Update if the data has changed or when forcing an update
          const hasJoinedChanged = !group || 
            forceUpdate ||
            (typeof group === 'object' && 'hasJoined' in group && 
             typeof groupData === 'object' && 'hasJoined' in groupData && 
             group.hasJoined !== groupData.hasJoined);
             
          if (hasJoinedChanged) {
            if (verbose) console.log('Updating group state with new data for poll ID:', currentPollId);
            dispatch(setGroup(JSON.parse(JSON.stringify(groupData))));
          }
        } else {
          if (verbose) console.log('No group found for poll ID:', currentPollId);
          dispatch(setGroup(null));
        }
      } catch (error) {
        if (verbose) console.log('Error getting group for poll ID:', id, error);
        // Important: Set group to null when there's an error
        dispatch(setGroup(null));
      }
    } catch (error) {
      if (verbose) console.error('Group data fetch error:', error);
    } finally {
      setIsAuthChecking(false);
    }
  };

  // Add a useEffect to verify the poll ID matches the group
  useEffect(() => {
    // When navigating to a poll page, verify chat state is correctly associated
    if (poll && group && typeof group === 'object' && 'guid' in group) {
      const expectedGuid = `guid_${poll.id}`;
      
      // If the group is for a different poll, clear it
      if (group.guid !== expectedGuid) {
        console.error('Poll-Group mismatch detected on poll page load:', {
          pollId: poll.id,
          groupGuid: group.guid,
          expectedGuid
        });
        
        // Explicitly reset group data in store to prevent showing wrong chats
        dispatch(setGroup(null));
      }
    }
  }, [poll, group, dispatch]);
  */

  return (
    <>
      {poll && (
        <Head>
          <title>VoteChain | {poll.title}</title>
          <meta name="description" content={`Vote on ${poll.title}`} />
          <link rel="icon" href="/favicon.ico" />
        </Head>
      )}

      <div className="min-h-screen">
        <Navbar />
        
        <main className="pt-24 pb-12">
          {poll && <Details poll={poll} />}
          {poll && contestants && <Contestants poll={poll} contestants={contestants} />}
        </main>
        
          <Footer />

        {poll && (
          <>
            <UpdatePoll pollData={poll} />
            <DeletePoll poll={poll} />
            <ContestPoll poll={poll} />
            {/* Chat functionality commented out as requested */}
            {/* <ChatModal group={group} poll={poll} /> */}
            {/* <ChatButton poll={poll} group={group} /> */}
          </>
        )}
      </div>
    </>
  )
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { id } = context.query
  const pollData = await getPoll(Number(id))
  const contestantData = await getContestants(Number(id))

  return {
    props: {
      pollData: JSON.parse(JSON.stringify(pollData)),
      contestantData: JSON.parse(JSON.stringify(contestantData)),
    },
  }
}
