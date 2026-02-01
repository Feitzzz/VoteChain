let CometChat: any
let isCometChatReady = false

if (typeof window !== 'undefined') {
  import('@cometchat-pro/chat')
    .then((cometChatModule) => {
      CometChat = cometChatModule.CometChat
      isCometChatReady = true
      console.log('CometChat Loaded...')
    })
    .catch((error) => {
      console.error('Error loading CometChat:', error)
    })
}

const CONSTANTS = {
  APP_ID: process.env.NEXT_PUBLIC_COMET_CHAT_APP_ID,
  REGION: process.env.NEXT_PUBLIC_COMET_CHAT_REGION,
  Auth_Key: process.env.NEXT_PUBLIC_COMET_CHAT_AUTH_KEY,
}

const waitForCometChat = () => {
  return new Promise((resolve) => {
    const checkReady = () => {
      if (isCometChatReady) {
        resolve(true)
      } else {
        setTimeout(checkReady, 100)
      }
    }
    checkReady()
  })
}

const initCometChat = async () => {
  await waitForCometChat()
  
  const appID = CONSTANTS.APP_ID
  const region = CONSTANTS.REGION

  if (!appID || !region) {
    console.error('CometChat configuration missing')
    return
  }

  const appSetting = new CometChat.AppSettingsBuilder()
    .subscribePresenceForAllUsers()
    .setRegion(region)
    .autoEstablishSocketConnection(true)
    .build()

  try {
    await CometChat.init(appID, appSetting)
    console.log('CometChat initialization completed successfully')
  } catch (error) {
    console.error('CometChat initialization failed:', error)
    throw error
  }
}

const loginWithCometChat = async (UID: string) => {
  const authKey = CONSTANTS.Auth_Key

  return new Promise((resolve, reject) => {
    CometChat.login(UID, authKey)
      .then((user: any) => resolve(user))
      .catch((error: any) => reject(error))
  })
}

const signUpWithCometChat = async (UID: string) => {
  await waitForCometChat()
  
  const authKey = CONSTANTS.Auth_Key
  if (!authKey) {
    throw new Error('CometChat Auth Key missing')
  }

  const user = new CometChat.User(UID)
  user.setName(UID)
  
  return new Promise((resolve, reject) => {
    CometChat.createUser(user, authKey)
      .then((user: any) => resolve(user))
      .catch((error: any) => {
        console.error('CometChat signup failed:', error)
        reject(error)
      })
  })
}

const logOutWithCometChat = async () => {
  return new Promise((resolve, reject) => {
    CometChat.logout()
      .then(() => resolve(null))
      .catch((error: any) => reject(error))
  })
}

const checkAuthState = async () => {
  return new Promise((resolve, reject) => {
    CometChat.getLoggedinUser()
      .then((user: any) => resolve(user))
      .catch((error: any) => reject(error))
  })
}

const createNewGroup = async (GUID: string, groupName: string) => {
  if (!GUID || !groupName) {
    console.error('GUID or group name is missing');
    return Promise.resolve(null);
  }
  
  console.log('Creating new group with GUID:', GUID, 'and name:', groupName);
  
  const groupType = CometChat.GROUP_TYPE.PUBLIC
  const password = ''
  const group = new CometChat.Group(GUID, groupName, groupType, password)

  return new Promise(async (resolve, reject) => {
    try {
      // Check if user is logged in first
      const user = await CometChat.getLoggedinUser();
      if (!user) {
        console.log('User not logged in, cannot create group');
        return resolve(null);
      }
      
      // First check if the group already exists
      try {
        const existingGroup = await getGroup(GUID);
        if (existingGroup) {
          console.log('Group already exists, joining it instead');
          // If group exists but we're not a member, join it
          if (existingGroup && typeof existingGroup === 'object' && (existingGroup as any).hasJoined === false) {
            const joinedGroup = await joinGroup(GUID);
            return resolve(joinedGroup);
          } else {
            // If already a member, just return the existing group
            return resolve(existingGroup);
          }
        }
      } catch (error) {
        // Group doesn't exist, proceed with creation
        console.log('Group does not exist, creating new group');
      }
      
      // Create the group
    CometChat.createGroup(group)
        .then((newGroup: any) => {
          console.log('Group created successfully:', newGroup);
          // Group creator is automatically a member, set hasJoined flag
          if (newGroup) {
            newGroup.hasJoined = true;
            
            // Add metadata to store poll ID for better validation
            if (!newGroup.metadata) {
              newGroup.metadata = {};
            }
            
            try {
              // Extract poll ID from GUID (guid_12345 -> 12345)
              const pollId = GUID.split('_')[1];
              newGroup.metadata.pollId = pollId;
              console.log(`Added metadata pollId=${pollId} to group`);
            } catch (err) {
              console.warn('Failed to extract poll ID from GUID:', err);
            }
          }
          resolve(newGroup);
        })
        .catch((error: any) => {
          console.error('Create group error:', error);
          
          // If group already exists, try to join it
          if (error?.code === 'ERR_GROUP_ALREADY_EXISTS') {
            console.log('Group already exists (from API), trying to join');
            return joinGroup(GUID)
              .then(resolve)
              .catch((joinError) => {
                console.error('Failed to join existing group:', joinError);
                reject(joinError);
              });
          }
          
          reject(error);
        });
    } catch (error) {
      console.error('Authentication check failed:', error);
      resolve(null);
    }
  });
}

