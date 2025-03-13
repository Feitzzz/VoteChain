import { initCometChat, checkAuthState } from '@/services/chat'
import { useEffect } from 'react'
import { globalActions } from '@/store/globalSlices'
import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'

const CometChatNoSSR = () => {
  const { setCurrentUser } = globalActions
  const dispatch = useDispatch()

  useEffect(() => {
    const initChat = async () => {
      if (typeof window !== 'undefined') {
        try {
          await initCometChat()
          const user = await checkAuthState()
          if (user) {
            dispatch(setCurrentUser(JSON.parse(JSON.stringify(user))))
          }
        } catch (error) {
          console.error('CometChat initialization error:', error)
          toast.error('Failed to initialize chat. Please refresh the page.')
        }
      }
    }

    // Delay initialization to ensure all resources are loaded
    setTimeout(initChat, 1000)
  }, [dispatch, setCurrentUser])

  return null
}

export default CometChatNoSSR
