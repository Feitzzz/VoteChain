import Identicon from 'react-identicons'
import { globalActions } from '@/store/globalSlices'
import { PollStruct, RootState } from '@/utils/types'
import React, { FormEvent, useEffect, useState, useRef } from 'react'
import { FaTimes } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import { truncate } from '@/services/blockchain'
import { checkAuthState, getMessages, listenForMessage, sendMessage, joinGroup } from '@/services/chat'
import { toast } from 'react-toastify'

const ChatModal: React.FC<{ group: any; poll: PollStruct }> = ({ group, poll }) => {
  const dispatch = useDispatch()
  const { setChatModal, setGroup } = globalActions
  const { wallet, chatModal, currentUser } = useSelector((states: RootState) => states.globalStates)
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<any[]>([])
  const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [needsJoin, setNeedsJoin] = useState<boolean>(false)
  const [isJoining, setIsJoining] = useState<boolean>(false)
  const previousPollIdRef = useRef<number | null>(null)
  const currentPollIdRef = useRef<number | null>(null)
  const initialCheckDoneRef = useRef<boolean>(false)

  // Check group membership on load - proactively check rather than waiting for error
  useEffect(() => {
    const checkGroupMembership = async () => {
      if (!group || !currentUser || !poll || initialCheckDoneRef.current) return;
      
      // Check if group is for current poll
      if (group.guid !== `guid_${poll.id}`) {
        console.error('Group GUID mismatch in membership check:', {
          expected: `guid_${poll.id}`,
          actual: group.guid
        });
        setError(`Error: This chat group is for a different election`);
        setMessages([]);
        return;
      }
      
      try {
        // Check if user is joined to this group
        console.log('Proactively checking if user has joined group:', group.guid);
        if (typeof group.hasJoined === 'boolean') {
          if (!group.hasJoined) {
            console.log('User has not joined group (from group.hasJoined check)');
            setNeedsJoin(true);
          } else {
            setNeedsJoin(false);
          }
          initialCheckDoneRef.current = true;
        }
      } catch (error) {
        console.error('Error checking group membership:', error);
      }
    };
    
    checkGroupMembership();
  }, [group, currentUser, poll]);

  // Debug log state
  useEffect(() => {
    if (group && poll) {
      console.log('ChatModal state:', {
        group: {
          guid: group.guid,
          hasJoined: group.hasJoined
        },
        pollId: poll.id,
        currentUser: !!currentUser,
        messageCount: messages.length,
        needsJoin
      });

      // Validate that the group is for this poll
      if (group.guid !== `guid_${poll.id}`) {
        console.error('Group GUID mismatch in ChatModal:', {
          expectedGuid: `guid_${poll.id}`,
          actualGuid: group.guid,
          error: 'Group is for a different poll!'
        });
        setError(`Error: Chat group mismatch (expected: guid_${poll.id}, found: ${group.guid})`);
        setMessages([]);
        
        // Critical fix: Force close the chat modal when group doesn't match poll
        dispatch(setChatModal('scale-0'));
      }
    }
  }, [group, poll, currentUser, messages.length, needsJoin, dispatch, setChatModal]);

  // Track poll changes to reset messages
  useEffect(() => {
    if (poll?.id) {
      currentPollIdRef.current = poll.id;
      
      if (previousPollIdRef.current !== poll.id) {
        console.log('Poll changed in ChatModal:', {
          from: previousPollIdRef.current,
          to: poll.id
        });
        
        // Reset messages when poll changes
        setMessages([]);
        setError(null);
        setNeedsJoin(false);
        initialCheckDoneRef.current = false; // Reset membership check flag
        previousPollIdRef.current = poll.id;
        
        // Critical fix: Verify group matches the current poll, close modal if not
        if (group && group.guid !== `guid_${poll.id}`) {
          console.error('Poll changed but group doesn\'t match new poll');
          // Close modal since we have the wrong group
          dispatch(setChatModal('scale-0'));
        }
      }
    }
  }, [poll?.id, group, dispatch, setChatModal]);

  // Reset when group changes
  useEffect(() => {
    // Reset messages when group changes or user logs out
    if (!group || !currentUser) {
      setMessages([]);
      setNeedsJoin(false);
      return;
    }

    // Only proceed if the group belongs to the current poll
    if (poll && group.guid !== `guid_${poll.id}`) {
      console.error('Skipping message fetch - group GUID mismatch');
      setError('This chat group is for a different poll');
      return;
    }

    // If the group exists but user hasn't joined yet - determined from group object
    if (group && typeof group.hasJoined === 'boolean' && !group.hasJoined) {
      console.log('User has not joined this group yet (from group.hasJoined), showing join UI');
      setNeedsJoin(true);
      return;
    }

    const handleListing = () => {
      if (!group?.guid || !currentUser || needsJoin) return;
      
      listenForMessage(group.guid)
        .then((msg) => {
          // Only add messages if we're still on the same poll
          if (currentPollIdRef.current === poll?.id) {
        setMessages((prevMsgs) => [...prevMsgs, msg])
        setShouldAutoScroll(true)
          }
        })
        .catch(err => {
          console.error('Error listening for messages:', err);
          
          // If the error indicates the user needs to join, update UI
          if (err?.code === 'ERR_GROUP_NOT_JOINED') {
            console.log('User not joined (from message listener), showing join UI');
            setNeedsJoin(true);
          }
        });
    }

    const handleMessageRetrieval = async () => {
      if (!group?.guid || !currentUser || needsJoin) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Verify user is authenticated before fetching messages
        const authUser = await checkAuthState().catch(() => null);
        if (!authUser) {
          console.log('User not authenticated, cannot fetch messages');
          setIsLoading(false);
          return;
        }
        
        // Store current poll ID to verify later
        const currentPollId = poll?.id;
        
        try {
          const msgs = await getMessages(group.guid);
          
          // Verify we're still on the same poll before updating state
          if (currentPollIdRef.current === currentPollId) {
            console.log('Messages retrieved successfully:', Array.isArray(msgs) ? msgs.length : 'unknown count');
            setMessages(msgs as any[]);
            setShouldAutoScroll(true);
            setNeedsJoin(false); // Confirm user has joined
          }
        } catch (error: any) {
          console.error('Error retrieving messages:', error);
          
          // Special handling for the "not joined" error
          if (error?.code === 'ERR_GROUP_NOT_JOINED') {
            console.log('User has not joined this group (from message fetch error), showing join UI');
            setNeedsJoin(true);
            setError(null); // Clear the error as this is a known case
          } 
          // Handle auth errors
          else if (error?.code === 'USER_NOT_LOGGED_IN') {
            console.log('User not logged in for message fetch');
            setError('Authentication issue. Please try logging out and back in.');
          }
          else {
            setError('Could not load messages. Please try again later.');
          }
        }
      } catch (error) {
        console.error('Error in message retrieval:', error);
        setError('Could not load messages. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    // Only attempt to fetch messages if we have a group and a logged-in user and haven't already determined we need to join
    if (group?.guid && currentUser && !needsJoin) {
      console.log('Fetching messages for group:', group.guid, 'poll ID:', poll?.id);
    setTimeout(async () => {
      if (typeof window !== 'undefined') {
          await handleMessageRetrieval();
          handleListing();
        }
      }, 500);
    }
  }, [group?.guid, currentUser, poll, needsJoin]);

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToEnd()
    }
  }, [messages, shouldAutoScroll])

  const handleJoinGroup = async () => {
    if (!poll?.id || !group?.guid) {
      toast.error('Missing poll or group information');
      return;
    }
    
    if (wallet === '') {
      toast.warning('Connect wallet first!');
      return;
    }
    
    if (!currentUser) {
      toast.warning('Please login to chat first!');
      return;
    }
    
    if (isJoining) return;
    
    setIsJoining(true);
    
    try {
      // Verify user is authenticated
      const authUser = await checkAuthState().catch(() => null);
      if (!authUser) {
        toast.error('Your session has expired. Please log in again.');
        setIsJoining(false);
        return;
      }
      
      toast.info('Joining group chat...', { toastId: 'joining-group' });
      
      const joinedGroup = await joinGroup(group.guid);
      
      if (joinedGroup) {
        toast.dismiss('joining-group');
        toast.success('Successfully joined the group chat!');
        
        // Update the group in Redux
        dispatch(setGroup(JSON.parse(JSON.stringify(joinedGroup))));
        
        // Reset state to load messages
        setNeedsJoin(false);
        setError(null);
        initialCheckDoneRef.current = true; // Mark membership check as done
      }
    } catch (error: any) {
      toast.dismiss('joining-group');
      console.error('Error joining group:', error);
      toast.error(error?.message || 'Failed to join group chat. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!message) return
    if (!currentUser) return toast.warning('Please login to chat first!')
    if (wallet === '') return toast.warning('Connect wallet first!')
    if (!group?.guid) return toast.warning('No active group chat!')
    if (!poll?.id) return toast.warning('Poll information is missing')
    
    // Validate group belongs to current poll
    if (group.guid !== `guid_${poll.id}`) {
      toast.error('Cannot send message - chat group mismatch');
      return;
    }

    try {
      // Verify authentication before sending
      const authUser = await checkAuthState().catch(() => null);
      if (!authUser) {
        toast.error('Your session has expired. Please log in again.');
        return;
      }
      
      await sendMessage(group.guid, message)
      .then((msg) => {
          // Make sure we're still on the same poll
          if (currentPollIdRef.current === poll.id) {
        setMessages((prevMsgs) => [...prevMsgs, msg])
        setShouldAutoScroll(true)
        scrollToEnd()
        setMessage('')
          }
        })
        .catch((error: any) => {
          console.error('Error sending message:', error);
          
          // If the error is about not being joined, show join UI
          if (error?.code === 'ERR_GROUP_NOT_JOINED') {
            setNeedsJoin(true);
            toast.warning('You need to join this group chat first.');
          } else {
            toast.error('Failed to send message. Please try again.');
          }
        });
    } catch (error) {
      console.error('Error in message submission:', error);
      toast.error('Something went wrong. Please try again.');
    }
  }

  const scrollToEnd = () => {
    const elmnt: HTMLElement | null = document.getElementById('messages-container')
    if (elmnt) elmnt.scrollTop = elmnt.scrollHeight
  }

  const closeModal = () => {
    dispatch(setChatModal('scale-0'))
    setMessage('')
    scrollToEnd()
  }

  // Show a message if user is not logged in
  if (!currentUser) {
    return (
      <div
        className={`fixed top-0 left-0 w-screen h-screen flex items-center justify-center
        bg-black bg-opacity-50 transform z-50 transition-transform duration-300 ${chatModal}`}
      >
        <div className="bg-[#0c0c10] text-[#BBBBBB] shadow-lg shadow-[#1B5CFE] rounded-xl w-11/12 md:w-2/5 h-7/12 p-6">
          <div className="flex flex-col">
            <div className="flex flex-row justify-between items-center">
              <p className="font-semibold">Chat</p>
              <button onClick={closeModal} className="border-0 bg-transparent focus:outline-none">
                <FaTimes />
              </button>
            </div>
            
            <div className="flex flex-col justify-center items-center my-12 p-4 text-center">
              <p className="text-lg text-amber-300 mb-4">Login Required</p>
              <p className="text-gray-400">Please log in to the chat system to participate in group discussions.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show a warning if group is for a different poll
  if (group && poll && group.guid !== `guid_${poll.id}`) {
  return (
    <div
      className={`fixed top-0 left-0 w-screen h-screen flex items-center justify-center
    bg-black bg-opacity-50 transform z-50 transition-transform duration-300 ${chatModal}`}
    >
      <div className="bg-[#0c0c10] text-[#BBBBBB] shadow-lg shadow-[#1B5CFE] rounded-xl w-11/12 md:w-2/5 h-7/12 p-6">
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center">
            <p className="font-semibold">Chat</p>
              <button onClick={closeModal} className="border-0 bg-transparent focus:outline-none">
                <FaTimes />
              </button>
            </div>
            
            <div className="flex flex-col justify-center items-center my-12 p-4 text-center">
              <p className="text-lg text-red-400 mb-4">Group Mismatch Error</p>
              <p className="text-gray-400">The current group chat is for a different poll (ID: {group.guid.replace('guid_', '')}). Please create or join a group for this poll (ID: {poll.id}).</p>
              <button 
                onClick={() => {
                  // Reset the group for this poll
                  dispatch(setGroup(null));
                  closeModal();
                }} 
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Reset Group
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show join UI if user hasn't joined the group yet
  if (needsJoin) {
    return (
      <div
        className={`fixed top-0 left-0 w-screen h-screen flex items-center justify-center
        bg-black bg-opacity-50 transform z-50 transition-transform duration-300 ${chatModal}`}
      >
        <div className="bg-[#0c0c10] text-[#BBBBBB] shadow-lg shadow-[#1B5CFE] rounded-xl w-11/12 md:w-2/5 h-7/12 p-6">
          <div className="flex flex-col">
            <div className="flex flex-row justify-between items-center">
              <p className="font-semibold">Chat for Poll: {poll?.title || 'Unknown'}</p>
              <button onClick={closeModal} className="border-0 bg-transparent focus:outline-none">
                <FaTimes />
              </button>
            </div>
            
            <div className="flex flex-col justify-center items-center my-12 p-4 text-center">
              <p className="text-lg text-primary-400 mb-4">Join Group Chat</p>
              <p className="text-gray-400 mb-6">You need to join this group chat before you can see or send messages.</p>
              <button 
                onClick={handleJoinGroup} 
                disabled={isJoining}
                className={`px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors 
                  ${isJoining ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isJoining ? 'Joining...' : 'Join Group Chat'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed top-0 left-0 w-screen h-screen flex items-center justify-center
    bg-black bg-opacity-50 transform z-50 transition-transform duration-300 ${chatModal}`}
    >
      <div className="bg-[#0c0c10] text-[#BBBBBB] shadow-lg shadow-[#1B5CFE] rounded-xl w-11/12 md:w-2/5 h-7/12 p-6">
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center">
            <p className="font-semibold">Chat for Poll: {poll?.title || 'Unknown'}</p>
            <button onClick={closeModal} className="border-0 bg-transparent focus:outline-none">
              <FaTimes />
            </button>
          </div>

          <div
            id="messages-container"
            className="flex flex-col justify-center items-start rounded-xl my-5 pt-5 max-h-[20rem] overflow-y-auto"
          >
            <div className="py-4" />
            
            {isLoading && (
              <div className="flex justify-center items-center w-full py-4">
                <p className="text-gray-500">Loading messages...</p>
              </div>
            )}
            
            {error && (
              <div className="flex justify-center items-center w-full py-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}
            
            {!isLoading && !error && messages.length === 0 && (
              <div className="flex justify-center items-center w-full py-4">
                <p className="text-gray-500">No messages yet. Be the first to say hello!</p>
              </div>
            )}
            
            {messages.map((msg: any, i: number) => (
              <Message
                text={msg.text}
                owner={msg.sender.uid}
                time={Number(msg.sendAt + '000')}
                you={wallet === msg.sender.uid}
                key={i}
              />
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col justify-center items-start rounded-xl mt-5 mb-5"
          >
            <div className="py-4 w-full border border-[#212D4A] rounded-full flex items-center px-4 mb-3 mt-2">
              <input
                placeholder="Send message..."
                className="bg-transparent outline-none w-full placeholder-[#929292] text-sm"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const Message = ({ text, time, owner, you }) => {
  return (
    <div className="flex justify-start space-x-4 px-6 mb-4 w-full">
      <div className="flex justify-start items-center w-full">
        <Identicon
          className="w-12 h-12 rounded-full object-cover mr-4 shadow-md bg-gray-400"
          string={owner}
          size={30}
        />

        <div className="w-full">
          <h3 className="text-md font-bold">
            {you ? '@You' : truncate({ text: owner, startChars: 4, endChars: 4, maxLength: 11 })}
          </h3>
          <p className="text-gray-500 text-xs font-semibold space-x-2 w-4/5">{text}</p>
        </div>
      </div>
    </div>
  )
}

export default ChatModal