const getGroup = async (GUID: string) => {
  if (!GUID) {
    console.log('No GUID provided to getGroup');
    return Promise.resolve(null);
  }
  
  console.log('Getting group with GUID:', GUID);
  
  return new Promise(async (resolve, reject) => {
    try {
      // Check if user is logged in first
      const user = await CometChat.getLoggedinUser();
      if (!user) {
        console.log('User not logged in, cannot get group');
        // Return null instead of rejecting
        return resolve(null);
      }
      
    CometChat.getGroup(GUID)
      .then((group: any) => {
        // Add validation: verify the group GUID matches expected format
        if (group && GUID.startsWith('guid_')) {
          // If we have metadata, great! Otherwise try to extract from GUID
          if (!group.metadata) {
            group.metadata = {};
            
            try {
              // Extract poll ID from GUID (guid_12345 -> 12345)
              const pollId = GUID.split('_')[1];
              group.metadata.pollId = pollId;
              console.log(`Added missing metadata pollId=${pollId} to group`);
            } catch (err) {
              console.warn('Failed to extract poll ID from GUID:', err);
            }
          }
        }
        resolve(group);
      })
        .catch((error: any) => {
          console.error('Error getting group:', error);
          
          // For not found or unauthorized, just return null instead of rejecting
          if (error?.code === 'ERR_GROUP_NOT_FOUND' || 
              error?.code === 'UNAUTHORIZED' ||
              error?.code === 'ERR_GROUP_NOT_JOINED') {
            return resolve(null);
          }
          
          reject(error);
        });
    } catch (error) {
      console.error('Authentication check failed:', error);
      // Return null instead of rejecting
      resolve(null);
    }
  });
}

const joinGroup = async (GUID: string) => {
  if (!GUID) {
    return Promise.resolve(null);
  }
  
  const groupType = CometChat.GROUP_TYPE.PUBLIC;
  const password = '';

  return new Promise(async (resolve, reject) => {
    try {
      // Check if user is logged in first
      const user = await CometChat.getLoggedinUser();
      if (!user) {
        console.log('User not logged in, cannot join group');
        // Return null instead of rejecting
        return resolve(null);
      }
      
    CometChat.joinGroup(GUID, groupType, password)
      .then((group: any) => resolve(group))
        .catch((error: any) => {
          console.error('Error joining group:', error);
          
          // If already a member, try to get the group instead
          if (error?.code === 'ERR_ALREADY_JOINED') {
            console.log('User already a member of group, getting group info instead');
            return getGroup(GUID).then(resolve).catch(reject);
          }
          
          reject(error);
        });
    } catch (error) {
      console.error('Authentication check failed:', error);
      // Return null instead of rejecting
      resolve(null);
    }
  });
}

const getMessages = async (GUID: string) => {
  if (!GUID) {
    return Promise.resolve([]);
  }
  
  const limit = 30;
  
  return new Promise(async (resolve, reject) => {
    try {
      // Check if user is logged in first
      const user = await CometChat.getLoggedinUser().catch(() => null);
      
      if (!user) {
        console.log('User not logged in, cannot get messages');
        // Return specific error for not logged in
        return reject({
          code: 'USER_NOT_LOGGED_IN',
          message: 'User is not logged in. Please log in first.'
        });
      }
      
      // Check if the user is a member of the group first
      try {
        const group = await CometChat.getGroup(GUID).catch((error) => {
          console.error('Error getting group when checking messages:', error);
          return null;
        });
        
        if (group && group.hasJoined === false) {
          console.log('User has not joined the group, returning join error');
          return reject({
            code: 'ERR_GROUP_NOT_JOINED',
            message: `The user with UID ${user.uid} is not a member of the group with GUID ${GUID}. Please join the group to access it.`
          });
        }
      } catch (error) {
        console.log('Error checking group membership:', error);
        // Continue to try fetching messages anyway
      }
      
  const messagesRequest = new CometChat.MessagesRequestBuilder()
    .setGUID(GUID)
    .setLimit(limit)
        .build();

    messagesRequest
      .fetchPrevious()
      .then((messages: any[]) => resolve(messages.filter((msg) => msg.type === 'text')))
        .catch((error: any) => {
          console.error('Error getting messages:', error);
          
          // If the error is because the group is not joined, return empty array
          if (error?.code === 'ERR_GROUP_NOT_JOINED') {
            return reject({
              code: 'ERR_GROUP_NOT_JOINED',
              message: `The user is not a member of the group with GUID ${GUID}. Please join the group to access it.`
            });
          }
          
          reject(error);
        });
    } catch (error) {
      console.error('Authentication check failed:', error);
      // Return empty array instead of rejecting
      resolve([]);
    }
  });
}

const sendMessage = async (receiverID: string, messageText: string) => {
  const receiverType = CometChat.RECEIVER_TYPE.GROUP
  const textMessage = new CometChat.TextMessage(receiverID, messageText, receiverType)
  return new Promise((resolve, reject) => {
    CometChat.sendMessage(textMessage)
      .then((message: any) => resolve(message))
      .catch((error: any) => reject(error))
  })
}

const listenForMessage = async (listenerID: string) => {
  return new Promise((resolve) => {
    CometChat.addMessageListener(
      listenerID,
      new CometChat.MessageListener({
        onTextMessageReceived: (message: any) => resolve(message),
      })
    )
  })
}

const cleanupChatState = () => {
  console.log('Cleaning up chat state');
  // Currently we don't need to do anything specific with CometChat
  // This is a placeholder for future cleanup logic if needed
  return true;
}

export {
  checkAuthState,
  cleanupChatState,
  createNewGroup,
  getGroup,
  getMessages,
  initCometChat,
  joinGroup,
  listenForMessage,
  loginWithCometChat,
  logOutWithCometChat,
  sendMessage,
  signUpWithCometChat,
}
