import React, { useEffect, useState, useRef, useCallback } from 'react'
import { FaUserPlus } from 'react-icons/fa'
import { RiArrowDropDownLine } from 'react-icons/ri'
import { FiLogIn } from 'react-icons/fi'
import { HiLogin, HiUserGroup, HiChat } from 'react-icons/hi'
import { SiGnuprivacyguard } from 'react-icons/si'
import { Menu } from '@headlessui/react'
import { toast } from 'react-toastify'
import {
  createNewGroup,
  joinGroup,
  logOutWithCometChat,
  loginWithCometChat,
  signUpWithCometChat,
  checkAuthState
} from '../services/chat'
import { useDispatch, useSelector } from 'react-redux'
import { globalActions } from '@/store/globalSlices'
import { PollStruct, RootState } from '@/utils/types'

const ChatButton: React.FC<{ poll: PollStruct; group: any }> = ({ poll, group }) => {
  const dispatch = useDispatch()
  const { setCurrentUser, setChatModal, setGroup } = globalActions
  const { wallet, currentUser } = useSelector((states: RootState) => states.globalStates)
  const [isCreator, setIsCreator] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [buttonMode, setButtonMode] = useState<'none' | 'create' | 'join' | 'chat'>('none')
  const stableGroup = useRef(group)
  const lastUpdatedRef = useRef(Date.now())
  const previousPollIdRef = useRef<number | null>(null)

  // Track poll changes to reset button state
  useEffect(() => {
    if (poll?.id && previousPollIdRef.current !== poll.id) {
      console.log('Poll changed in ChatButton component:', { 
        previous: previousPollIdRef.current, 
        current: poll.id,
        hasGroup: !!group
      });
      
      // Reset stable group when poll changes
      if (!group || (group && group.guid !== `guid_${poll.id}`)) {
        console.log('Resetting stable group reference due to poll change');
        stableGroup.current = null;
        
        // Critical fix: Clear the group in Redux store when poll changes
        // This ensures we don't see chats from previous elections
        if (group && group.guid !== `guid_${poll.id}`) {
          console.log('Group GUID mismatch, clearing group state:', {
            currentPollId: poll.id,
            groupGuid: group.guid
          });
          dispatch(setGroup(null));
        }
      }
      
      previousPollIdRef.current = poll.id;
      
      // Force button mode recalculation
      const newMode = calculateButtonMode(poll.id);
      setButtonMode(newMode);
    }
  }, [poll?.id, group, dispatch, setGroup]);

  // Debug logging to track state changes
  useEffect(() => {
    console.log('ChatButton state:', {
      buttonMode,
      currentUser: !!currentUser,
      group: group ? {
        guid: group.guid,
        hasJoined: group.hasJoined
      } : null,
      pollId: poll?.id,
      stableGroup: stableGroup.current ? {
        guid: stableGroup.current.guid,
        hasJoined: stableGroup.current.hasJoined
      } : null,
      isCreator
    });
  }, [buttonMode, currentUser, group, poll, isCreator]);

  // Stabilize group updates to prevent flickering
  useEffect(() => {
    // Only update if the group is for the current poll
    if (group && poll && group.guid === `guid_${poll.id}`) {
      console.log('Group updated for current poll:', { 
        pollId: poll.id, 
        groupGuid: group.guid, 
        hasJoined: group.hasJoined 
      });
      
      stableGroup.current = group;
      lastUpdatedRef.current = Date.now();
      
      // Force button mode recalculation when group changes
      const newMode = calculateButtonMode(poll.id);
      if (buttonMode !== newMode) {
        console.log('Button mode changing from', buttonMode, 'to', newMode);
        setButtonMode(newMode);
      }
    } else if (group && poll && group.guid !== `guid_${poll.id}`) {
      // Critical fix: If group is for a different poll, clear it
      console.log('Group GUID mismatch in effect, clearing group state:', {
        currentPollId: poll.id,
        groupGuid: group.guid
      });
      
      // Clear the group in Redux
      dispatch(setGroup(null));
      stableGroup.current = null;
      
      // Update button mode to reflect no group
      const newMode = calculateButtonMode(poll?.id);
      if (buttonMode !== newMode) {
        console.log('Button mode changing from', buttonMode, 'to', newMode, '(mismatched group removed)');
        setButtonMode(newMode);
      }
    } else if (!group && stableGroup.current) {
      // Clear group ref when group is removed
      stableGroup.current = null;
      
      // Update button mode when group is removed
      const newMode = calculateButtonMode(poll?.id);
      if (buttonMode !== newMode) {
        console.log('Button mode changing from', buttonMode, 'to', newMode, '(group removed)');
        setButtonMode(newMode);
      }
    }
  }, [group, poll, buttonMode, dispatch, setGroup]);
  
  // Check if current user is the poll creator whenever wallet or poll changes
  useEffect(() => {
    if (wallet && poll) {
      const creatorCheck = wallet.toLowerCase() === poll.director.toLowerCase()
      setIsCreator(creatorCheck)
    } else {
      setIsCreator(false)
    }
  }, [wallet, poll])

  // Direct calculation function for button mode - takes pollId to ensure we're working with the right poll
  const calculateButtonMode = (pollId?: number) => {
    if (!currentUser || !pollId) {
      return 'none';
    }
    
    const effectiveGroup = stableGroup.current || group;
    
    // Verify the group is for this specific poll
    if (effectiveGroup && typeof effectiveGroup.guid === 'string' && effectiveGroup.guid !== `guid_${pollId}`) {
      console.log('Group GUID mismatch in calculateButtonMode:', {
        expectedGuid: `guid_${pollId}`,
        actualGuid: effectiveGroup.guid
      });
      return isCreator ? 'create' : 'none';
    }
    
    // No group exists yet for this poll
    if (!effectiveGroup) {
      // Only poll creators can create groups
      return isCreator ? 'create' : 'none';
    }
    
    // Group exists for this poll - check if user has joined
    if (typeof effectiveGroup.hasJoined === 'boolean' && effectiveGroup.hasJoined === true) {
      return 'chat';
    } else {
      // Group exists but user hasn't joined
      return 'join';
    }
  };

  // Determine button mode only when necessary inputs change
  const determineButtonMode = useCallback(() => {
    return calculateButtonMode(poll?.id);
  }, [currentUser, isCreator, group, poll?.id]);

  // Update button mode when determining factors change
  useEffect(() => {
    const newMode = determineButtonMode();
    if (buttonMode !== newMode) {
      console.log('Button mode update from', buttonMode, 'to', newMode);
      setButtonMode(newMode);
    }
  }, [determineButtonMode, buttonMode]);

  // Double check authentication status for UI updates
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        if (currentUser) {
          // Verify that the CometChat auth is still valid
          const authUser = await checkAuthState().catch(() => null)
          if (!authUser) {
            console.log('CometChat session invalid, resetting state')
            dispatch(setCurrentUser(null))
          } else {
            // Force button mode recalculation after auth verification
            const newMode = calculateButtonMode(poll?.id);
            if (buttonMode !== newMode) {
              console.log('Button mode updating after auth check from', buttonMode, 'to', newMode);
              setButtonMode(newMode);
            }
          }
        }
      } catch (error) {
        console.error('Auth verification error:', error)
      }
    }
    verifyAuth()
  }, [currentUser, dispatch, setCurrentUser, poll?.id]);
  
  // Reset button mode when user logs out
  useEffect(() => {
    if (!currentUser && buttonMode !== 'none') {
      setButtonMode('none');
    }
  }, [currentUser, buttonMode]);

  const handleSignUp = async () => {
    if (wallet === '') return toast.warning('Connect wallet first!')
    if (isAuthenticating) return
    
    setIsAuthenticating(true)
    
    await toast.promise(
      new Promise((resolve, reject) => {
        signUpWithCometChat(wallet)
          .then((user) => resolve(user))
          .catch((error) => {
            console.error('Signup error:', error)
            reject(error)
          })
          .finally(() => setIsAuthenticating(false))
      }),
      {
        pending: 'Signing up...',
        success: 'Signed up successfully, please login 👌',
        error: 'Signup failed. You may already have an account. Try logging in. 🤯',
      }
    )
  }

  const handleLogin = async () => {
    if (wallet === '') return toast.warning('Connect wallet first!')
    if (isAuthenticating) return
    
    setIsAuthenticating(true)
    
    await toast.promise(
      new Promise(async (resolve, reject) => {
        try {
          // Try to login first
          try {
            const user = await loginWithCometChat(wallet)
            dispatch(setCurrentUser(JSON.parse(JSON.stringify(user))))
            resolve(user)
          } catch (error) {
            // If the error is that the user doesn't exist, try to create the user first
            const errorObj = error as any; // Type assertion for error object
            if (
              errorObj?.message?.includes('UID_NOT_FOUND') || 
              errorObj?.code === 'ERR_UID_NOT_FOUND'
            ) {
              console.log('User not found, creating new user...')
              // Create the user
              await signUpWithCometChat(wallet)
              
              // Then try to login again
              const user = await loginWithCometChat(wallet)
              dispatch(setCurrentUser(JSON.parse(JSON.stringify(user))))
              resolve(user)
            } else {
              // For other errors, reject
              console.error('Login error:', error)
              reject(error)
            }
          }
        } catch (error) {
          console.error('Login/Signup process failed:', error)
          reject(error)
        } finally {
          setIsAuthenticating(false)
        }
      }),
      {
        pending: 'Logging in...',
        success: 'Logged in successfully 👌',
        error: 'Login failed. Please try again. 🤯',
      }
    )
  }

  const handleLogout = async () => {
    if (wallet === '') return toast.warning('Connect wallet first!')
    if (isAuthenticating) return
    
    setIsAuthenticating(true)
    
    await toast.promise(
      new Promise((resolve, reject) => {
        logOutWithCometChat()
          .then(() => {
            dispatch(setCurrentUser(null))
            dispatch(setGroup(null)) // Clear group data on logout
            resolve(null)
          })
          .catch((error) => {
            console.error('Logout error:', error)
            reject(error)
          })
          .finally(() => setIsAuthenticating(false))
      }),
      {
        pending: 'Logging out...',
        success: 'Logged out successfully 👌',
        error: 'Logout failed. Please try again. 🤯',
      }
    )
  }

  const handleCreateGroup = async () => {
    if (wallet === '') return toast.warning('Connect wallet first!')
    if (!currentUser) return toast.warning('Please login to chat first!')
    if (isAuthenticating) return
    if (!poll?.id) return toast.warning('Poll information is missing')
    
    setIsAuthenticating(true)
    // Set button mode immediately to prevent flickering
    setButtonMode('chat');

    // Double check authentication
    try {
      const authUser = await checkAuthState().catch(() => null)
      if (!authUser) {
        toast.error('Authentication session expired. Please login again.')
        dispatch(setCurrentUser(null))
        setIsAuthenticating(false)
        setButtonMode(determineButtonMode());
        return
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      toast.error('Authentication error. Please try again.')
      setIsAuthenticating(false)
      setButtonMode(determineButtonMode());
      return
    }

    await toast.promise(
      new Promise((resolve, reject) => {
        // Store current poll ID to ensure we're creating a group for the right poll
        const currentPollId = poll.id;
        
        createNewGroup(`guid_${currentPollId}`, poll.title)
          .then((group) => {
            if (group) {
              console.log('Group created successfully for poll ID:', currentPollId);
              
              // Verify the group is for this poll - safe access with type checking
              if (typeof group === 'object' && 'guid' in group && group.guid !== `guid_${currentPollId}`) {
                console.error('Created group has incorrect GUID:', {
                  expected: `guid_${currentPollId}`,
                  actual: group.guid
                });
                reject(new Error('Group creation error: GUID mismatch'));
                return;
              }
              
              // Update the stable group ref directly to prevent needless re-renders
              stableGroup.current = group;
              lastUpdatedRef.current = Date.now();
              dispatch(setGroup(JSON.parse(JSON.stringify(group))))
            }
            resolve(group)
          })
          .catch((error) => {
            console.error('Create group error:', error)
            // If group already exists, don't treat as error
            const errorObj = error as any; // Type assertion for error object
            if (errorObj?.code === 'ERR_GROUP_ALREADY_EXISTS') {
              toast.info('Group already exists. Joining group...')
              handleJoinGroup()
              resolve(null)
            } else {
              // Reset button mode on error
              setButtonMode(determineButtonMode());
              reject(error)
            }
          })
          .finally(() => setIsAuthenticating(false))
      }),
      {
        pending: 'Creating group...',
        success: 'Group created successfully 👌',
        error: 'Failed to create group. Please try again. 🤯',
      }
    )
  }

  const handleJoinGroup = async () => {
    if (wallet === '') return toast.warning('Connect wallet first!')
    if (!currentUser) return toast.warning('Please login to chat first!')
    if (isAuthenticating) return
    if (!poll?.id) return toast.warning('Poll information is missing')
    
    setIsAuthenticating(true)
    // Set button mode immediately to prevent flickering
    setButtonMode('chat');
    
    // Double check authentication
    try {
      const authUser = await checkAuthState().catch(() => null)
      if (!authUser) {
        toast.error('Authentication session expired. Please login again.')
        dispatch(setCurrentUser(null))
        setIsAuthenticating(false)
        setButtonMode(determineButtonMode());
        return
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      toast.error('Authentication error. Please try again.')
      setIsAuthenticating(false)
      setButtonMode(determineButtonMode());
      return
    }

    await toast.promise(
      new Promise((resolve, reject) => {
        // Store current poll ID to ensure we're joining a group for the right poll
        const currentPollId = poll.id;
        
        joinGroup(`guid_${currentPollId}`)
          .then((group) => {
            if (group) {
              console.log('Group joined successfully for poll ID:', currentPollId);
              
              // Verify the group is for this poll - safe access with type checking
              if (typeof group === 'object' && 'guid' in group && group.guid !== `guid_${currentPollId}`) {
                console.error('Joined group has incorrect GUID:', {
                  expected: `guid_${currentPollId}`,
                  actual: group.guid
                });
                reject(new Error('Group join error: GUID mismatch'));
                return;
              }
              
              // Update the stable group ref directly to prevent needless re-renders
              stableGroup.current = group;
              lastUpdatedRef.current = Date.now();
              dispatch(setGroup(JSON.parse(JSON.stringify(group))))
            }
            resolve(group)
          })
          .catch((error) => {
            console.error('Join group error:', error)
            // Reset button mode on error
            setButtonMode(determineButtonMode());
            reject(error)
          })
          .finally(() => setIsAuthenticating(false))
      }),
      {
        pending: 'Joining group...',
        success: 'Group joined successfully 👌',
        error: 'Failed to join group. Please try again. 🤯',
      }
    )
  }

  // Debug info about current state
  console.log('Button rendering with mode:', buttonMode);

  return (
    <Menu as="div" className="inline-block text-left mx-auto fixed right-5 bottom-[80px]">
      <Menu.Button
        className="bg-[#1B5CFE] hover:bg-blue-700 text-white font-bold
        rounded-full transition-all duration-300 p-3 focus:outline-none
          focus-visible:ring-2 focus-visible:ring-white
          focus-visible:ring-opacity-75 shadow-md shadow-black"
        as="button"
      >
        <RiArrowDropDownLine size={20} />
      </Menu.Button>
      <Menu.Items
        className="absolute right-0 bottom-14 mt-2 w-56 origin-top-right
          divide-y divide-gray-100 rounded-md bg-white shadow-lg shadow-black
          ing-1 ring-black ring-opacity-5 focus:outline-none"
      >
        {!currentUser ? (
          <>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`flex justify-start items-center space-x-1 ${
                    active ? 'bg-gray-200 text-black' : 'text-red-500'
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  onClick={handleSignUp}
                  disabled={isAuthenticating}
                >
                  <SiGnuprivacyguard size={17} />
                  <span>{isAuthenticating ? 'Please wait...' : 'SignUp'}</span>
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`flex justify-start items-center space-x-1 ${
                    active ? 'bg-gray-200 text-black' : 'text-gray-900'
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  onClick={handleLogin}
                  disabled={isAuthenticating}
                >
                  <FiLogIn size={17} />
                  <span>{isAuthenticating ? 'Please wait...' : 'Login'}</span>
                </button>
              )}
            </Menu.Item>
          </>
        ) : (
          <>
            {/* Show create group button for poll creator if no group exists yet */}
            {buttonMode === 'create' && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`flex justify-start items-center space-x-1 ${
                      active ? 'bg-gray-200 text-black' : 'text-gray-900'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                    onClick={handleCreateGroup}
                    disabled={isAuthenticating}
                  >
                    <HiUserGroup size={17} />
                    <span>{isAuthenticating ? 'Processing...' : 'Create Group'}</span>
                  </button>
                )}
              </Menu.Item>
            )}

            {buttonMode === 'join' && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`flex justify-start items-center space-x-1 ${
                      active ? 'bg-gray-200 text-black' : 'text-gray-900'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                    onClick={handleJoinGroup}
                    disabled={isAuthenticating}
                  >
                    <FaUserPlus size={17} />
                    <span>{isAuthenticating ? 'Processing...' : 'Join Group'}</span>
                  </button>
                )}
              </Menu.Item>
            )}
            
            {buttonMode === 'chat' && poll?.id && group?.guid === `guid_${poll.id}` && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`flex justify-start items-center space-x-1 ${
                      active ? 'bg-gray-200 text-black' : 'text-gray-900'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                    onClick={() => dispatch(setChatModal('scale-100'))}
                  >
                    <HiChat size={17} />
                    <span>Chat</span>
                  </button>
                )}
              </Menu.Item>
            )}

            <Menu.Item>
              {({ active }) => (
                <button
                  className={`flex justify-start items-center space-x-1 ${
                    active ? 'bg-gray-200 text-black' : 'text-red-500'
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  onClick={handleLogout}
                  disabled={isAuthenticating}
                >
                  <HiLogin size={17} />
                  <span>{isAuthenticating ? 'Processing...' : 'Logout'}</span>
                </button>
              )}
            </Menu.Item>
          </>
        )}
      </Menu.Items>
    </Menu>
  )
}

export default ChatButton

